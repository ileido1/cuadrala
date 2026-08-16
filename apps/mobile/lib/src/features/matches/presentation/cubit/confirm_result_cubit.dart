import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/matches_repository.dart';
import 'confirm_result_state.dart';

class ConfirmResultCubit extends Cubit<ConfirmResultState> {
  ConfirmResultCubit({
    required this.matchesRepository,
    required this.matchId,
  }) : super(const ConfirmResultStateInitial());

  final MatchesRepository matchesRepository;
  final String matchId;

  Future<void> load() async {
    try {
      emit(const ConfirmResultStateLoading());

      //? 1. Obtener detalles del partido
      final match = await matchesRepository.getMatchDetail(matchId);
      if (match == null) {
        emit(const ConfirmResultStateNotFound());
        return;
      }

      //? 2. Obtener el borrador de resultado (si existe)
      final draft = await matchesRepository.getMatchResultDraft(matchId);
      if (draft == null) {
        emit(const ConfirmResultStateNotFound());
        return;
      }

      emit(ConfirmResultStateLoaded(draft: draft));
    } catch (e) {
      emit(ConfirmResultStateFailure(e.toString()));
    }
  }

  Future<void> confirmResult() async {
    if (state is! ConfirmResultStateLoaded) return;

    try {
      emit((state as ConfirmResultStateLoaded).copyWith(submitting: true));

      final draft = (state as ConfirmResultStateLoaded).draft;

      //? Confirmar el resultado (POST a match/:id/result/confirm)
      await matchesRepository.confirmMatchResult(
        matchId: matchId,
        draftId: draft.id,
      );

      //? Marcar como completado para navegar
      emit((state as ConfirmResultStateLoaded).copyWith(
        submitting: false,
        completed: true,
      ));
    } catch (e) {
      emit((state as ConfirmResultStateLoaded).copyWith(
        submitting: false,
        error: e.toString(),
      ));
    }
  }

  Future<void> rejectResult() async {
    if (state is! ConfirmResultStateLoaded) return;

    try {
      emit((state as ConfirmResultStateLoaded).copyWith(submitting: true));

      final draft = (state as ConfirmResultStateLoaded).draft;

      //? Rechazar el resultado (DELETE /match/:id/result/draft/:draftId)
      await matchesRepository.rejectMatchResult(
        matchId: matchId,
        draftId: draft.id,
      );

      //? Volver a cargar para mostrar que fue rechazado
      await load();
    } catch (e) {
      emit((state as ConfirmResultStateLoaded).copyWith(
        submitting: false,
        error: e.toString(),
      ));
    }
  }
}
