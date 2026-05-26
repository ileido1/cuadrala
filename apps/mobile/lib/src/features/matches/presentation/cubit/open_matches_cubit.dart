import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/matches_repository.dart';
import '../../data/models/open_match_dto.dart';
import 'open_matches_state.dart';

final class OpenMatchesCubit extends Cubit<OpenMatchesState> {
  OpenMatchesCubit({required MatchesRepository matchesRepository})
      : _matchesRepository = matchesRepository,
        super(const OpenMatchesInitial());

  final MatchesRepository _matchesRepository;
  static const _pageLimit = 20;

  Future<void> load() async {
    emit(const OpenMatchesLoading());
    try {
      final sportId = await _matchesRepository.resolveDefaultSportId();
      final page = await _matchesRepository.listOpenMatches(
        sportId: sportId,
        page: 1,
        limit: _pageLimit,
      );
      final today = DateTime.now();
      final selectedDate = DateTime(today.year, today.month, today.day);
      final visible = _applyClientFilters(
        items: page.items,
        query: '',
        selectedDate: selectedDate,
        activeTimeBuckets: const {},
        onlyAvailable: false,
      );
      emit(
        OpenMatchesLoaded(
          sportId: sportId,
          query: '',
          selectedDate: selectedDate,
          activeTimeBuckets: const {},
          onlyAvailable: false,
          categoryId: null,
          items: page.items,
          visibleItems: visible,
          page: page.page,
          limit: page.limit,
          total: page.total,
          isLoadingMore: false,
          hasReachedEnd: page.items.length >= page.total,
        ),
      );
    } catch (e) {
      final message =
          e is AppFailure ? e.message : 'No se pudo cargar el listado.';
      emit(OpenMatchesFailure(message: message));
    }
  }

  void setQuery(String value) {
    final current = state;
    if (current is! OpenMatchesLoaded) return;
    final q = value.trim();
    final visible = _applyClientFilters(
      items: current.items,
      query: q,
      selectedDate: current.selectedDate,
      activeTimeBuckets: current.activeTimeBuckets,
      onlyAvailable: current.onlyAvailable,
    );
    emit(current.copyWith(query: q, visibleItems: visible));
  }

  void selectDate(DateTime? date) {
    final current = state;
    if (current is! OpenMatchesLoaded) return;
    final normalized = date != null ? DateTime(date.year, date.month, date.day) : null;
    final visible = _applyClientFilters(
      items: current.items,
      query: current.query,
      selectedDate: normalized,
      activeTimeBuckets: current.activeTimeBuckets,
      onlyAvailable: current.onlyAvailable,
    );
    emit(current.copyWith(selectedDate: normalized, visibleItems: visible));
  }

  void toggleTimeBucket(TimeBucket bucket) {
    final current = state;
    if (current is! OpenMatchesLoaded) return;
    final updated = Set<TimeBucket>.from(current.activeTimeBuckets);
    if (updated.contains(bucket)) {
      updated.remove(bucket);
    } else {
      updated.add(bucket);
    }
    final visible = _applyClientFilters(
      items: current.items,
      query: current.query,
      selectedDate: current.selectedDate,
      activeTimeBuckets: updated,
      onlyAvailable: current.onlyAvailable,
    );
    emit(current.copyWith(activeTimeBuckets: updated, visibleItems: visible));
  }

  void setOnlyAvailable(bool value) {
    final current = state;
    if (current is! OpenMatchesLoaded) return;
    final visible = _applyClientFilters(
      items: current.items,
      query: current.query,
      selectedDate: current.selectedDate,
      activeTimeBuckets: current.activeTimeBuckets,
      onlyAvailable: value,
    );
    emit(current.copyWith(onlyAvailable: value, visibleItems: visible));
  }

