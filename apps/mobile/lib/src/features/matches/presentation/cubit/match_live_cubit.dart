import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/matches_repository.dart';
import 'match_live_state.dart';

class MatchLiveCubit extends Cubit<MatchLiveState> {
  MatchLiveCubit({
    required this.matchesRepository,
    required this.matchId,
  }) : super(const MatchLiveStateInitial());

  final MatchesRepository matchesRepository;
  final String matchId;

  Timer? _pollingTimer;
  Timer? _timerTimer;

  Future<void> load() async {
    try {
      emit(const MatchLiveStateLoading());

      final match = await matchesRepository.getMatchDetail(matchId);

      if (match == null) {
        emit(const MatchLiveStateNotFound());
        return;
      }

      emit(MatchLiveStateLoaded(
        match: match,
        elapsedSeconds: _calculateElapsedSeconds(match.scheduledAt),
      ));

      //? Iniciar polling cada 10 segundos para actualizaciones
      _startPolling();
      _startTimer();
    } catch (e) {
      emit(MatchLiveStateFailure(e.toString()));
    }
  }

  void _startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      if (state is MatchLiveStateLoaded) {
        try {
          final match = await matchesRepository.getMatchDetail(matchId);
          if (match != null && isClosed == false) {
            final currentState = state as MatchLiveStateLoaded;
            emit(currentState.copyWith(match: match));

            //? Si terminó, detener polling
            if (match.status == 'FINISHED') {
              _pollingTimer?.cancel();
              _timerTimer?.cancel();
            }
          }
        } catch (_) {
          // silencioso
        }
      }
    });
  }

  void _startTimer() {
    _timerTimer?.cancel();
    _timerTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (state is MatchLiveStateLoaded && isClosed == false) {
        final currentState = state as MatchLiveStateLoaded;
        emit(currentState.copyWith(
          elapsedSeconds: currentState.elapsedSeconds + 1,
        ));
      }
    });
  }

  int _calculateElapsedSeconds(DateTime? scheduledAt) {
    if (scheduledAt == null) return 0;
    return DateTime.now().difference(scheduledAt).inSeconds.clamp(0, 99999);
  }

  Future<void> endMatch() async {
    if (state is! MatchLiveStateLoaded) return;

    try {
      emit((state as MatchLiveStateLoaded).copyWith(submitting: true));

      //? El resultado se carga en ResultEntryScreen, aquí solo navegamos
      emit((state as MatchLiveStateLoaded).copyWith(
        submitting: false,
        shouldNavigateToResult: true,
      ));
    } catch (e) {
      emit((state as MatchLiveStateLoaded).copyWith(
        submitting: false,
        error: e.toString(),
      ));
    }
  }

  @override
  Future<void> close() {
    _pollingTimer?.cancel();
    _timerTimer?.cancel();
    return super.close();
  }
}
