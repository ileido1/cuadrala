import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// ignore_for_file: deprecated_member_use

import '../../../core/data/exchange_rates_repository.dart';
import '../../../core/di/service_locator.dart';
import '../../../core/failures/app_failure.dart';
import '../../../core/formatting/money_conversion.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../matches/data/matches_repository.dart';
import '../../matches/presentation/open_match_display.dart';
import '../../profile/data/profile_repository.dart';
import '../../venues/data/venues_repository.dart';
import '../data/monetization_repository.dart';
import '../data/models/match_payment_info_dto.dart';
import '../data/models/transaction_dto.dart';
import '../data/models/venue_payment_method_dto.dart';
import 'upload_receipt_screen.dart';
import 'waiting_confirmation_screen.dart';

final class PayMethodScreen extends StatefulWidget {
  const PayMethodScreen({
    super.key,
    required this.matchId,
    required this.amountPerPlayerCents,
    required this.matchTitle,
    this.venueId,
    this.pricingCurrency,
    this.displayCurrency,
    this.scheduledAt,
  });

  final String matchId;
  final int amountPerPlayerCents;
  final String matchTitle;
  final String? venueId;
  final String? pricingCurrency;
  final String? displayCurrency;
  final DateTime? scheduledAt;

  static String route({
    required String matchId,
    required int amountPerPersonCents,
    required String matchTitle,
    String? venueId,
    String? pricingCurrency,
    String? displayCurrency,
    DateTime? scheduledAt,
  }) {
    final qp = <String, String>{
      'amountCents': amountPerPersonCents.toString(),
      'title': matchTitle,
      if (venueId != null && venueId.isNotEmpty) 'venueId': venueId,
      if (pricingCurrency != null) 'currency': pricingCurrency,
      if (displayCurrency != null) 'displayCurrency': displayCurrency,
      if (scheduledAt != null) 'scheduledAt': scheduledAt.toUtc().toIso8601String(),
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
  String? _resolvedDisplayCurrency;
  String? _countryCode;
  DateTime? _matchScheduledAt;
  List<ExchangeRateRow> _exchangeRates = const [];
  bool _fxMissingRate = false;
  TransactionDto? _loadedTransaction;
  int? _settlementMinorCents;
  CurrencyCode? _obligationCurrency;
  CurrencyCode? _settlementCurrency;

  CurrencyCode get _displayCurrencyCode => venueDisplayCurrency(
        displayCurrency: _resolvedDisplayCurrency ?? widget.displayCurrency,
        pricingCurrency: _resolvedPricingCurrency ?? widget.pricingCurrency,
      );

  bool get _isCash => _methodRouteValue == 'CASH';

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
      var displayCurrency = widget.displayCurrency;
      var countryCode = 'VE';
      if (venueId != null && venueId.isNotEmpty) {
        try {
          final venue =
              await getIt<VenuesRepository>().getVenueDetail(venueId: venueId);
          pricingCurrency ??= venue.pricingCurrency ?? venue.displayCurrency;
          displayCurrency ??= venue.displayCurrency ?? venue.pricingCurrency;
          countryCode = venue.countryCode ?? 'VE';
        } catch (_) {}
      }

      DateTime? scheduledAt = widget.scheduledAt;
      try {
        final match =
            await getIt<MatchesRepository>().getMatchById(widget.matchId);
        scheduledAt ??= match.scheduledAt;
      } catch (_) {}

      var exchangeRates = const <ExchangeRateRow>[];
      try {
        exchangeRates = await getIt<ExchangeRatesRepository>().listByCountry(
          countryCode: countryCode,
        );
      } catch (_) {
        exchangeRates = const [];
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
          _loadedTransaction = pendingTx;
          _methods = methods;
          _legacyPaymentInfo = legacyInfo;
          _resolvedPricingCurrency = pricingCurrency;
          _resolvedDisplayCurrency = displayCurrency;
          _countryCode = countryCode;
          _matchScheduledAt = scheduledAt;
          _exchangeRates = exchangeRates;
          _selectedMethodId = methods.isNotEmpty ? methods.first.id : 'TRANSFER';
          _loading = false;
        });
        _recomputeFx();
        return;
      }

