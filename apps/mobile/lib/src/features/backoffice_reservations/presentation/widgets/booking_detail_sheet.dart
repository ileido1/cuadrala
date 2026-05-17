import 'package:flutter/material.dart';

import '../../data/models/booking_item.dart';
import 'booking_payment_sheet.dart';

/// Detalle de booking con resumen de pago (MCP).
final class BookingDetailSheet extends StatelessWidget {
  const BookingDetailSheet({
    super.key,
    required this.booking,
    required this.venueId,
    required this.venueName,
    this.onPaymentConfirmed,
  });

  final BookingItem booking;
  final String venueId;
  final String venueName;
  final VoidCallback? onPaymentConfirmed;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final TYPE_LABEL = switch (booking.type) {
      BookingType.direct => 'Reserva directa',
      BookingType.blocked => 'Bloqueado',
      BookingType.match => 'Partido',
    };

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                booking.courtName,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                venueName,
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 16),
              _InfoRow(label: 'Tipo', value: TYPE_LABEL),
              _InfoRow(
                label: 'Horario',
                value: '${booking.date} · ${booking.startTime}–${booking.endTime}',
              ),
              _InfoRow(label: 'Estado', value: booking.status),
              if (booking.notes != null && booking.notes!.isNotEmpty)
                _InfoRow(label: 'Notas', value: booking.notes!),
              if (booking.hasPaymentSummary) ...[
                const SizedBox(height: 16),
                Text(
                  'Pago',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                _InfoRow(label: 'Total', value: booking.formatTotalAmount()),
                _InfoRow(label: 'Pagado', value: booking.formatPaidAmount()),
                _InfoRow(
                  label: 'Pendiente',
                  value: booking.formatPendingAmount(),
                ),
                if (booking.paymentStatus != null)
                  _InfoRow(
                    label: 'Estado pago',
                    value: _paymentStatusLabel(booking.paymentStatus!),
                  ),
              ],
              if (booking.isDirect &&
                  booking.paymentStatus != 'PAID' &&
                  booking.status != 'CANCELLED') ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => _openPaymentSheet(context),
                    icon: const Icon(Icons.payments_outlined),
                    label: const Text('Registrar pago'),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cerrar'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openPaymentSheet(BuildContext context) async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => BookingPaymentSheet(
        booking: booking,
        venueId: venueId,
        venueName: venueName,
        onPaymentConfirmed: onPaymentConfirmed,
      ),
    );
    if (confirmed == true && context.mounted) {
      Navigator.of(context).pop();
    }
  }

  static String _paymentStatusLabel(String status) {
    switch (status) {
      case 'PAID':
        return 'Pagado';
      case 'PARTIAL':
        return 'Parcial';
      case 'UNPAID':
        return 'Sin pagar';
      default:
        return status;
    }
  }
}

final class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
