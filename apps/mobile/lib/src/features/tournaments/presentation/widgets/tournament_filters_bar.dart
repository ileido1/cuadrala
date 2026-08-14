import 'package:flutter/material.dart';

import '../../../../features/catalog/data/models/category_dto.dart';
import '../../../../features/catalog/data/models/sport_dto.dart';
import '../../../../features/venues/data/models/venue_dto.dart';
import '../../data/tournaments_api.dart';

final class TournamentFiltersBar extends StatelessWidget {
  const TournamentFiltersBar({
    super.key,
    required this.filters,
    required this.onApply,
    this.sports = const [],
    this.categories = const [],
    this.venues = const [],
    this.onSportChanged,
  });

  final TournamentListFilters filters;
  final ValueChanged<TournamentListFilters> onApply;
  final List<SportDto> sports;
  final List<CategoryDto> categories;
  final List<VenueDto> venues;
  final ValueChanged<String>? onSportChanged;

  bool get _hasActiveFilters =>
      filters.status != null ||
      filters.startsAtFrom != null ||
      filters.sportId != null ||
      filters.categoryId != null ||
      filters.venueId != null;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // Sport chip
          FilterChip(
            label: Text(_sportLabel()),
            selected: filters.sportId != null,
            onSelected: (_) => _showSportPicker(context),
            avatar: filters.sportId != null
                ? const Icon(Icons.check, size: 16)
                : const Icon(Icons.sports_tennis, size: 16),
          ),
          const SizedBox(width: 8),
          // Category chip (only enabled when sport is selected)
          FilterChip(
            label: Text(_categoryLabel()),
            selected: filters.categoryId != null,
            onSelected: filters.sportId == null ? null : (_) => _showCategoryPicker(context),
            avatar: filters.categoryId != null
                ? const Icon(Icons.check, size: 16)
                : const Icon(Icons.category, size: 16),
          ),
          const SizedBox(width: 8),
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
          const SizedBox(width: 8),
          // Venue chip
          FilterChip(
            label: Text(_venueLabel()),
            selected: filters.venueId != null,
            onSelected: (_) => _showVenuePicker(context),
            avatar: filters.venueId != null
                ? const Icon(Icons.check, size: 16)
                : const Icon(Icons.place_outlined, size: 16),
          ),
          if (_hasActiveFilters) ...[
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

  String _sportLabel() {
    if (filters.sportId == null) return 'Deporte';
    final sport = sports.cast<SportDto?>().firstWhere(
          (s) => s?.id == filters.sportId,
          orElse: () => null,
        );
    return sport?.name ?? 'Deporte';
  }

  String _categoryLabel() {
    if (filters.categoryId == null) return 'Categoría';
    final category = categories.cast<CategoryDto?>().firstWhere(
          (c) => c?.id == filters.categoryId,
          orElse: () => null,
        );
    return category?.name ?? 'Categoría';
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

  String _venueLabel() {
    if (filters.venueId == null) return 'Sede';
    final venue = venues.cast<VenueDto?>().firstWhere(
          (v) => v?.id == filters.venueId,
          orElse: () => null,
        );
    return venue?.name ?? 'Sede';
  }

  String _formatDate(DateTime d) =>
      '${d.day}/${d.month}/${d.year}';

  TournamentListFilters _mergeFilters({
    String? status,
    DateTime? startsAtFrom,
    String? sportId,
    String? categoryId,
    String? venueId,
    bool clearStatus = false,
    bool clearStartsAtFrom = false,
    bool clearSport = false,
    bool clearCategory = false,
    bool clearVenue = false,
  }) {
    return TournamentListFilters(
      status: clearStatus ? null : (status ?? filters.status),
      startsAtFrom: clearStartsAtFrom ? null : (startsAtFrom ?? filters.startsAtFrom),
      startsAtTo: filters.startsAtTo,
      venueId: clearVenue ? null : (venueId ?? filters.venueId),
      sportId: clearSport ? null : (sportId ?? filters.sportId),
      categoryId: clearCategory ? null : (categoryId ?? filters.categoryId),
    );
  }

  Future<void> _showSportPicker(BuildContext context) async {
    if (sports.isEmpty) return;
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Deporte'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, ''),
            child: const Text('Todos'),
          ),
          ...sports.map(
            (s) => SimpleDialogOption(
              onPressed: () => Navigator.pop(ctx, s.id),
              child: Text(s.name),
            ),
          ),
        ],
      ),
    );
    if (result == null) return;
    final newSportId = result.isEmpty ? null : result;
    final cleared = newSportId == null || newSportId != filters.sportId;
    onApply(_mergeFilters(
      sportId: newSportId,
      clearSport: cleared,
      clearCategory: cleared, // Category depends on sport
    ));
    if (newSportId != null && newSportId != filters.sportId) {
      onSportChanged?.call(newSportId);
    }
  }

  Future<void> _showCategoryPicker(BuildContext context) async {
    if (categories.isEmpty) return;
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Categoría'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, ''),
            child: const Text('Todas'),
          ),
          ...categories.map(
            (c) => SimpleDialogOption(
              onPressed: () => Navigator.pop(ctx, c.id),
              child: Text(c.name),
            ),
          ),
        ],
      ),
    );
    if (result == null) return;
    final newCategoryId = result.isEmpty ? null : result;
    onApply(_mergeFilters(
      categoryId: newCategoryId,
      clearCategory: newCategoryId == null,
    ));
  }

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
    onApply(_mergeFilters(
      status: result,
      clearStatus: result.isEmpty,
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
    onApply(_mergeFilters(startsAtFrom: picked));
  }

  Future<void> _showVenuePicker(BuildContext context) async {
    if (venues.isEmpty) return;
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Sede'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, ''),
            child: const Text('Todas'),
          ),
          ...venues.map(
            (v) => SimpleDialogOption(
              onPressed: () => Navigator.pop(ctx, v.id),
              child: Text(v.name),
            ),
          ),
        ],
      ),
    );
    if (result == null) return;
    final newVenueId = result.isEmpty ? null : result;
    final cleared = newVenueId == null || newVenueId != filters.venueId;
    onApply(_mergeFilters(venueId: newVenueId, clearVenue: cleared));
  }
}
