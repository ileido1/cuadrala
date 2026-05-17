import 'package:flutter/material.dart';

import '../../../../core/di/service_locator.dart';
import '../../../../core/failures/app_failure.dart';
import '../../../../core/formatting/money_format.dart';
import '../../../../core/models/currency_code.dart';
import '../../data/models/booking_item.dart';
import '../../data/models/reservation_payment_summary_dto.dart';
import '../../data/models/venue_payment_method_dto.dart';
import '../../data/reservation_payment_repository.dart';

enum _PaymentStep { summary, method, confirm }

/// Flujo staff: registrar pago manual de reserva (MCP).
final class BookingPaymentSheet extends StatefulWidget {
  const BookingPaymentSheet({
    super.key,
    required this.booking,
    required this.venueId,
    required this.venueName,
    this.onPaymentConfirmed,
  });

  final BookingItem booking;
  final String venueId;
  final String venueName;
  final VoidCallback? onPaymentConfirmed;

  @override
  State<BookingPaymentSheet> createState() => _BookingPaymentSheetState();
}

final class _BookingPaymentSheetState extends State<BookingPaymentSheet> {
  final _repo = getIt<ReservationPaymentRepository>();
  final _amountController = TextEditingController();
  final _referenceController = TextEditingController();

  _PaymentStep _step = _PaymentStep.summary;
  bool _loading = true;
  bool _submitting = false;
  String? _error;
  ReservationPaymentSummaryDto? _summary;
  List<VenuePaymentMethodDto> _methods = [];
  VenuePaymentMethodDto? _selectedMethod;

