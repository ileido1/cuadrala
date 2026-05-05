import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../profile/data/profile_repository.dart';
import '../../data/matches_repository.dart';
import 'match_detail_state.dart';

final class MatchDetailCubit extends Cubit<MatchDetailState> {
  MatchDetailCubit({
    required MatchesRepository matchesRepository,
    required ProfileRepository profileRepository,
    required String matchId,
  })  : _matchesRepository = matchesRepository,
        _profileRepository = profileRepository,
        _matchId = matchId,
        super(const MatchDetailInitial());

  final MatchesRepository _matchesRepository;
  final ProfileRepository _profileRepository;
  final String _matchId;
  String? _viewerUserId;

  Future<void> load() async {
    emit(const MatchDetailLoading());
    try {
      final me = await _profileRepository.getMe();
      _viewerUserId = me.id;
      final match = await _matchesRepository.getMatchById(_matchId);
      emit(
        MatchDetailLoaded(
          match: match,
          viewerUserId: _viewerUserId!,
        ),
      );
    } catch (e) {
      if (e is AppFailure && e.code == 'HTTP_404') {
        emit(const MatchDetailNotFound());
        return;
      }
      final message =
          e is AppFailure ? e.message : 'No se pudo cargar el detalle.';
      emit(MatchDetailFailure(message: message));
    }
  }

  Future<void> join() async {
    final current = state;
    if (current is! MatchDetailLoaded) return;
    if (current.actionLoading) return;

    emit(
      MatchDetailLoaded(
        match: current.match,
        viewerUserId: current.viewerUserId,
        actionLoading: true,
      ),
    );

    try {
      await _matchesRepository.joinMatch(_matchId);
      final match = await _matchesRepository.getMatchById(_matchId);
      emit(
        MatchDetailLoaded(
          match: match,
          viewerUserId: current.viewerUserId,
          actionLoading: false,
          actionMessage: 'Te uniste a la partida.',
        ),
      );
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudo unir.';
      emit(
        MatchDetailLoaded(
          match: current.match,
          viewerUserId: current.viewerUserId,
          actionLoading: false,
          actionMessage: message,
        ),
      );
    }
  }

  Future<void> leave() async {
    final current = state;
    if (current is! MatchDetailLoaded) return;
    if (current.actionLoading) return;

    emit(
      MatchDetailLoaded(
        match: current.match,
        viewerUserId: current.viewerUserId,
        actionLoading: true,
      ),
    );

    try {
      await _matchesRepository.leaveMatch(_matchId);
      final match = await _matchesRepository.getMatchById(_matchId);
      emit(
        MatchDetailLoaded(
          match: match,
          viewerUserId: current.viewerUserId,
          actionLoading: false,
          actionMessage: 'Saliste de la partida.',
        ),
      );
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudo salir.';
      emit(
        MatchDetailLoaded(
          match: current.match,
          viewerUserId: current.viewerUserId,
          actionLoading: false,
          actionMessage: message,
        ),
      );
    }
  }
}
