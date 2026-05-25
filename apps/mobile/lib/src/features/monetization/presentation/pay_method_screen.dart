import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// ignore_for_file: deprecated_member_use

import '../../../core/di/service_locator.dart';
import '../../../core/failures/app_failure.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../profile/data/profile_repository.dart';
import '../../venues/data/venues_repository.dart';
import '../data/monetization_repository.dart';
import '../data/models/match_payment_info_dto.dart';
import '../data/models/transaction_dto.dart';
import '../data/models/venue_payment_method_dto.dart';
import 'upload_receipt_screen.dart';

final class PayMethodScreen extends StatefulWidget {
  const PayMethodScreen({
    super.key,
    required this.matchId,
    required this.amountPerPersonCents,
    required this.matchTitle,
    this.venueId,
    this.pricingCurrency,
  });

  final String matchId;
  final int amountPerPersonCents;
  final String matchTitle;
  final String? venueId;
  final String? pricingCurrency;

  static String route({
    required String matchId,
    required int amountPerPersonCents,
    required String matchTitle,
    String? venueId,
    String? pricingCurrency,
  }) {
    final qp = <String, String>{
      'amountCents': amountPerPersonCents.toString(),
      'title': matchTitle,
      if (venueId != null && venueId.isNotEmpty) 'venueId': venueId,
      if (pricingCurrency != null) 'currency': pricingCurrency,
    };
    final query = Uri(queryParameters: qp).query;
    return '/matches/$matchId/pay/method?$query';
  }

  @override
  State<PayMethodScreen> createState() => _PayMethodScreenState();
}

class _PayMethodScreenState extends State<PayMethodScreen> {
  bool _loading = true;
  bool _submitting = false;
  String? _error;
  String? _transactionId;
  String? _selectedMethodId;
  List<VenuePaymentMethodDto> _methods = const [];
  MatchPaymentInfoDto? _legacyPaymentInfo;
  String? _resolvedPricingCurrency;

  CurrencyCode get _currency => CurrencyCode.resolve(
        pricingCurrency: _resolvedPricingCurrency ?? widget.pricingCurrency,
      );

  VenuePaymentMethodDto? get _selectedMethod {
    if (_selectedMethodId == null) return null;
    for (final m in _methods) {
      if (m.id == _selectedMethodId) return m;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = getIt<MonetizationRepository>();
      final venueId = widget.venueId;

      var pricingCurrency = widget.pricingCurrency;
      if ((pricingCurrency == null || pricingCurrency.isEmpty) &&
          venueId != null &&
          venueId.isNotEmpty) {
        try {
          final venue =
              await getIt<VenuesRepository>().getVenueDetail(venueId: venueId);
          pricingCurrency = venue.pricingCurrency ?? venue.displayCurrency;
        } catch (_) {}
      }

      List<VenuePaymentMethodDto> methods = const [];
      if (venueId != null && venueId.isNotEmpty) {
        try {
          methods = await repo.listVenuePaymentMethods(venueId: venueId);
        } catch (_) {
          methods = const [];
        }
      }

      MatchPaymentInfoDto? legacyInfo;
      if (methods.isEmpty) {
        try {
          legacyInfo = await repo.getMatchPaymentInfo(matchId: widget.matchId);
        } catch (_) {
          legacyInfo = null;
        }
      }

      final me = await getIt<ProfileRepository>().getMe();
      final txs = await repo.listMyTransactions(limit: 100);
      final existing = txs.transactions
          .where((t) => t.matchId == widget.matchId)
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

      TransactionDto? pendingTx;
      for (final t in existing) {
        if (t.status == 'PENDING') {
          pendingTx = t;
          break;
        }
      }

      if (pendingTx != null) {
        if (!mounted) return;
        setState(() {
          _transactionId = pendingTx!.id;
          _methods = methods;
          _legacyPaymentInfo = legacyInfo;
          _resolvedPricingCurrency = pricingCurrency;
          _selectedMethodId = methods.isNotEmpty ? methods.first.id : 'TRANSFER';
          _loading = false;
        });
        return;
      }

      final amount = widget.amountPerPersonCents / 100.0;
      final created = await repo.createMatchObligations(
        matchId: widget.matchId,
        amountBasePerPerson: amount,
        participantUserIds: [me.id],
      );
      final createdList = created['created'];
      if (createdList is List && createdList.isNotEmpty) {
        final first = createdList.first;
        if (first is Map<String, Object?> && first['id'] is String) {
          if (!mounted) return;
          setState(() {
            _transactionId = first['id'] as String;
            _methods = methods;
            _legacyPaymentInfo = legacyInfo;
            _resolvedPricingCurrency = pricingCurrency;
            _selectedMethodId = methods.isNotEmpty ? methods.first.id : 'TRANSFER';
            _loading = false;
          });
          return;
        }
      }

      throw Exception('No se pudo crear la obligación.');
    } catch (e) {
      if (!mounted) return;
      final msg = e is AppFailure ? e.message : e.toString();
      setState(() {
        _error = msg.isNotEmpty ? msg : 'No se pudo preparar el pago.';
        _loading = false;
      });
    }
  }

  String get _methodRouteValue {
    final selected = _selectedMethod;
    if (selected != null) return selected.type;
    return 'TRANSFER';
  }

