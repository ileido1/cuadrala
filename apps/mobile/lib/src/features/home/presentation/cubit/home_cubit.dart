import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../matches/data/matches_repository.dart';
import '../../../profile/data/profile_repository.dart';
import 'home_state.dart';

final class HomeCubit extends Cubit<HomeState> {
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
      final page = await _matchesRepository.listOpenMatches(
        sportId: sportId,
        page: 1,
        limit: 20,
      );

      emit(
        HomeLoaded(
          greetingName: _firstName(me.name),
          sportId: sportId,
          openMatches: page.items,
        ),
      );
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudo cargar el inicio.';
      emit(HomeFailure(message: message));
    }
  }

  String _firstName(String fullName) {
    final trimmed = fullName.trim();
    if (trimmed.isEmpty) return 'Jugador';
    return trimmed.split(RegExp(r'\s+')).first;
  }
}
