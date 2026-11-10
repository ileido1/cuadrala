import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

// ignore_for_file: deprecated_member_use

import '../../../core/data/exchange_rates_repository.dart';
import '../../../core/di/service_locator.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../../core/theme/app_icons.dart';
import '../../../shared/widgets/error_state.dart';
import '../../matches/data/matches_repository.dart';
import '../../profile/data/profile_repository.dart';
import '../data/models/match_payment_info_dto.dart';
import '../data/models/venue_payment_method_dto.dart';
import '../data/monetization_repository.dart';
import 'cubit/pay_method_cubit.dart';
import 'cubit/pay_method_state.dart';
import 'upload_receipt_screen.dart';
import 'waiting_confirmation_screen.dart';

String _currencyLabel(CurrencyCode currency) {
  switch (currency) {
    case CurrencyCode.bs:
      return 'VES · Bs.';
    case CurrencyCode.usd:
      return 'USD';
    case CurrencyCode.eur:
      return 'EUR';
  }
}

final class PayMethodScreen extends StatelessWidget {
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
      'currency': ?pricingCurrency,
      'displayCurrency': ?displayCurrency,
      if (scheduledAt != null)
        'scheduledAt': scheduledAt.toUtc().toIso8601String(),
    };
    final query = Uri(queryParameters: qp).query;
    return '/matches/$matchId/pay/method?$query';
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider<PayMethodCubit>(
      create: (_) => PayMethodCubit(
        monetizationRepository: getIt<MonetizationRepository>(),
        matchesRepository: getIt<MatchesRepository>(),
        profileRepository: getIt<ProfileRepository>(),
        exchangeRatesRepository: getIt<ExchangeRatesRepository>(),
        matchId: matchId,
        amountPerPlayerCents: amountPerPlayerCents,
        venueId: venueId,
        pricingCurrency: pricingCurrency,
        displayCurrency: displayCurrency,
        scheduledAt: scheduledAt,
      )..bootstrap(),
      child: BlocListener<PayMethodCubit, PayMethodState>(
        listenWhen: (prev, curr) =>
            prev.navigationIntent != curr.navigationIntent &&
            curr.navigationIntent != null,
        listener: (context, state) {
          final intent = state.navigationIntent!;
          switch (intent.destination) {
            case PayMethodDestination.waiting:
              context.push(
                WaitingConfirmationScreen.route(
                  matchId: matchId,
                  amountPerPersonCents: intent.amountPerPersonCents,
                  matchTitle: matchTitle,
                  pricingCurrency: intent.pricingCurrency,
                  transactionId: intent.transactionId,
                  venueId: venueId,
                ),
              );
            case PayMethodDestination.uploadReceipt:
              context.push(
                UploadReceiptScreen.route(
                  matchId: matchId,
                  transactionId: intent.transactionId,
                  method: intent.method,
                  amountPerPersonCents: intent.amountPerPersonCents,
                  matchTitle: matchTitle,
                  pricingCurrency: intent.pricingCurrency,
                  venueId: venueId,
                ),
              );
          }
        },
        child: BlocListener<PayMethodCubit, PayMethodState>(
          listenWhen: (prev, curr) =>
              curr.submitErrorMessage != null &&
              prev.submitErrorMessage != curr.submitErrorMessage,
          listener: (context, state) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.submitErrorMessage!)),
            );
          },
          child: _PayMethodView(matchTitle: matchTitle),
        ),
      ),
    );
  }
}

final class _PayMethodView extends StatelessWidget {
  const _PayMethodView({required this.matchTitle});