  static final RegExp _uuidRe = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    caseSensitive: false,
  );

  Future<void> _continue() async {
    final txId = _transactionId;
    if (txId == null || txId.isEmpty) return;
    setState(() => _submitting = true);
    try {
      final repo = getIt<MonetizationRepository>();
      final methodId = _selectedMethodId;
      if (methodId != null && _uuidRe.hasMatch(methodId)) {
        await repo.recordPlayerPaymentSelection(
          transactionId: txId,
          venuePaymentMethodId: methodId,
        );
      } else if (methodId != null && methodId.isNotEmpty) {
        await repo.recordPlayerPaymentSelection(
          transactionId: txId,
          paymentMethodType: methodId,
        );
      }
      if (!mounted) return;
      context.push(
        UploadReceiptScreen.route(
          matchId: widget.matchId,
          transactionId: txId,
          method: _methodRouteValue,
          amountPerPersonCents: widget.amountPerPersonCents,
          matchTitle: widget.matchTitle,
          pricingCurrency: _resolvedPricingCurrency ?? widget.pricingCurrency,
          venueId: widget.venueId,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      key: const Key('pay.method.screen'),
      appBar: AppBar(title: const Text('Elegir método de pago')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _bootstrap,
                          child: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _MatchHeaderCard(
                      title: widget.matchTitle,
                      amount: formatMoneyCents(
                        widget.amountPerPersonCents,
                        _currency,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Selecciona una opción',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 10),
                    if (_methods.isNotEmpty)
                      ..._methods.map(
                        (m) => Card(
                          child: RadioListTile<String>(
                            value: m.id,
                            groupValue: _selectedMethodId,
                            onChanged: (v) =>
                                setState(() => _selectedMethodId = v),
                            title: Text(m.displayLabel),
                            subtitle: Text(
                              '${m.name} · ${m.settlementCurrency}',
                            ),
                          ),
                        ),
                      )
                    else ...[
                      Card(
                        child: RadioListTile<String>(
                          value: 'TRANSFER',
                          groupValue: _selectedMethodId,
                          onChanged: (v) =>
                              setState(() => _selectedMethodId = v ?? 'TRANSFER'),
                          title: const Text('Transferencia bancaria'),
                          subtitle: const Text('Recomendado'),
                        ),
                      ),
                      Card(
                        child: RadioListTile<String>(
                          value: 'CASH',
                          groupValue: _selectedMethodId,
                          onChanged: (v) =>
                              setState(() => _selectedMethodId = v ?? 'CASH'),
                          title: const Text('Efectivo'),
                          subtitle: const Text('Coordina con el organizador'),
                        ),
                      ),
                    ],
                    if (_selectedMethod != null)
                      _PaymentMethodDetailsCard(method: _selectedMethod!)
                    else if (_selectedMethodId == 'TRANSFER' &&
                        _legacyPaymentInfo != null)
                      _BankInfoCard(paymentInfo: _legacyPaymentInfo!),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _submitting ? null : _continue,
                        style: FilledButton.styleFrom(
                          backgroundColor: scheme.primary,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: _submitting
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Continuar'),
                      ),
                    ),
                  ],
                ),
    );
  }
}

final class _MatchHeaderCard extends StatelessWidget {
  const _MatchHeaderCard({required this.title, required this.amount});

  final String title;
  final String amount;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: scheme.surfaceContainerHighest,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  'Pago por jugador',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: scheme.primary.withValues(alpha: 0.12),
            ),
            child: Text(
              amount,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: scheme.primary,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

final class _PaymentMethodDetailsCard extends StatelessWidget {
  const _PaymentMethodDetailsCard({required this.method});

  final VenuePaymentMethodDto method;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final rows = method.detailRows;
    if (rows.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: scheme.tertiaryContainer.withValues(alpha: 0.4),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.payments_outlined, size: 18, color: scheme.tertiary),
                const SizedBox(width: 8),
                Text(
                  'Datos para pagar',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ...rows.map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: _InfoRow(label: r.label, value: r.value),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _BankInfoCard extends StatelessWidget {
  const _BankInfoCard({required this.paymentInfo});

  final MatchPaymentInfoDto paymentInfo;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fields = <_InfoRow>[];

    if (paymentInfo.paymentHolder != null &&
        paymentInfo.paymentHolder!.isNotEmpty) {
      fields.add(_InfoRow(label: 'Titular', value: paymentInfo.paymentHolder!));
    }
    if (paymentInfo.paymentBank != null && paymentInfo.paymentBank!.isNotEmpty) {
      fields.add(_InfoRow(label: 'Banco', value: paymentInfo.paymentBank!));
    }
    if (paymentInfo.paymentCvu != null && paymentInfo.paymentCvu!.isNotEmpty) {
      fields.add(_InfoRow(label: 'CVU', value: paymentInfo.paymentCvu!));
    }
    if (paymentInfo.paymentAlias != null &&
        paymentInfo.paymentAlias!.isNotEmpty) {
      fields.add(_InfoRow(label: 'Alias', value: paymentInfo.paymentAlias!));
    }

    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: scheme.tertiaryContainer.withValues(alpha: 0.4),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.account_balance, size: 18, color: scheme.tertiary),
                const SizedBox(width: 8),
                Text(
                  'Datos para la transferencia',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ...fields,
          ],
        ),
      ),
    );
  }
}

final class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 72,
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
        Expanded(
          child: SelectableText(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
      ],
    );
  }
}
