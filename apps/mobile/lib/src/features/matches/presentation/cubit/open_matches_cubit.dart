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
      final visible = _applyClientFilters(
        items: page.items,
        query: '',
        onlyToday: false,
      );
      emit(
        OpenMatchesLoaded(
          sportId: sportId,
          query: '',
          onlyToday: false,
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
      onlyToday: current.onlyToday,
    );
    emit(
      OpenMatchesLoaded(
        sportId: current.sportId,
        query: q,
        onlyToday: current.onlyToday,
        categoryId: current.categoryId,
        items: current.items,
        visibleItems: visible,
        page: current.page,
        limit: current.limit,
        total: current.total,
        isLoadingMore: current.isLoadingMore,
        hasReachedEnd: current.hasReachedEnd,
      ),
    );
  }

  void toggleOnlyToday() {
    final current = state;
    if (current is! OpenMatchesLoaded) return;
    final onlyToday = !current.onlyToday;
    final visible = _applyClientFilters(
      items: current.items,
      query: current.query,
      onlyToday: onlyToday,
    );
    emit(
      OpenMatchesLoaded(
        sportId: current.sportId,
        query: current.query,
        onlyToday: onlyToday,
        categoryId: current.categoryId,
        items: current.items,
        visibleItems: visible,
        page: current.page,
        limit: current.limit,
        total: current.total,
        isLoadingMore: current.isLoadingMore,
        hasReachedEnd: current.hasReachedEnd,
      ),
    );
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
        onlyToday: current.onlyToday,
      );
      emit(
        OpenMatchesLoaded(
          sportId: current.sportId,
          query: current.query,
          onlyToday: current.onlyToday,
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

    emit(
      OpenMatchesLoaded(
        sportId: current.sportId,
        query: current.query,
        onlyToday: current.onlyToday,
        categoryId: current.categoryId,
        items: current.items,
        visibleItems: current.visibleItems,
        page: current.page,
        limit: current.limit,
        total: current.total,
        isLoadingMore: true,
        hasReachedEnd: current.hasReachedEnd,
      ),
    );

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
        onlyToday: current.onlyToday,
      );
      emit(
        OpenMatchesLoaded(
          sportId: current.sportId,
          query: current.query,
          onlyToday: current.onlyToday,
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
      emit(
        OpenMatchesLoaded(
          sportId: current.sportId,
          query: current.query,
          onlyToday: current.onlyToday,
          categoryId: current.categoryId,
          items: current.items,
          visibleItems: current.visibleItems,
          page: current.page,
          limit: current.limit,
          total: current.total,
          isLoadingMore: false,
          hasReachedEnd: current.hasReachedEnd,
        ),
      );
    }
  }

  static List<OpenMatchDto> _applyClientFilters({
    required List<OpenMatchDto> items,
    required String query,
    required bool onlyToday,
  }) {
    final q = query.toLowerCase();
    final now = DateTime.now();

    bool sameDay(DateTime a, DateTime b) =>
        a.year == b.year && a.month == b.month && a.day == b.day;

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

    bool matchesToday(OpenMatchDto m) {
      if (!onlyToday) return true;
      final s = m.scheduledAt;
      if (s == null) return false;
      return sameDay(s.toLocal(), now);
    }

    return items.where((m) => matchesQuery(m) && matchesToday(m)).toList();
  }
}
