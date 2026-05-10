import 'package:flutter/material.dart';

class PaymentListTile extends StatelessWidget {
  const PaymentListTile({
    super.key,
    required this.transactionId,
    required this.matchLabel,
    required this.amountCents,
    required this.currency,
    required this.playerName,
    required this.status,
    required this.createdAt,
    required this.onTap,
  });

  final String transactionId;
  final String matchLabel;
  final int amountCents;
  final String currency;
  final String playerName;
  final String status;
  final DateTime createdAt;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final badgeColor = _statusColor(status);
    final badgeText = _statusLabel(status);

    return Card(
      color: scheme.surface,
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.5)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      matchLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: badgeColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      badgeText,
                      style: TextStyle(
                        color: badgeColor,
                        fontWeight: FontWeight.w900,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text(
                    playerName,
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '\$ ${_formatAmount(amountCents)}',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: scheme.onSurface,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.calendar_month_outlined,
                    size: 14,
                    color: scheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(createdAt),
                    style: TextStyle(
                      fontSize: 12,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                  const Spacer(),
                  Icon(Icons.chevron_right, size: 20, color: scheme.onSurfaceVariant),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.amber.shade700;
      case 'confirmed':
        return Colors.green.shade700;
      case 'failed':
        return Colors.red.shade700;
      case 'refunded':
        return Colors.grey.shade600;
      default:
        return Colors.grey.shade600;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmado';
      case 'failed':
        return 'Fallido';
      case 'refunded':
        return 'Reintegrado';
      default:
        return status;
    }
  }

  String _formatAmount(int cents) {
    final pesos = (cents / 100).round();
    return pesos.toString();
  }

  String _formatDate(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year;
    return '$day/$month/$year';
  }
}