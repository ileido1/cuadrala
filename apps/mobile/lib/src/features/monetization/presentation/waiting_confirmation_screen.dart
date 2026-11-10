import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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
import 'cubit/waiting_confirmation_cubit.dart';
import 'cubit/waiting_confirmation_state.dart';
import 'pay_method_screen.dart';

final class WaitingConfirmationScreen extends StatelessWidget {
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
  Widget build(BuildContext context) {
    return BlocProvider<WaitingConfirmationCubit>(
      create: (_) => WaitingConfirmationCubit(
        monetizationRepository: getIt<MonetizationRepository>(),
        matchId: matchId,
        transactionId: transactionId,
      )..start(),
      child: _WaitingConfirmationView(
        matchId: matchId,
        amountPerPersonCents: amountPerPersonCents,
        matchTitle: matchTitle,
        pricingCurrency: pricingCurrency,
        venueId: venueId,
      ),
    );
  }
}

final class _WaitingConfirmationView extends StatelessWidget {
  const _WaitingConfirmationView({
    required this.matchId,
    required this.amountPerPersonCents,
    required this.matchTitle,
    required this.pricingCurrency,
    required this.venueId,
  });

  final String matchId;
  final int amountPerPersonCents;
  final String matchTitle;
  final String? pricingCurrency;
  final String? venueId;

  CurrencyCode get _currency =>
      CurrencyCode.resolve(pricingCurrency: pricingCurrency);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return BlocBuilder<WaitingConfirmationCubit, WaitingConfirmationState>(
      builder: (context, state) {
        final amount = formatMoneyCents(amountPerPersonCents, _currency);
        final secondaryBsLabel = secondaryBsLabelSV(
          primaryMinor: amountPerPersonCents,
          primaryCurrency: _currency,
          rates: state.exchangeRates,
          effectiveDateIso: localCalendarDateIsoSV(DateTime.now()),
        );

        final isConfirmed = state.status == 'CONFIRMED';
        final isRejected = state.status == 'CANCELLED';
        final isTimedOut = state.pollTimedOut && !isConfirmed && !isRejected;

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
                              matchTitle,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w900),
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
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
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
                                      matchId: matchId,
                                      amountPerPersonCents: amountPerPersonCents,
                                      matchTitle: matchTitle,
                                      pricingCurrency: pricingCurrency,
                                      venueId: venueId,
                                    ),
                                  )
                              : isTimedOut
                                  ? context.read<WaitingConfirmationCubit>().retryPoll
                                  : () => context.go(
                                        Routes.matchDetail(matchId),
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
      },
    );
  }
}
