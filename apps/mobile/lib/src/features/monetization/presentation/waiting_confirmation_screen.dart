import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/formatting/money_format.dart';
import '../../../router/routes.dart';

final class WaitingConfirmationScreen extends StatelessWidget {
  const WaitingConfirmationScreen({
    super.key,
    required this.matchId,
    required this.amountPerPersonCents,
    required this.matchTitle,
  });

  final String matchId;
  final int amountPerPersonCents;
  final String matchTitle;

  static String route({
    required String matchId,
    required int amountPerPersonCents,
    required String matchTitle,
  }) {
    final qp = <String, String>{
      'amountCents': amountPerPersonCents.toString(),
      'title': matchTitle,
    };
    final query = Uri(queryParameters: qp).query;
    return '/matches/$matchId/pay/waiting?$query';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final amount = formatMoneyCents(amountPerPersonCents);

    return Scaffold(
      key: const Key('pay.waiting.screen'),
      appBar: AppBar(title: const Text('Esperando confirmación')),
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
                color: scheme.primary.withValues(alpha: 0.12),
              ),
              child: const Center(
                child: CircularProgressIndicator(),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Comprobante enviado',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'El organizador revisará el pago y lo confirmará.',
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
                          matchTitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Monto: $amount',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: scheme.onSurfaceVariant,
                              ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      color: scheme.tertiary.withValues(alpha: 0.12),
                    ),
                    child: Text(
                      'Pendiente',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: scheme.tertiary,
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
                      onPressed: () => context.go(Routes.matchDetail(matchId)),
                      child: const Text('Ver mi partida'),
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