  CurrencyCode get _currency => widget.booking.currencyCode;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _repo.getPaymentSummary(reservationId: widget.booking.id),
        _repo.listPaymentMethods(venueId: widget.venueId),
      ]);
      final summary = results[0] as ReservationPaymentSummaryDto;
      final methods = results[1] as List<VenuePaymentMethodDto>;
      if (!mounted) return;
      setState(() {
        _summary = summary;
        _methods = methods;
        _loading = false;
        if (summary.pendingAmountCents > 0) {
          final major = summary.pendingAmountCents / 100;
          _amountController.text = major.toStringAsFixed(2).replaceAll('.', ',');
        }
        if (methods.length == 1) {
          _selectedMethod = methods.first;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is AppFailure ? e.message : 'No se pudo cargar el resumen de pago.';
      });
    }
  }

  int? get _amountMinor => parseMoneyInputToMinor(_amountController.text);

  int get _maxPayableMinor =>
      _summary?.pendingAmountCents ?? widget.booking.totalAmountCents ?? 0;

  void _goNext() {
    if (_step == _PaymentStep.summary) {
      if (_amountMinor == null) {
        setState(() => _error = 'Ingresa un monto válido mayor a cero.');
        return;
      }
      if (_amountMinor! > _maxPayableMinor) {
        setState(() => _error =
            'El monto no puede superar ${formatMoneyFromMinor(_maxPayableMinor, _currency)}.');
        return;
      }
      if (_methods.isEmpty) {
        setState(() => _error = 'No hay medios de pago activos en la sede.');
        return;
      }
      setState(() {
        _error = null;
        _step = _PaymentStep.method;
      });
      return;
    }

    if (_step == _PaymentStep.method) {
      if (_selectedMethod == null) {
        setState(() => _error = 'Selecciona un medio de pago.');
        return;
      }
      setState(() {
        _error = null;
        _step = _PaymentStep.confirm;
      });
    }
  }

  void _goBack() {
    setState(() {
      _error = null;
      if (_step == _PaymentStep.method) {
        _step = _PaymentStep.summary;
      } else if (_step == _PaymentStep.confirm) {
        _step = _PaymentStep.method;
      }
    });
  }

  Future<void> _submit() async {
    final method = _selectedMethod;
    final amountMinor = _amountMinor;
    if (method == null || amountMinor == null) return;

    final payerId = widget.booking.obligationUserId;
    if (payerId == null) {
      setState(() => _error = 'No se pudo determinar el usuario asociado al pago.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final txId = await _repo.resolveOrCreatePendingTransactionId(
        reservationId: widget.booking.id,
        amountBaseMajor: amountMinor / 100,
        payerUserId: payerId,
      );

      final settlementCurrency = CurrencyCode.resolve(
        pricingCurrency: method.settlementCurrency,
        displayCurrency: widget.booking.pricingCurrency,
      );

      await _repo.confirmManualPayment(
        transactionId: txId,
        venuePaymentMethodId: method.id,
        settlementAmountMinor: amountMinor,
        settlementCurrencyCode: settlementCurrency.apiValue,
        referenceNumber: _referenceController.text.trim(),
      );

      if (!mounted) return;
      widget.onPaymentConfirmed?.call();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pago confirmado correctamente')),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = e is AppFailure ? e.message : 'No se pudo confirmar el pago.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Registrar pago',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                '${widget.booking.courtName} · ${widget.venueName}',
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 16),
              if (_loading)
                const Center(child: CircularProgressIndicator())
              else ...[
                if (_error != null) ...[
                  SelectableText.rich(
                    TextSpan(
                      text: _error,
                      style: TextStyle(color: scheme.error),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                _buildStepContent(context),
                const SizedBox(height: 16),
                Row(
                  children: [
                    if (_step != _PaymentStep.summary)
                      TextButton(
                        onPressed: _submitting ? null : _goBack,
                        child: const Text('Atrás'),
                      ),
                    const Spacer(),
                    if (_step != _PaymentStep.confirm)
                      FilledButton(
                        onPressed: _submitting ? null : _goNext,
                        child: const Text('Siguiente'),
                      )
                    else
                      FilledButton(
                        onPressed: _submitting ? null : _submit,
                        child: _submitting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Confirmar pago'),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepContent(BuildContext context) {
    switch (_step) {
      case _PaymentStep.summary:
        return _buildSummaryStep(context);
      case _PaymentStep.method:
        return _buildMethodStep(context);
      case _PaymentStep.confirm:
        return _buildConfirmStep(context);
    }
  }

  Widget _buildSummaryStep(BuildContext context) {
    final summary = _summary;
    final total = summary?.totalAmountCents ?? widget.booking.totalAmountCents;
    final paid = summary?.paidAmountCents ?? widget.booking.paidAmountCents;
    final pending = summary?.pendingAmountCents ??
        ((total ?? 0) - paid).clamp(0, total ?? 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (total != null) ...[
          Text('Total: ${formatMoneyFromMinor(total, _currency)}'),
          Text('Pagado: ${formatMoneyFromMinor(paid, _currency)}'),
          Text('Pendiente: ${formatMoneyFromMinor(pending, _currency)}'),
          const SizedBox(height: 12),
        ],
        TextField(
          controller: _amountController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: 'Monto a registrar (${_currency.symbol})',
            border: const OutlineInputBorder(),
          ),
        ),
      ],
    );
  }

  Widget _buildMethodStep(BuildContext context) {
    return Column(
      children: _methods.map((method) {
        final selected = _selectedMethod?.id == method.id;
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            selected: selected,
            title: Text(method.name),
            subtitle: Text(method.type),
            trailing: selected ? const Icon(Icons.check_circle) : null,
            onTap: () => setState(() => _selectedMethod = method),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildConfirmStep(BuildContext context) {
    final amountMinor = _amountMinor;
    final method = _selectedMethod;
    if (amountMinor == null || method == null) {
      return const SizedBox.shrink();
    }

    final settlement = CurrencyCode.resolve(
      pricingCurrency: method.settlementCurrency,
      displayCurrency: widget.booking.pricingCurrency,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Monto: ${formatMoneyFromMinor(amountMinor, settlement)}',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        Text('Medio: ${method.name}'),
        const SizedBox(height: 12),
        TextField(
          controller: _referenceController,
          decoration: const InputDecoration(
            labelText: 'Referencia (opcional)',
            border: OutlineInputBorder(),
          ),
        ),
      ],
    );
  }
}
