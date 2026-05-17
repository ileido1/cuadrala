import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/currency_code.dart';
import '../../../shared/widgets/app_header.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/skeleton_list.dart';
import '../data/models/pending_transaction_dto.dart';
import 'cubit/payments_cubit.dart';
import 'cubit/payments_state.dart';
import 'widgets/payment_list_tile.dart';

final class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({
    super.key,
    required this.venueId,
    required this.venueName,
    this.pricingCurrency,
    this.displayCurrency,
  });

  final String venueId;
  final String venueName;
  final String? pricingCurrency;
  final String? displayCurrency;

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  @override
  void initState() {
    super.initState();
    context.read<PaymentsCubit>().load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            AppHeader(
              title: 'Pagos Pendientes',
              subtitle: widget.venueName,
              showBack: true,
            ),
            Expanded(
              child: BlocBuilder<PaymentsCubit, PaymentsState>(
                builder: (context, state) {
                  if (state is PaymentsInitial || state is PaymentsLoading) {
                    return const SkeletonList();
                  }

                  if (state is PaymentsError) {
                    return ErrorState(
                      title: 'Error',
                      message: state.message,
                      onRetry: () => context.read<PaymentsCubit>().load(),
                    );
                  }

                  if (state is PaymentsEmpty) {
                    return const EmptyPayments();
                  }

                  final loaded = state as PaymentsLoaded;
                  final currency = CurrencyCode.resolve(
                    pricingCurrency: widget.pricingCurrency,
                    displayCurrency: widget.displayCurrency,
                  );
                  return PaymentsTable(
                    transactions: loaded.transactions,
                    currency: currency,
                    onTap: (id) => context.push('/dashboard/payments/$id'),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class PaymentsTable extends StatelessWidget {
  const PaymentsTable({
    super.key,
    required this.transactions,
    required this.currency,
    required this.onTap,
  });

  final List<PendingTransactionDto> transactions;
  final CurrencyCode currency;
  final void Function(String id) onTap;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () => context.read<PaymentsCubit>().refresh(),
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: transactions.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final t = transactions[index];
          return PaymentListTile(
            transactionId: t.id,
            matchLabel: t.displayLabel(),
            amountTotalMajor: t.amountTotalMajor,
            currency: currency,
            status: t.status,
            createdAt: t.createdAt,
            onTap: () => onTap(t.id),
          );
        },
      ),
    );
  }
}

final class EmptyPayments extends StatelessWidget {
  const EmptyPayments({super.key});

  @override
  Widget build(BuildContext context) {
    return const EmptyState(
      title: 'Sin pagos pendientes',
      message: 'No hay transacciones pendientes para esta sede.',
    );
  }
}