  final String matchTitle;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      key: const Key('pay.method.screen'),
      appBar: AppBar(title: const Text('Elegir método de pago')),
      body: BlocBuilder<PayMethodCubit, PayMethodState>(
        builder: (context, state) {
          final cubit = context.read<PayMethodCubit>();

          if (state.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.error != null) {
            return ErrorState(message: state.error!, onRetry: cubit.bootstrap);
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _MatchHeaderCard(
                title: matchTitle,
                amount: formatMoneyCents(
                  state.amountPerPlayerCents,
                  state.displayCurrencyCode,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'SELECCIONA UNA OPCIÓN',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.3,
                  color: scheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 10),
              if (state.methods.isNotEmpty)
                ...state.methods.map((m) {
                  //? Mostrar banco si hay múltiples transferencias bancarias
                  final sameTypeCount =
                      state.methods.where((x) => x.type == m.type).length;
                  final bank = m.type == 'BANK_TRANSFER' && sameTypeCount > 1
                      ? (m.config?['bank'] as String?) ?? ''
                      : '';
                  final settlementLabel = _currencyLabel(
                    CurrencyCode.fromApiValue(m.settlementCurrency),
                  );
                  final subtitle = bank.isNotEmpty
                      ? '$bank · $settlementLabel'
                      : '${m.name} · $settlementLabel';

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _MethodOption(
                      selected: state.selectedMethodId == m.id,
                      title: m.displayLabel,
                      subtitle: subtitle,
                      onTap: () => cubit.selectMethod(m.id),
                    ),
                  );
                })
              else ...[
                _MethodOption(
                  selected: state.selectedMethodId == 'TRANSFER',
                  title: 'Transferencia bancaria',
                  subtitle: 'Recomendado',
                  onTap: () => cubit.selectMethod('TRANSFER'),
                ),
                const SizedBox(height: 10),
                _MethodOption(
                  selected: state.selectedMethodId == 'CASH',
                  title: 'Efectivo',
                  subtitle: 'Coordina con el organizador',
                  onTap: () => cubit.selectMethod('CASH'),
                ),
              ],
              if (state.selectedMethod != null)
                _PaymentMethodDetailsCard(
                  method: state.selectedMethod!,
                  amountMinor: state.currentAmountMinor,
                  amountCurrency: state.currentAmountCurrency,
                  obligationMinor: state.obligationMinorForFx,
                  obligationCurrency: state.currentObligationCurrency,
                )
              else if (state.selectedMethodId == 'TRANSFER' &&
                  state.legacyPaymentInfo != null)
                _BankInfoCard(
                  paymentInfo: state.legacyPaymentInfo!,
                  amountMinor: state.currentAmountMinor,
                  amountCurrency: state.currentAmountCurrency,
                ),
              if (!state.isCash && state.fxMissingRate)
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
              if (state.isCash)
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
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: FilledButton(
                  onPressed:
                      (state.submitting || (!state.isCash && state.fxMissingRate))
                          ? null
                          : cubit.continue_,
                  style: FilledButton.styleFrom(
                    backgroundColor: scheme.primary,
                    elevation: 8,
                    shadowColor: scheme.primary.withValues(alpha: 0.4),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: state.submitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          state.isCash
                              ? 'Confirmar inscripción'
                              : 'Ya pagué · Enviar comprobante',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                ),
              ),
            ],
          );
        },
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
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: scheme.surfaceContainerLow,
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
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
                    fontWeight: FontWeight.w800,
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
  const _PaymentMethodDetailsCard({
    required this.method,
    required this.amountMinor,
    required this.amountCurrency,
    required this.obligationMinor,
    required this.obligationCurrency,
  });

  final VenuePaymentMethodDto method;
  final int amountMinor;
  final CurrencyCode amountCurrency;
  final int obligationMinor;
  final CurrencyCode obligationCurrency;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final rows = method.detailRows;

    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: scheme.surfaceContainerLow,
          border: Border.all(color: scheme.outlineVariant, width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(AppIcons.info, size: 18, color: scheme.tertiary),
                const SizedBox(width: 8),
                Text(
                  'Datos para pagar',
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
                ),
              ],
            ),
            const SizedBox(height: 10),
            _InfoRow(
              label: 'Monto a pagar',
              value: formatMoneyCents(amountMinor, amountCurrency),
            ),
            if (amountCurrency != obligationCurrency) ...[
              const SizedBox(height: 6),
              Text(
                'Equivale a ${formatMoneyCents(obligationMinor, obligationCurrency)} '
                'en la moneda de la partida.',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ],
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
  const _BankInfoCard({
    required this.paymentInfo,
    required this.amountMinor,
    required this.amountCurrency,
  });

  final MatchPaymentInfoDto paymentInfo;
  final int amountMinor;
  final CurrencyCode amountCurrency;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fields = <_InfoRow>[];

    if (paymentInfo.paymentHolder != null &&
        paymentInfo.paymentHolder!.isNotEmpty) {
      fields.add(_InfoRow(label: 'Titular', value: paymentInfo.paymentHolder!));
    }
    if (paymentInfo.paymentBank != null &&
        paymentInfo.paymentBank!.isNotEmpty) {
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
                Icon(AppIcons.bank, size: 18, color: scheme.tertiary),
                const SizedBox(width: 8),
                Text(
                  'Datos para la transferencia',
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
                ),
              ],
            ),
            const SizedBox(height: 10),
            _InfoRow(
              label: 'Monto a pagar',
              value: formatMoneyCents(amountMinor, amountCurrency),
            ),
            const SizedBox(height: 10),
            ...fields,
          ],
        ),
      ),
    );
  }
}

final class _MethodOption extends StatelessWidget {
  const _MethodOption({
    required this.selected,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final bool selected;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected
              ? scheme.primary.withValues(alpha: 0.15)
              : scheme.surfaceContainer,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            _Radio(on: selected),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: scheme.onSurface,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: scheme.onSurfaceVariant,
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

final class _Radio extends StatelessWidget {
  const _Radio({required this.on});

  final bool on;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: 22,
      height: 22,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: on ? scheme.primary : scheme.onSurface.withValues(alpha: 0.18),
          width: 2,
        ),
      ),
      child: on
          ? Container(
              width: 11,
              height: 11,
              decoration: BoxDecoration(
                color: scheme.primary,
                shape: BoxShape.circle,
              ),
            )
          : null,
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
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}
