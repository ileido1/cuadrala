import 'package:flutter/material.dart';

import '../../data/tournaments_api.dart';

final class TournamentFiltersBar extends StatelessWidget {
  const TournamentFiltersBar({
    super.key,
    required this.filters,
    required this.onApply,
  });

  final TournamentListFilters filters;
  final ValueChanged<TournamentListFilters> onApply;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // Status chip
          FilterChip(
            label: Text(_statusLabel(filters.status)),
            selected: filters.status != null,
            onSelected: (_) => _showStatusPicker(context),
            avatar: filters.status != null
                ? const Icon(Icons.check, size: 16)
                : null,
          ),
          const SizedBox(width: 8),
          // Date range chip
          FilterChip(
            label: Text(_dateRangeLabel()),
            selected: filters.startsAtFrom != null,
            onSelected: (_) => _showDatePicker(context),
            avatar: filters.startsAtFrom != null
                ? const Icon(Icons.check, size: 16)
                : const Icon(Icons.calendar_today, size: 16),
          ),
          if (filters.status != null ||
              filters.startsAtFrom != null) ...[
            const SizedBox(width: 8),
            ActionChip(
              label: const Text('Limpiar'),
              onPressed: () => onApply(const TournamentListFilters()),
              avatar: const Icon(Icons.clear, size: 16),
            ),
          ],
        ],
      ),
    );
  }

  String _statusLabel(String? status) {
    if (status == null) return 'Estado';
    switch (status) {
      case 'REGISTRATION_OPEN':
        return 'Inscripciones abiertas';
      case 'REGISTRATION_CLOSED':
        return 'Inscripciones cerradas';
      case 'IN_PROGRESS':
        return 'En curso';
      case 'FINISHED':
        return 'Finalizados';
      default:
        return status;
    }
  }

  String _dateRangeLabel() {
    if (filters.startsAtFrom == null) return 'Fecha';
    return 'Desde ${_formatDate(filters.startsAtFrom!)}';
  }

  String _formatDate(DateTime d) =>
      '${d.day}/${d.month}/${d.year}';

  Future<void> _showStatusPicker(BuildContext context) async {
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Estado del torneo'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, 'REGISTRATION_OPEN'),
            child: const Text('Inscripciones abiertas'),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, 'REGISTRATION_CLOSED'),
            child: const Text('Inscripciones cerradas'),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, 'IN_PROGRESS'),
            child: const Text('En curso'),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, 'FINISHED'),
            child: const Text('Finalizados'),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, ''),
            child: const Text('Todos'),
          ),
        ],
      ),
    );
    if (result == null) return;
    onApply(TournamentListFilters(
      status: result.isEmpty ? null : result,
      venueId: filters.venueId,
      startsAtFrom: filters.startsAtFrom,
      startsAtTo: filters.startsAtTo,
      sportId: filters.sportId,
      categoryId: filters.categoryId,
    ));
  }

  Future<void> _showDatePicker(BuildContext context) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: filters.startsAtFrom ?? now,
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked == null) return;
    onApply(TournamentListFilters(
      status: filters.status,
      venueId: filters.venueId,
      startsAtFrom: picked,
      startsAtTo: filters.startsAtTo,
      sportId: filters.sportId,
      categoryId: filters.categoryId,
    ));
  }
}
