import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/fx_price_labels.dart';
import '../../../core/formatting/money_conversion.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/dual_price.dart';
import '../data/monetization_repository.dart';
import 'pay_method_screen.dart';

final class WaitingConfirmationScreen extends StatefulWidget {
  const WaitingConfirmationScreen({
    super.key,
    required this.matchId,
    required this.amountPerPersonCents,
    required this.matchTitle,
    this.pricingCurrency,
    this.transactionId,
    this.venueId,
  });

  final String matchId;
  final int amountPerPersonCents;
  final String matchTitle;
  final String? pricingCurrency;
  final String? transactionId;
  final String? venueId;

  static String route({
    required String matchId,
    required int amountPerPersonCents,
    required String matchTitle,
    String? pricingCurrency,
    String? transactionId,
    String? venueId,
  }) {
    final qp = <String, String>{
      'amountCents': amountPerPersonCents.toString(),
      'title': matchTitle,
      'currency': ?pricingCurrency,
      'tx': ?transactionId,
      if (venueId != null && venueId.isNotEmpty) 'venueId': venueId,
    };
    final query = Uri(queryParameters: qp).query;
    return '/matches/$matchId/pay/waiting?$query';
  }

  @override
  State<WaitingConfirmationScreen> createState() =>
      _WaitingConfirmationScreenState();
}

class _WaitingConfirmationScreenState extends State<WaitingConfirmationScreen> {
  //? Corte de polling: el staff confirma manualmente en el panel web y puede
  //? tardar, pero no puede quedar reintentando para siempre si la pantalla
  //? se deja abierta. Con el backoff tope de 15s, 20 intentos son ~5
  //? minutos de margen — de sobra para una confirmación manual típica.
  static const int _maxPollAttempts = 20;

  Timer? _pollTimer;
  String _status = 'PENDING';
  int _pollSeconds = 5;
  int _pollAttempts = 0;
  bool _pollTimedOut = false;
  List<ExchangeRateRow> _exchangeRates = const [];

  CurrencyCode get _currency => CurrencyCode.resolve(
        pricingCurrency: widget.pricingCurrency,
      );

