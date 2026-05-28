import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../../router/routes.dart';
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
  Timer? _pollTimer;
  String _status = 'PENDING';
  int _pollSeconds = 5;

  CurrencyCode get _currency => CurrencyCode.resolve(
        pricingCurrency: widget.pricingCurrency,
      );

  @override
  void initState() {
    super.initState();
    _pollOnce();
    _schedulePoll();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  void _schedulePoll() {
    _pollTimer?.cancel();
    _pollTimer = Timer(Duration(seconds: _pollSeconds), () async {
      await _pollOnce();
      if (!mounted) return;
      if (_status == 'PENDING') {
        _pollSeconds = (_pollSeconds + 2).clamp(5, 15);
        _schedulePoll();
      }
    });
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

    final isConfirmed = _status == 'CONFIRMED';
    final isRejected = _status == 'CANCELLED';

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
                        : scheme.primary.withValues(alpha: 0.12),
              ),
              child: Center(
                child: isConfirmed
                    ? Icon(Icons.check_circle, color: scheme.primary, size: 48)
                    : isRejected
                        ? Icon(Icons.cancel, color: scheme.error, size: 48)
                        : const CircularProgressIndicator(),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              isConfirmed
                  ? '¡Pago confirmado!'
                  : isRejected
                      ? 'Pago no aceptado'
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
                  const Icon(Icons.sports_tennis),
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
                        Text(
                          'Monto: $amount',
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: scheme.onSurfaceVariant,
                                  ),
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
                              : scheme.tertiary.withValues(alpha: 0.12),
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
                                    : scheme.tertiary,
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
                          : () => context.go(
                                Routes.matchDetail(widget.matchId),
                              ),
                      child: Text(
                        isRejected ? 'Volver a pagar' : 'Ver mi partida',
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
