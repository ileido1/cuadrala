import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/formatting/money_format.dart';
import '../../../../core/models/currency_code.dart';
import '../../../../router/routes.dart';
import '../../../../shared/widgets/dual_price.dart';
import '../../data/models/tournament_list_item_dto.dart';
import 'tournament_status_pill.dart';

String _occupancyLabel(int count, int? max) {
  if (max == null) {
    return count == 1 ? '$count inscripto' : '$count inscriptos';
  }
  return '$count/$max inscriptos';
}

/// Tarjeta de torneo del listado (rediseño).
///
/// Responde la primera pregunta del jugador —¿puedo entrar?— sin abrir nada:
/// estado, categoría, cuándo, dónde, cuánta gente hay y cuánto sale. Los datos
/// que el organizador no declaró **no se inventan**: la fila desaparece en vez
/// de mostrarse vacía o con un placeholder.
final class TournamentListItemTile extends StatelessWidget {
  const TournamentListItemTile({super.key, required this.tournament});

  final TournamentListItemDto tournament;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(
          Routes.tournamentDetail(tournament.id),
          extra: tournament,
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  TournamentStatusPill(status: tournament.status),
                  const SizedBox(width: 8),
                  Flexible(
                    child: _CategoryChip(label: tournament.categoryName),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                tournament.name,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              //? Cuándo y dónde en una fila que envuelve: en pantallas angostas
              //? la sede baja sola en vez de recortarse con puntos suspensivos.
              Wrap(
                spacing: 14,
                runSpacing: 4,
                children: [
                  if (tournament.startsAt != null)
                    _MetaRow(
                      icon: Icons.calendar_today_outlined,
                      label: _formatStartSV(tournament.startsAt!),
                    ),
                  if (tournament.venueName != null)
                    _MetaRow(
                      key: const Key('tournament.card.venue'),
                      icon: Icons.place_outlined,
                      label: tournament.venueName!,
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(child: _Occupancy(tournament: tournament)),
                  if (tournament.inscriptionPrice != null) ...[
                    const SizedBox(width: 12),
                    _Price(
                      key: const Key('tournament.card.price'),
                      amount: tournament.inscriptionPrice!,
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _formatStartSV(DateTime startsAt) {
    final local = startsAt.toLocal();
    return DateFormat('EEE d MMM · HH:mm', 'es_ES').format(local).toUpperCase();
  }
}

final class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.3,
          color: scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

final class _MetaRow extends StatelessWidget {
  const _MetaRow({super.key, required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: scheme.onSurfaceVariant),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: scheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

final class _Occupancy extends StatelessWidget {
  const _Occupancy({required this.tournament});

  final TournamentListItemDto tournament;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final count = tournament.registrationCount;
    final max = tournament.maxSlots;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Flexible(
              child: Text(
                _occupancyLabel(count, max),
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ),
            if (tournament.registrationClosesAt != null) ...[
              const SizedBox(width: 8),
              Text(
                'cierra ${DateFormat('EEE', 'es_ES').format(tournament.registrationClosesAt!.toLocal()).toUpperCase()}',
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: scheme.onSurfaceVariant.withValues(alpha: 0.75),
                ),
              ),
            ],
          ],
        ),
        if (max != null) ...[
          const SizedBox(height: 6),
          _SlotBar(
            key: const Key('tournament.card.slots'),
            filled: count,
            total: max,
          ),
        ],
      ],
    );
  }
}

final class _SlotBar extends StatelessWidget {
  const _SlotBar({super.key, required this.filled, required this.total});

  final int filled;
  final int total;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    //? Se satura en 1: un torneo con más anotados que cupos es decisión del
    //? organizador, y la barra no debe desbordar por eso.
    final ratio = total <= 0 ? 0.0 : (filled / total).clamp(0.0, 1.0);
    final isFull = ratio >= 1.0;

    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: LinearProgressIndicator(
        value: ratio,
        minHeight: 5,
        backgroundColor: scheme.surfaceContainerHighest,
        valueColor: AlwaysStoppedAnimation<Color>(
          isFull ? scheme.onSurfaceVariant : scheme.primary,
        ),
      ),
    );
  }
}

/// Precio de inscripción por jugador.
///
/// Un `0` declarado dice **Gratis**: es información, no ausencia de dato. El
/// secundario en Bs queda fuera a propósito — [DualPrice] es presentacional y
/// la conversión necesita la tasa real, no un factor fijo.
final class _Price extends StatelessWidget {
  const _Price({super.key, required this.amount});

  final double amount;

  @override
  Widget build(BuildContext context) {
    if (amount == 0) {
      return Text(
        'Gratis',
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w800,
          color: Theme.of(context).colorScheme.primary,
        ),
      );
    }

    return DualPrice(
      primaryLabel: formatMoneyFromMajor(amount, CurrencyCode.usd),
      suffix: 'p/p',
    );
  }
}
