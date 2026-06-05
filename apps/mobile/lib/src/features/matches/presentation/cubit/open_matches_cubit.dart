import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/formatting/fx_price_labels.dart';
import '../../../../core/formatting/money_conversion.dart';
import '../../data/matches_repository.dart';
import '../../data/models/open_match_dto.dart';
import 'open_matches_state.dart';

final class OpenMatchesCubit extends Cubit<OpenMatchesState> {
  OpenMatchesCubit({
    required MatchesRepository matchesRepository,
  })  : _matchesRepository = matchesRepository,
        super(const OpenMatchesInitial());

  final MatchesRepository _matchesRepository;
  static const _pageLimit = 50;

  Future<void> load() async {
    emit(const OpenMatchesLoading());
    try {
      final segment = _currentSegment();
      final results = await Future.wait([
        _matchesRepository.listMyMatchesSV(page: 1, limit: _pageLimit),
        loadExchangeRatesSafelySV(),
      ]);
      final page = results[0] as OpenMatchesPage;
      final rates = results[1] as List<ExchangeRateRow>;
      final visible = _applySegmentFilter(
        items: page.items,
        segment: segment,
      );
      emit(
        OpenMatchesLoaded(
          segment: segment,
          items: page.items,
          visibleItems: visible,
          page: page.page,
          limit: page.limit,
          total: page.total,
          isLoadingMore: false,
          hasReachedEnd: page.items.length >= page.total,
          exchangeRates: rates,
        ),
      );
    } catch (e) {
      final message =
          e is AppFailure ? e.message : 'No se pudo cargar el listado.';
      emit(OpenMatchesFailure(message: message));
    }
  }

  void setSegment(PartidasSegment segment) {
    final current = state;
    if (current is! OpenMatchesLoaded) return;
    final visible = _applySegmentFilter(items: current.items, segment: segment);
    emit(current.copyWith(segment: segment, visibleItems: visible));
  }

  Future<void> loadMore() async {
    final current = state;
    if (current is! OpenMatchesLoaded) return;
    if (current.isLoadingMore || current.hasReachedEnd) return;

    emit(current.copyWith(isLoadingMore: true));

    try {
      final nextPage = current.page + 1;
      final page = await _matchesRepository.listMyMatchesSV(
        page: nextPage,
        limit: current.limit,
      );
      final merged = [...current.items, ...page.items];
      final visible = _applySegmentFilter(
        items: merged,
        segment: current.segment,
      );
      emit(
        OpenMatchesLoaded(
          segment: current.segment,
          items: merged,
          visibleItems: visible,
          page: page.page,
          limit: page.limit,
          total: page.total,
          isLoadingMore: false,
          hasReachedEnd: merged.length >= page.total,
          exchangeRates: current.exchangeRates,
        ),
      );
    } catch (_) {
      emit(current.copyWith(isLoadingMore: false));
    }
  }

  PartidasSegment _currentSegment() {
    final current = state;
    if (current is OpenMatchesLoaded) return current.segment;
    return PartidasSegment.upcoming;
  }

  static List<OpenMatchDto> _applySegmentFilter({
    required List<OpenMatchDto> items,
    required PartidasSegment segment,
  }) {
    return items
        .where((m) => segment == PartidasSegment.upcoming
            ? _isUpcoming(m)
            : _isHistory(m))
        .toList();
  }

  static bool _isUpcoming(OpenMatchDto m) {
    final status = m.status.toUpperCase();
    if (status == 'FINISHED' || status == 'CANCELLED') return false;
    final scheduled = m.scheduledAt;
    if (scheduled == null) return true;
    return !scheduled.isBefore(DateTime.now().subtract(const Duration(hours: 2)));
  }

  static bool _isHistory(OpenMatchDto m) {
    final status = m.status.toUpperCase();
    if (status == 'FINISHED' || status == 'CANCELLED') return true;
    final scheduled = m.scheduledAt;
    if (scheduled == null) return false;
    return scheduled.isBefore(DateTime.now().subtract(const Duration(hours: 2)));
  }
}