  Future<void> setCategoryId(String? categoryId) async {
    final current = state;
    if (current is! OpenMatchesLoaded) return;
    emit(const OpenMatchesLoading());
    try {
      final page = await _matchesRepository.listOpenMatches(
        sportId: current.sportId,
        page: 1,
        limit: current.limit,
        categoryId: categoryId,
      );
      final visible = _applyClientFilters(
        items: page.items,
        query: current.query,
        selectedDate: current.selectedDate,
        activeTimeBuckets: current.activeTimeBuckets,
        onlyAvailable: current.onlyAvailable,
      );
      emit(
        OpenMatchesLoaded(
          sportId: current.sportId,
          query: current.query,
          selectedDate: current.selectedDate,
          activeTimeBuckets: current.activeTimeBuckets,
          onlyAvailable: current.onlyAvailable,
          categoryId: categoryId,
          items: page.items,
          visibleItems: visible,
          page: page.page,
          limit: page.limit,
          total: page.total,
          isLoadingMore: false,
          hasReachedEnd: page.items.length >= page.total,
        ),
      );
    } catch (e) {
      final message =
          e is AppFailure ? e.message : 'No se pudo cargar el listado.';
      emit(OpenMatchesFailure(message: message));
    }
  }

  Future<void> loadMore() async {
    final current = state;
    if (current is! OpenMatchesLoaded) return;
    if (current.isLoadingMore || current.hasReachedEnd) return;

    emit(current.copyWith(isLoadingMore: true));

    try {
      final nextPage = current.page + 1;
      final page = await _matchesRepository.listOpenMatches(
        sportId: current.sportId,
        page: nextPage,
        limit: current.limit,
        categoryId: current.categoryId,
      );
      final merged = [...current.items, ...page.items];
      final visible = _applyClientFilters(
        items: merged,
        query: current.query,
        selectedDate: current.selectedDate,
        activeTimeBuckets: current.activeTimeBuckets,
        onlyAvailable: current.onlyAvailable,
      );
      emit(
        OpenMatchesLoaded(
          sportId: current.sportId,
          query: current.query,
          selectedDate: current.selectedDate,
          activeTimeBuckets: current.activeTimeBuckets,
          onlyAvailable: current.onlyAvailable,
          categoryId: current.categoryId,
          items: merged,
          visibleItems: visible,
          page: page.page,
          limit: page.limit,
          total: page.total,
          isLoadingMore: false,
          hasReachedEnd: merged.length >= page.total,
        ),
      );
    } catch (e) {
      emit(current.copyWith(isLoadingMore: false));
    }
  }

  static List<OpenMatchDto> _applyClientFilters({
    required List<OpenMatchDto> items,
    required String query,
    required DateTime? selectedDate,
    required Set<TimeBucket> activeTimeBuckets,
    required bool onlyAvailable,
  }) {
    final q = query.toLowerCase();

    bool sameDay(DateTime a, DateTime b) =>
        a.year == b.year && a.month == b.month && a.day == b.day;

    TimeBucket bucketFor(DateTime dt) {
      if (dt.hour < 12) return TimeBucket.morning;
      if (dt.hour < 19) return TimeBucket.afternoon;
      return TimeBucket.evening;
    }

    bool matchesQuery(OpenMatchDto m) {
      if (q.isEmpty) return true;
      final haystack = [
        m.clubName,
        m.courtName,
        m.locationLabel,
        m.id,
      ].whereType<String>().join(' ').toLowerCase();
      return haystack.contains(q);
    }

    bool matchesDate(OpenMatchDto m) {
      if (selectedDate == null) return true;
      final s = m.scheduledAt;
      if (s == null) return true;
      return sameDay(s.toLocal(), selectedDate);
    }

    bool matchesTimeBucket(OpenMatchDto m) {
      if (activeTimeBuckets.isEmpty) return true;
      final s = m.scheduledAt;
      if (s == null) return true;
      return activeTimeBuckets.contains(bucketFor(s.toLocal()));
    }

    bool matchesAvailability(OpenMatchDto m) {
      if (!onlyAvailable) return true;
      return m.openSpots > 0;
    }

    return items
        .where((m) =>
            matchesQuery(m) &&
            matchesDate(m) &&
            matchesTimeBucket(m) &&
            matchesAvailability(m))
        .toList();
  }
}