  @override
  void initState() {
    super.initState();
    _loadExchangeRates();
    _pollOnce();
    _schedulePoll();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadExchangeRates() async {
    final rates = await loadExchangeRatesSafelySV();
    if (mounted) setState(() => _exchangeRates = rates);
  }

  void _schedulePoll() {
    _pollTimer?.cancel();
    _pollTimer = Timer(Duration(seconds: _pollSeconds), () async {
      await _pollOnce();
      if (!mounted) return;
      if (_status != 'PENDING') return;
      _pollAttempts++;
      if (_pollAttempts >= _maxPollAttempts) {
        setState(() => _pollTimedOut = true);
        return;
      }
      _pollSeconds = (_pollSeconds + 2).clamp(5, 15);
      _schedulePoll();
    });
  }

  void _retryPoll() {
    setState(() {
      _pollTimedOut = false;
      _pollSeconds = 5;
      _pollAttempts = 0;
    });
    _pollOnce();
    _schedulePoll();
  }

  Future<void> _pollOnce() async {
    try {
      final repo = getIt<MonetizationRepository>();
      final txs = await repo.listMyTransactions(limit: 50);
      final forMatch = txs.transactions.where((t) => t.matchId == widget.matchId);
      final txId = widget.transactionId;
      final tx = txId != null && txId.isNotEmpty
          ? forMatch.where((t) => t.id == txId).firstOrNull
          : forMatch.isEmpty
              ? null
              : (forMatch.toList()..sort((a, b) => b.createdAt.compareTo(a.createdAt)))
                  .first;

      if (tx == null) return;
      if (!mounted) return;
      setState(() => _status = tx.status);
    } catch (_) {
      // Silencioso: el staff confirma en web; reintentamos en el siguiente poll.
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final amount = formatMoneyCents(widget.amountPerPersonCents, _currency);
    final secondaryBsLabel = secondaryBsLabelSV(
      primaryMinor: widget.amountPerPersonCents,
      primaryCurrency: _currency,
      rates: _exchangeRates,
      effectiveDateIso: localCalendarDateIsoSV(DateTime.now()),
    );

    final isConfirmed = _status == 'CONFIRMED';
    final isRejected = _status == 'CANCELLED';
    final isTimedOut = _pollTimedOut && !isConfirmed && !isRejected;

    return Scaffold(
      key: const Key('pay.waiting.screen'),
      appBar: AppBar(
        title: Text(
          isConfirmed
              ? 'Pago confirmado'
              : isRejected
                  ? 'Pago rechazado'
                  : 'Esperando confirmación',
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const SizedBox(height: 26),
            Container(
              height: 84,
              width: 84,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isConfirmed
                    ? scheme.primaryContainer
                    : isRejected
                        ? scheme.errorContainer
                        : isTimedOut
                            ? scheme.surfaceContainerHighest
                            : scheme.primary.withValues(alpha: 0.12),
              ),
              child: Center(
                child: isConfirmed
                    ? Icon(AppIcons.checkCircle, color: scheme.primary, size: 48)
                    : isRejected
                        ? Icon(AppIcons.closeCircle, color: scheme.error, size: 48)
                        : isTimedOut
                            ? Icon(
                                AppIcons.warning,
                                color: scheme.onSurfaceVariant,
                                size: 48,
                              )
                            : const CircularProgressIndicator(),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              isConfirmed
                  ? '¡Pago confirmado!'
                  : isRejected
                      ? 'Pago no aceptado'
                      : isTimedOut
                          ? 'Esto está tardando más de lo esperado'
                          : 'Comprobante enviado',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              isConfirmed
                  ? 'El staff validó tu pago. Ya estás al día.'
                  : isRejected
                      ? 'Revisá los datos o contactá al organizador para reintentar.'
                      : isTimedOut
                          ? 'El staff aún no confirmó tu pago. Puedes '
                              'reintentar la verificación o volver más tarde.'
                          : 'El staff de la sede revisará el pago en el panel web.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: scheme.surfaceContainerHighest,
              ),
              child: Row(
                children: [
                  const Icon(AppIcons.racquetSport),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.matchTitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w900,
                                  ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text(
                              'Monto: ',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: scheme.onSurfaceVariant,
                                  ),
                            ),
                            DualPrice(
                              primaryLabel: amount,
                              secondaryLabel: secondaryBsLabel,
                              alignEnd: false,
                              primarySize: 14,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      color: isConfirmed
                          ? scheme.primaryContainer
                          : isRejected
                              ? scheme.errorContainer
                              : scheme.tertiary,
                    ),
                    child: Text(
                      isConfirmed
                          ? 'Confirmado'
                          : isRejected
                              ? 'Rechazado'
                              : 'Pendiente',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: isConfirmed
                                ? scheme.primary
                                : isRejected
                                    ? scheme.error
                                    : scheme.onTertiary,
                          ),
                    ),
                  ),
                ],
              ),
            ),
            const Spacer(),
            SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => context.go(Routes.home),
                      child: const Text('Ir al inicio'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: isRejected
                          ? () => context.go(
                                PayMethodScreen.route(
                                  matchId: widget.matchId,
                                  amountPerPersonCents:
                                      widget.amountPerPersonCents,
                                  matchTitle: widget.matchTitle,
                                  pricingCurrency: widget.pricingCurrency,
                                  venueId: widget.venueId,
                                ),
                              )
                          : isTimedOut
                              ? _retryPoll
                              : () => context.go(
                                    Routes.matchDetail(widget.matchId),
                                  ),
                      child: Text(
                        isRejected
                            ? 'Volver a pagar'
                            : isTimedOut
                                ? 'Reintentar'
                                : 'Ver mi partida',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
