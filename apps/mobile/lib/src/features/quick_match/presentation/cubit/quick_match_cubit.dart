import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/formatting/fx_price_labels.dart';
import '../../../../core/formatting/money_conversion.dart';
import '../../../catalog/data/catalog_repository.dart';
import '../../../catalog/data/models/category_dto.dart';
import '../../../catalog/data/models/sport_dto.dart';
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
      final results = await Future.wait([
        _repository.current(),
        loadExchangeRatesSafelySV(),
      ]);
      final search = results[0] as QuickMatchSearchDto?;
      final rates = results[1] as List<ExchangeRateRow>;
      emit(
        search == null
            ? const QuickMatchIdle()
            : QuickMatchActive(search, exchangeRates: rates),
      );
    } on AppFailure catch (e) {
      emit(QuickMatchFailure(e.message));
    } catch (_) {
      emit(const QuickMatchFailure('No pudimos cargar tu búsqueda.'));
    }
  }

  /// Re-fetches the current search without emitting [QuickMatchLoading],
  /// so periodic polling (see `_Searching` in `quick_match_screen.dart`)
  /// does not flash a spinner while the player is waiting. Failures are
  /// swallowed: the last known state stays on screen and the next poll
  /// tries again.
  Future<void> refreshSilently() async {
    try {
      final results = await Future.wait([
        _repository.current(),
        loadExchangeRatesSafelySV(),
      ]);
      if (isClosed) return;
      final search = results[0] as QuickMatchSearchDto?;
      final rates = results[1] as List<ExchangeRateRow>;
      emit(
        search == null
            ? const QuickMatchIdle()
            : QuickMatchActive(search, exchangeRates: rates),
      );
    } catch (_) {
      // Keep showing the last known state.
    }
  }

  Future<void> start(Map<String, Object?> preferences) async {
    emit(const QuickMatchLoading());
    try {
      final results = await Future.wait([
        _repository.start(preferences),
        loadExchangeRatesSafelySV(),
      ]);
      final search = results[0] as QuickMatchSearchDto;
      final rates = results[1] as List<ExchangeRateRow>;
      emit(QuickMatchActive(search, exchangeRates: rates));
    } on AppFailure catch (e) {
      emit(QuickMatchFailure(e.message));
    } catch (_) {
      emit(const QuickMatchFailure('No pudimos iniciar la búsqueda.'));
    }
  }

  Future<void> confirmProposal({QuickMatchVenueOptionDto? option}) async {
    try {
      emit(QuickMatchActive(await _repository.confirmProposal(option: option)));
    } on AppFailure catch (e) {
      emit(QuickMatchFailure(e.message));
    } catch (_) {
      emit(const QuickMatchFailure('La propuesta ya no está disponible.'));
    }
  }

  Future<void> dismissProposal() async {
    try {
      emit(QuickMatchActive(await _repository.dismissProposal()));
    } on AppFailure catch (e) {
      emit(QuickMatchFailure(e.message));
    } catch (_) {
      emit(const QuickMatchFailure('No pudimos descartar la propuesta.'));
    }
  }

  Future<void> cancel() async {
    try {
      await _repository.cancel();
      emit(const QuickMatchIdle());
    } on AppFailure catch (e) {
      emit(QuickMatchFailure(e.message));
    } catch (_) {
      emit(const QuickMatchFailure('No pudimos salir de la cola.'));
    }
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

  Future<QuickMatchConfiguration?> defaultConfiguration() async {
    final sports = await _catalogRepository.listSports();
    final options = <QuickMatchSportOption>[];
    for (final sport in sports) {
      final categories = await _catalogRepository.listCategories(
        sportId: sport.id,
      );
      if (categories.isNotEmpty) {
        options.add(
          QuickMatchSportOption(sport: sport, categories: categories),
        );
      }
    }
    return options.isEmpty ? null : QuickMatchConfiguration(options);
  }
}

final class QuickMatchConfiguration {
  const QuickMatchConfiguration(this.sports);

  final List<QuickMatchSportOption> sports;
}

final class QuickMatchSportOption {
  const QuickMatchSportOption({required this.sport, required this.categories});

  final SportDto sport;
  final List<CategoryDto> categories;
}
