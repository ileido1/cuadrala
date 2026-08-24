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
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
            width: 1,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quick filters row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _QuickFilterChip(
                  label: 'Abiertos',
                  icon: Icons.check_circle_outline,
                  selected: filters.status == 'REGISTRATION_OPEN',
                  onTap: () => _toggleStatus('REGISTRATION_OPEN'),
                ),
                const SizedBox(width: 8),
                _QuickFilterChip(
                  label: 'En curso',
                  icon: Icons.play_circle_outline,
                  selected: filters.status == 'IN_PROGRESS',
                  onTap: () => _toggleStatus('IN_PROGRESS'),
                ),
                const SizedBox(width: 8),
                _QuickFilterChip(
                  label: 'Esta semana',
                  icon: Icons.calendar_today,
                  selected: _isThisWeekFilter(),
                  onTap: () => _toggleThisWeek(),
                ),
                const SizedBox(width: 8),
                _QuickFilterChip(
                  label: 'Este mes',
                  icon: Icons.date_range,
                  selected: _isThisMonthFilter(),
                  onTap: () => _toggleThisMonth(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Advanced filters row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
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
          ),
        ],
      ),
    );
  }

  void _toggleStatus(String status) {
    if (filters.status == status) {
      onApply(_mergeFilters(status: null, clearStatus: true));
    } else {
      onApply(_mergeFilters(status: status));
    }
  }

  bool _isThisWeekFilter() {
    if (filters.startsAtFrom == null) return false;
    final now = DateTime.now();
    final weekStart = now.subtract(Duration(days: now.weekday - 1));
    final weekEnd = weekStart.add(const Duration(days: 7));
    return filters.startsAtFrom!.isAfter(weekStart) &&
        filters.startsAtFrom!.isBefore(weekEnd);
  }

  bool _isThisMonthFilter() {
    if (filters.startsAtFrom == null) return false;
    final now = DateTime.now();
    return filters.startsAtFrom!.year == now.year &&
        filters.startsAtFrom!.month == now.month;
  }

  void _toggleThisWeek() {
    if (_isThisWeekFilter()) {
      onApply(_mergeFilters(startsAtFrom: null, clearStartsAtFrom: true));
    } else {
      final now = DateTime.now();
      final weekStart = now.subtract(Duration(days: now.weekday - 1));
      final weekEnd = weekStart.add(const Duration(days: 7));
      onApply(_mergeFilters(
        startsAtFrom: weekStart,
        startsAtTo: weekEnd,
      ));
    }
  }

  void _toggleThisMonth() {
    if (_isThisMonthFilter()) {
      onApply(_mergeFilters(startsAtFrom: null, clearStartsAtFrom: true));
    } else {
      final now = DateTime.now();
      final monthStart = DateTime(now.year, now.month, 1);
      final monthEnd = DateTime(now.year, now.month + 1, 0);
      onApply(_mergeFilters(
        startsAtFrom: monthStart,
        startsAtTo: monthEnd,
      ));
    }
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

  String _venueLabel() {
    if (filters.venueId == null) return 'Sede';
    final venue = venues.cast<VenueDto?>().firstWhere(
          (v) => v?.id == filters.venueId,
          orElse: () => null,
        );
    return venue?.name ?? 'Sede';
  }

  TournamentListFilters _mergeFilters({
    String? status,
    DateTime? startsAtFrom,
    DateTime? startsAtTo,
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
      startsAtTo: startsAtTo ?? filters.startsAtTo,
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
      clearCategory: cleared,
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

final class _QuickFilterChip extends StatelessWidget {
  const _QuickFilterChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected
              ? theme.colorScheme.primaryContainer
              : theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? theme.colorScheme.primary
                : theme.colorScheme.outlineVariant,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: selected
                  ? theme.colorScheme.primary
                  : theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected
                    ? theme.colorScheme.primary
                    : theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
