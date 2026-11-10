import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/fx_price_labels.dart';
import '../../../core/formatting/money_conversion.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../../core/theme/app_icons.dart';
import '../../../shared/widgets/dual_price.dart';
import '../data/monetization_repository.dart';
import 'cubit/upload_receipt_cubit.dart';
import 'cubit/upload_receipt_state.dart';
import 'waiting_confirmation_screen.dart';

final class UploadReceiptScreen extends StatelessWidget {
  const UploadReceiptScreen({
    super.key,
    required this.matchId,
    required this.transactionId,
    required this.method,
    required this.amountPerPersonCents,
    required this.matchTitle,
    this.pricingCurrency,
    this.venueId,
  });

  final String matchId;
  final String transactionId;
  final String method;
  final int amountPerPersonCents;
  final String matchTitle;
  final String? pricingCurrency;
  final String? venueId;

  static String route({
    required String matchId,
    required String transactionId,
    required String method,
    required int amountPerPersonCents,
    required String matchTitle,
    String? pricingCurrency,
    String? venueId,
  }) {
    final qp = <String, String>{
      'tx': transactionId,
      'method': method,
      'amountCents': amountPerPersonCents.toString(),
      'title': matchTitle,
      'currency': ?pricingCurrency,
      if (venueId != null && venueId.isNotEmpty) 'venueId': venueId,
    };
    final query = Uri(queryParameters: qp).query;
    return '/matches/$matchId/pay/upload-receipt?$query';
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider<UploadReceiptCubit>(
      create: (_) => UploadReceiptCubit(
        monetizationRepository: getIt<MonetizationRepository>(),
        transactionId: transactionId,
      )..loadExchangeRates(),
      child: BlocListener<UploadReceiptCubit, UploadReceiptState>(
        listenWhen: (prev, curr) => !prev.completed && curr.completed,
        listener: (context, state) {
          context.go(
            WaitingConfirmationScreen.route(
              matchId: matchId,
              amountPerPersonCents: amountPerPersonCents,
              matchTitle: matchTitle,
              pricingCurrency: pricingCurrency,
              transactionId: transactionId,
              venueId: venueId,
            ),
          );
        },
        child: BlocListener<UploadReceiptCubit, UploadReceiptState>(
          listenWhen: (prev, curr) =>
              curr.errorMessage != null && prev.errorMessage != curr.errorMessage,
          listener: (context, state) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.errorMessage!)),
            );
          },
          child: _UploadReceiptView(
            matchTitle: matchTitle,
            amountPerPersonCents: amountPerPersonCents,
            pricingCurrency: pricingCurrency,
          ),
        ),
      ),
    );
  }
}

final class _UploadReceiptView extends StatelessWidget {
  const _UploadReceiptView({
    required this.matchTitle,
    required this.amountPerPersonCents,
    required this.pricingCurrency,
  });

  final String matchTitle;
  final int amountPerPersonCents;
  final String? pricingCurrency;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final currency = CurrencyCode.resolve(pricingCurrency: pricingCurrency);

    return Scaffold(
      key: const Key('pay.upload.receipt.screen'),
      appBar: AppBar(title: const Text('Subir comprobante')),
      body: BlocBuilder<UploadReceiptCubit, UploadReceiptState>(
        builder: (context, state) {
          final cubit = context.read<UploadReceiptCubit>();
          final secondaryBsLabel = secondaryBsLabelSV(
            primaryMinor: amountPerPersonCents,
            primaryCurrency: currency,
            rates: state.exchangeRates,
            effectiveDateIso: localCalendarDateIsoSV(DateTime.now()),
          );

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Sube una captura o foto del comprobante para que el organizador '
                'lo confirme.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: scheme.surfaceContainerHighest,
                ),
                child: Row(
                  children: [
                    const Icon(AppIcons.receipt),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        matchTitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    DualPrice(
                      primaryLabel: formatMoneyCents(
                        amountPerPersonCents,
                        currency,
                      ),
                      secondaryLabel: secondaryBsLabel,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              InkWell(
                onTap: state.uploading ? null : cubit.pickImage,
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  height: 240,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: scheme.outlineVariant),
                    color: scheme.surface,
                  ),
                  child: state.imageBytes == null
                      ? Center(
                          child: Text(
                            'Toca para seleccionar una imagen',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                        )
                      : ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.memory(
                            state.imageBytes!,
                            fit: BoxFit.cover,
                            width: double.infinity,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: state.uploading || state.imageBytes == null
                      ? null
                      : cubit.upload,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: state.uploading
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Enviar comprobante'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
