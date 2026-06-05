import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/formatting/fx_price_labels.dart';
import '../../../../core/formatting/money_conversion.dart';
import '../../../matches/data/matches_repository.dart';
import '../../../matches/data/models/open_match_dto.dart';
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
      final myMatchesPage = results[1] as OpenMatchesPage;
      final exchangeRates = results[2] as List<ExchangeRateRow>;

      final rating = me.primaryRating;

      emit(
        HomeLoaded(
          greetingName: _firstName(me.name),
          sportId: sportId,
          openMatches: openMatchesPage.items,
          myMatches: myMatchesPage.items,
          levelCategory: rating?.categoryName,
          levelElo: rating?.rating.round(),
          exchangeRates: exchangeRates,
        ),
      );
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudo cargar el inicio.';
      emit(HomeFailure(message: message));
    }
  }

  /// Calls [listMyMatchesSV] and silently returns an empty page on any error.
  Future<OpenMatchesPage> _safeListMyMatches() async {
    try {
      return await _matchesRepository.listMyMatchesSV(page: 1, limit: 20);
    } catch (_) {
      return const OpenMatchesPage(items: [], page: 1, limit: 20, total: 0);
    }
  }

  String _firstName(String fullName) {
    final trimmed = fullName.trim();
    if (trimmed.isEmpty) return 'Jugador';
    return trimmed.split(RegExp(r'\s+')).first;
  }
}