      final amount = widget.amountPerPlayerCents / 100.0;
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
            _loadedTransaction = TransactionDto(
              id: first['id'] as String,
              matchId: widget.matchId,
              userId: me.id,
              amountBase: (first['amountBase'] as String?) ?? '0',
              feeAmount: (first['feeAmount'] as String?) ?? '0',
              amountTotal: (first['amountTotal'] as String?) ?? '0',
              status: (first['status'] as String?) ?? 'PENDING',
              paymentMethod: 'MANUAL',
              confirmedAt: null,
              createdAt: DateTime.now(),
            );
            _methods = methods;
            _legacyPaymentInfo = legacyInfo;
            _resolvedPricingCurrency = pricingCurrency;
            _resolvedDisplayCurrency = displayCurrency;
            _countryCode = countryCode;
            _matchScheduledAt = scheduledAt;
            _exchangeRates = exchangeRates;
            _selectedMethodId = methods.isNotEmpty ? methods.first.id : 'TRANSFER';
            _loading = false;
          });
          _recomputeFx();
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
    return _selectedMethodId ?? 'TRANSFER';
  }

  /// Obligación en minor: total con comisión (`amountTotal`), no solo precio p/p.
  int _obligationMinorForFx() {
    final tx = _loadedTransaction;
    if (tx != null) {
      final total = double.tryParse(tx.amountTotal);
      if (total != null && total > 0) {
        return (total * 100).round();
      }
    }
    return widget.amountPerPlayerCents;
  }

  void _recomputeFx() {
    final obligationMinor = _obligationMinorForFx();
    final obligation = CurrencyCode.fromApiValue(
      _resolvedPricingCurrency ?? widget.pricingCurrency ?? 'BS',
    );
    final method = _selectedMethod;
    final settlement = CurrencyCode.fromApiValue(
      method?.settlementCurrency ?? obligation.apiValue,
    );

    _obligationCurrency = obligation;
    _settlementCurrency = settlement;

    if (obligation == settlement) {
      setState(() {
        _fxMissingRate = false;
        _settlementMinorCents = obligationMinor;
      });
      return;
    }

    final scheduled = _matchScheduledAt ?? DateTime.now();
    final dateIso = localCalendarDateIsoSV(scheduled);
    final oblRate = pickExchangeRateForDateSV(_exchangeRates, obligation, dateIso);
    final setRate = pickExchangeRateForDateSV(_exchangeRates, settlement, dateIso);

    if (oblRate == null || setRate == null) {
      setState(() {
        _fxMissingRate = true;
        _settlementMinorCents = null;
      });
      return;
    }

    final settlementMinor = convertMinorBetweenCurrenciesSV(
      obligationMinor,
      obligation,
      settlement,
      oblRate.rateToBs,
      setRate.rateToBs,
    );
    setState(() {
      _fxMissingRate = false;
      _settlementMinorCents = settlementMinor;
    });
  }

  static final RegExp _uuidRe = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    caseSensitive: false,
  );

  Future<void> _continue() async {
    final txId = _transactionId;
    if (txId == null || txId.isEmpty) return;

    if (!_isCash && _fxMissingRate) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No hay tasa de cambio para la fecha del partido. '
            'Contacta al club.',
          ),
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final repo = getIt<MonetizationRepository>();
      final methodId = _selectedMethodId;
      final pricing = _resolvedPricingCurrency ?? widget.pricingCurrency;
      final reportedMinor = _isCash
          ? _obligationMinorForFx()
          : (_settlementMinorCents ?? _obligationMinorForFx());
      final reportedCurrency =
          (_isCash ? _obligationCurrency : _settlementCurrency)?.apiValue
          ?? pricing
          ?? widget.pricingCurrency
          ?? 'BS';

      if (methodId != null && _uuidRe.hasMatch(methodId)) {
        await repo.recordPlayerPaymentSelection(
          transactionId: txId,
          venuePaymentMethodId: methodId,
          reportedSettlementMinor: reportedMinor,
          reportedSettlementCurrency: reportedCurrency,
        );
      } else if (methodId != null && methodId.isNotEmpty) {
        await repo.recordPlayerPaymentSelection(
          transactionId: txId,
          paymentMethodType: methodId,
          reportedSettlementMinor: reportedMinor,
          reportedSettlementCurrency: reportedCurrency,
        );
      }
      if (!mounted) return;

      if (_isCash) {
        context.push(
          WaitingConfirmationScreen.route(
            matchId: widget.matchId,
            amountPerPersonCents: reportedMinor,
            matchTitle: widget.matchTitle,
            pricingCurrency: reportedCurrency,
            transactionId: txId,
            venueId: widget.venueId,
          ),
        );
        return;
      }

      final amountForUpload =
          _settlementMinorCents ?? widget.amountPerPlayerCents;
      final currencyForUpload =
          _settlementCurrency?.apiValue ?? pricing;

      context.push(
        UploadReceiptScreen.route(
          matchId: widget.matchId,
          transactionId: txId,
          method: _methodRouteValue,
          amountPerPersonCents: amountForUpload,
          matchTitle: widget.matchTitle,
          pricingCurrency: currencyForUpload,
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
                        widget.amountPerPlayerCents,
                        _displayCurrencyCode,
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
                            onChanged: (v) {
                              setState(() => _selectedMethodId = v);
                              _recomputeFx();
                            },
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
                          onChanged: (v) {
                            setState(() => _selectedMethodId = v ?? 'TRANSFER');
                            _recomputeFx();
                          },
                          title: const Text('Transferencia bancaria'),
                          subtitle: const Text('Recomendado'),
                        ),
                      ),
                      Card(
                        child: RadioListTile<String>(
                          value: 'CASH',
                          groupValue: _selectedMethodId,
                          onChanged: (v) {
                            setState(() => _selectedMethodId = v ?? 'CASH');
                            _recomputeFx();
                          },
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
                    if (!_isCash &&
                        _settlementMinorCents != null &&
                        _obligationCurrency != null &&
                        _settlementCurrency != null &&
                        _obligationCurrency != _settlementCurrency)
                      _SettlementConversionCard(
                        obligationMinor: widget.amountPerPlayerCents,
                        obligationCurrency: _obligationCurrency!,
                        settlementMinor: _settlementMinorCents!,
                        settlementCurrency: _settlementCurrency!,
                      ),
                    if (!_isCash && _fxMissingRate)
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Text(
                          'Falta la tasa de cambio para esta fecha. '
                          'No puedes continuar hasta que el club la cargue.',
                          style: TextStyle(
                            color: scheme.error,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    if (_isCash)
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Text(
                          'Pagarás en efectivo en el club. No necesitas subir '
                          'comprobante; el staff confirmará tu pago.',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: scheme.onSurfaceVariant,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: (_submitting ||
                                (!_isCash && _fxMissingRate))
                            ? null
                            : _continue,
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

final class _SettlementConversionCard extends StatelessWidget {
  const _SettlementConversionCard({
    required this.obligationMinor,
    required this.obligationCurrency,
    required this.settlementMinor,
    required this.settlementCurrency,
  });

  final int obligationMinor;
  final CurrencyCode obligationCurrency;
  final int settlementMinor;
  final CurrencyCode settlementCurrency;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: scheme.secondaryContainer.withValues(alpha: 0.5),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Monto a transferir (${settlementCurrency.apiValue})',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              formatMoneyCents(settlementMinor, settlementCurrency),
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: scheme.primary,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'Equivale a ${formatMoneyCents(obligationMinor, obligationCurrency)} '
              'en moneda de la partida.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
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
