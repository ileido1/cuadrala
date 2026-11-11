import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/formatting/fx_price_labels.dart';
import '../../../../core/formatting/money_conversion.dart';
import '../../../matches/data/matches_repository.dart';
import '../../../matches/data/models/open_match_dto.dart';
import '../../../matches/domain/match_time_filters.dart';
import '../../../profile/data/profile_repository.dart';
import 'home_state.dart';

class HomeCubit extends Cubit<HomeState> {
  HomeCubit({
    required ProfileRepository profileRepository,
    required MatchesRepository matchesRepository,
  })  : _profileRepository = profileRepository,
        _matchesRepository = matchesRepository,
        super(const HomeInitial());

  final ProfileRepository _profileRepository;
  final MatchesRepository _matchesRepository;

  Future<void> load() async {
    emit(const HomeLoading());
    try {
      final me = await _profileRepository.getMe();
      final sportId = await _matchesRepository.resolveDefaultSportId();

      // Run both match list calls in parallel. If myMatches fails we degrade
      // gracefully to an empty list rather than failing the whole home screen.
      final results = await Future.wait([
        _matchesRepository.listOpenMatches(
          sportId: sportId,
          page: 1,
          limit: 20,
        ),
        _safeListMyMatches(),
        loadExchangeRatesSafelySV(),
      ]);

      final openMatchesPage = results[0] as OpenMatchesPage;
      final myMatchesResult = results[1] as ({OpenMatchesPage page, bool failed});
      final exchangeRates = results[2] as List<ExchangeRateRow>;

      final rating = me.primaryRating;

      // La pantalla puede cerrarse mientras se carga (CUADRALA-MOBILE-6).
      if (isClosed) return;
      emit(
        HomeLoaded(
          greetingName: _firstName(me.name),
          sportId: sportId,
          openMatches: openMatchesPage.items,
          myMatches: _upcomingSorted(myMatchesResult.page.items),
          levelCategory: rating?.categoryName,
          levelElo: rating?.rating.round(),
          exchangeRates: exchangeRates,
          myMatchesLoadFailed: myMatchesResult.failed,
        ),
      );
    } catch (e) {
      if (isClosed) return;
      final message = e is AppFailure ? e.message : 'No se pudo cargar el inicio.';
      emit(HomeFailure(message: message));
    }
  }

  /// Solo las partidas "próximas" (oculta las vencidas hace más de 2h y las
  /// FINISHED/CANCELLED), ordenadas por cercanía ascendente con las sin fecha
  /// al final. El widget se queda con las primeras 2.
  static List<OpenMatchDto> _upcomingSorted(List<OpenMatchDto> items) {
    return items.where(isUpcomingMatch).toList()
      ..sort(byScheduledAtAscNullsLast);
  }

  /// Calls [listMyMatchesSV] and degrades to an empty page with `failed: true`
  /// on any error, rather than failing the whole home screen.
  Future<({OpenMatchesPage page, bool failed})> _safeListMyMatches() async {
    try {
      final page = await _matchesRepository.listMyMatchesSV(
        page: 1,
        limit: 20,
      );
      return (page: page, failed: false);
    } catch (_) {
      return (
        page: const OpenMatchesPage(items: [], page: 1, limit: 20, total: 0),
        failed: true,
      );
    }
  }

  String _firstName(String fullName) {
    final trimmed = fullName.trim();
    if (trimmed.isEmpty) return 'Jugador';
    return trimmed.split(RegExp(r'\s+')).first;
  }
}
