import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// ignore_for_file: deprecated_member_use

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/money_format.dart';
import '../../profile/data/profile_repository.dart';
import '../data/monetization_repository.dart';
import '../data/models/transaction_dto.dart';
import 'upload_receipt_screen.dart';

final class PayMethodScreen extends StatefulWidget {
  const PayMethodScreen({
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
  String _method = 'TRANSFER';

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
      final me = await getIt<ProfileRepository>().getMe();
      final repo = getIt<MonetizationRepository>();
      final txs = await repo.listMyTransactions(limit: 100);
      final existing = txs.transactions
          .where((t) => t.matchId == widget.matchId)
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

      final pending = existing.firstWhere(
        (t) => t.status == 'PENDING',
        orElse: () => existing.isEmpty ? _emptyTx() : existing.first,
      );

      if (pending.id.isNotEmpty && pending.status == 'PENDING') {
        if (!mounted) return;
        setState(() {
          _transactionId = pending.id;
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
            _loading = false;
          });
          return;
        }
      }

      throw Exception('No se pudo crear la obligación.');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo preparar el pago.';
        _loading = false;
      });
    }
  }

  TransactionDto _emptyTx() => TransactionDto(
        id: '',
        matchId: '',
        userId: '',
        amountBase: '0',
        feeAmount: '0',
        amountTotal: '0',
        status: 'NONE',
        paymentMethod: 'MANUAL',
        confirmedAt: null,
        createdAt: DateTime.fromMillisecondsSinceEpoch(0),
      );

  Future<void> _continue() async {
    final txId = _transactionId;
    if (txId == null || txId.isEmpty) return;
    setState(() => _submitting = true);
    try {
      if (!mounted) return;
      context.push(
        UploadReceiptScreen.route(
          matchId: widget.matchId,
          transactionId: txId,
          method: _method,
          amountPerPersonCents: widget.amountPerPersonCents,
          matchTitle: widget.matchTitle,
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
                      amount: formatMoneyCents(widget.amountPerPersonCents),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Selecciona una opción',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 10),
                    Card(
                      child: RadioListTile<String>(
                        value: 'TRANSFER',
                        groupValue: _method,
                        onChanged: (v) => setState(() => _method = v ?? 'TRANSFER'),
                        title: const Text('Transferencia bancaria'),
                        subtitle: const Text('Recomendado'),
                      ),
                    ),
                    Card(
                      child: RadioListTile<String>(
                        value: 'WALLET',
                        groupValue: _method,
                        onChanged: (v) => setState(() => _method = v ?? 'WALLET'),
                        title: const Text('Wallet Cuádrala'),
                        subtitle: const Text('Próximamente'),
                        enabled: false,
                      ),
                    ),
                    Card(
                      child: RadioListTile<String>(
                        value: 'CASH',
                        groupValue: _method,
                        onChanged: (v) => setState(() => _method = v ?? 'CASH'),
                        title: const Text('Efectivo'),
                        subtitle: const Text('Coordina con el organizador'),
                      ),
                    ),
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

