import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../catalog/data/catalog_repository.dart';
import '../../data/models/quick_match_search_dto.dart';
import '../../data/quick_match_repository.dart';
import 'quick_match_state.dart';

final class QuickMatchCubit extends Cubit<QuickMatchState> {
  QuickMatchCubit({
    required QuickMatchRepository repository,
    required CatalogRepository catalogRepository,
  }) : _repository = repository,
       _catalogRepository = catalogRepository,
       super(const QuickMatchInitial());

  final QuickMatchRepository _repository;
  final CatalogRepository _catalogRepository;

  Future<void> load() async {
    emit(const QuickMatchLoading());
    try {
      final search = await _repository.current();
      emit(search == null ? const QuickMatchIdle() : QuickMatchActive(search));
    } catch (_) {
      emit(const QuickMatchFailure('No pudimos cargar tu búsqueda.'));
    }
  }

  Future<void> start(Map<String, Object?> preferences) async {
    emit(const QuickMatchLoading());
    try {
      emit(QuickMatchActive(await _repository.start(preferences)));
    } catch (_) {
      emit(const QuickMatchFailure('No pudimos iniciar la búsqueda.'));
    }
  }

  Future<void> confirmProposal({QuickMatchVenueOptionDto? option}) async {
    try {
      emit(QuickMatchActive(await _repository.confirmProposal(option: option)));
    } catch (_) {
      emit(const QuickMatchFailure('La propuesta ya no está disponible.'));
    }
  }

  Future<void> dismissProposal() async {
    try {
      emit(QuickMatchActive(await _repository.dismissProposal()));
    } catch (_) {
      emit(const QuickMatchFailure('No pudimos descartar la propuesta.'));
    }
  }

  Future<void> cancel() async {
    await _repository.cancel();
    emit(const QuickMatchIdle());
  }

  Future<void> continueSearching() async {
    final current = state;
    if (current is! QuickMatchActive) return;
    final target = current.search.targetDate.toLocal();
    final today = DateTime.now();
    final date = DateTime(target.year, target.month, target.day);
    final todayDate = DateTime(today.year, today.month, today.day);
    final days = date.difference(todayDate).inDays;
    final body = <String, Object?>{
      'sportId': current.search.sportId,
      'categoryId': current.search.categoryId,
      'day': days == 0
          ? 'TODAY'
          : days == 1
          ? 'TOMORROW'
          : 'CUSTOM',
      if (days != 0 && days != 1)
        'date':
            '${target.year.toString().padLeft(4, '0')}-${target.month.toString().padLeft(2, '0')}-${target.day.toString().padLeft(2, '0')}',
      'slots': current.search.slots,
      'widenLevel': current.search.widenLevel,
      'zoneKm': current.search.zoneKm,
      'includeOpenMatches': current.search.includeOpenMatches,
    };
    await start(body);
  }

  Future<void> changeSchedule({
    required String day,
    required List<String> slots,
  }) async {
    final current = state;
    if (current is! QuickMatchActive) return;
    await start({
      'sportId': current.search.sportId,
      'categoryId': current.search.categoryId,
      'day': day,
      'slots': slots,
      'widenLevel': current.search.widenLevel,
      'zoneKm': current.search.zoneKm,
      'includeOpenMatches': current.search.includeOpenMatches,
    });
  }

  Future<void> expandZone() async {
    final current = state;
    if (current is! QuickMatchActive) return;
    final nextZone = (current.search.zoneKm + 10).clamp(10, 100);
    if (nextZone == current.search.zoneKm) return;
    final target = current.search.targetDate.toLocal();
    final today = DateTime.now();
    final targetDate = DateTime(target.year, target.month, target.day);
    final todayDate = DateTime(today.year, today.month, today.day);
    final days = targetDate.difference(todayDate).inDays;
    await start({
      'sportId': current.search.sportId,
      'categoryId': current.search.categoryId,
      'day': days == 0
          ? 'TODAY'
          : days == 1
          ? 'TOMORROW'
          : 'CUSTOM',
      if (days != 0 && days != 1)
        'date':
            '${target.year.toString().padLeft(4, '0')}-${target.month.toString().padLeft(2, '0')}-${target.day.toString().padLeft(2, '0')}',
      'slots': current.search.slots,
      'widenLevel': current.search.widenLevel,
      'zoneKm': nextZone,
      'includeOpenMatches': current.search.includeOpenMatches,
    });
  }

  Future<
    ({
      String sportId,
      String sportName,
      String categoryId,
      String categoryName,
    })?
  >
  defaultConfiguration() async {
    final sports = await _catalogRepository.listSports();
    if (sports.isEmpty) return null;
    final sport = sports.first;
    final categories = await _catalogRepository.listCategories(
      sportId: sport.id,
    );
    if (categories.isEmpty) return null;
    final category = categories.first;
    return (
      sportId: sport.id,
      sportName: sport.name,
      categoryId: category.id,
      categoryName: category.name,
    );
  }
}
