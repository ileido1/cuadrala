import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_icons.dart';
import '../../../../router/routes.dart';
import '../../data/models/tournament_list_item_dto.dart';

final class TournamentListItemTile extends StatelessWidget {
  const TournamentListItemTile({
    super.key,
    required this.tournament,
  });

  final TournamentListItemDto tournament;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('dd MMM · HH:mm', 'es_ES');

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(Routes.tournamentDetail(tournament.id), extra: tournament),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Status icon
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _statusColor(tournament.status)
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  AppIcons.trophy,
                  color: _statusColor(tournament.status),
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tournament.name,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${tournament.sportName} · ${tournament.categoryName}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    if (tournament.startsAt != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        dateFormat.format(tournament.startsAt!),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              // Registration count + arrow
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  _StatusChip(status: tournament.status),
                  const SizedBox(height: 4),
                  Text(
                    '${tournament.registrationCount} ins.',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.chevron_right,
                color: theme.colorScheme.onSurfaceVariant,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return Colors.grey;
      case 'REGISTRATION_OPEN':
        return Colors.green;
      case 'REGISTRATION_CLOSED':
        return Colors.orange;
      case 'IN_PROGRESS':
        return Colors.blue;
      case 'FINISHED':
        return Colors.indigo;
      case 'CANCELLED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

final class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = _chipColor(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        _label(status),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  String _label(String s) {
    switch (s.toUpperCase()) {
      case 'DRAFT':
        return 'Borrador';
      case 'REGISTRATION_OPEN':
        return 'Inscripciones abiertas';
      case 'REGISTRATION_CLOSED':
        return 'Inscripciones cerradas';
      case 'IN_PROGRESS':
        return 'En curso';
      case 'FINISHED':
        return 'Finalizado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return s;
    }
  }

  Color _chipColor(String status) {
    switch (status.toUpperCase()) {
      case 'REGISTRATION_OPEN':
        return Colors.green;
      case 'IN_PROGRESS':
        return Colors.blue;
      case 'FINISHED':
        return Colors.indigo;
      case 'CANCELLED':
        return Colors.red;
      case 'REGISTRATION_CLOSED':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }
}
