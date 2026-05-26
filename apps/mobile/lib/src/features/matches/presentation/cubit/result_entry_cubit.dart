import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../catalog/data/catalog_repository.dart';
import '../../data/matches_repository.dart';
import '../../domain/scoring/scoring_registry.dart';
import '../../domain/scoring/set_score.dart';
import 'result_entry_state.dart';

final class ResultEntryCubit extends Cubit<ResultEntryState> {
  ResultEntryCubit({
    required MatchesRepository matchesRepository,
    required CatalogRepository catalogRepository,
    required String matchId,
  })  : _matchesRepository = matchesRepository,
        _catalogRepository = catalogRepository,
        _matchId = matchId,
        super(const ResultEntryState());

  final MatchesRepository _matchesRepository;
  final CatalogRepository _catalogRepository;
  final String _matchId;

  Future<void> load() async {
    try {
      final match = await _matchesRepository.getMatchById(_matchId);
      final sports = await _catalogRepository.listSports();
      final sport = sports.firstWhere((s) => s.id == match.sportId);
      final scoringConfig = ScoringRegistry.forCode(sport.code);
      emit(
        state.copyWith(
          loading: false,
          match: match,
          scoringConfig: scoringConfig,
          clearError: true,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          loading: false,
          error: e.toString(),
        ),
      );
    }
  }

  void assignToPosition(CourtPosition pos, String userId) {
    final updated = Map<CourtPosition, String>.from(state.courtPositions);
    // If player already placed elsewhere, remove first (re-drag support)
    updated.removeWhere((_, v) => v == userId);
    // Only assign if slot is still empty after removal
    if (!updated.containsKey(pos)) {
      updated[pos] = userId;
    }
    emit(state.copyWith(courtPositions: updated));
  }

  void removeFromPosition(CourtPosition pos) {
    if (!state.courtPositions.containsKey(pos)) return;
    final updated = Map<CourtPosition, String>.from(state.courtPositions);
    updated.remove(pos);
    emit(state.copyWith(courtPositions: updated));
  }

  void addSet(SetScore set) {
    if (state.scoringConfig == null) return;
    if (!state.scoringConfig!.isValidSetScore(set.teamA, set.teamB)) return;
    if (state.scoringConfig!.isMatchOver(state.sets)) return;
    final updated = List<SetScore>.from(state.sets)..add(set);
    emit(state.copyWith(sets: updated));
  }

  void removeLastSet() {
    if (state.sets.isEmpty) return;
    final updated = List<SetScore>.from(state.sets)..removeLast();
    emit(state.copyWith(sets: updated));
  }

  void nextStep() {
    final current = state.step;
    if (current >= 2) return;

    final canAdvance = switch (current) {
      0 => state.isCourtComplete,
      1 => state.isScoreEntryComplete,
      _ => false,
    };

    if (!canAdvance) return;
    emit(state.copyWith(step: current + 1));
  }

  void prevStep() {
    if (state.step <= 0) return;
    emit(state.copyWith(step: state.step - 1));
  }

  Future<void> submit() async {
    if (!state.canSubmit) return;
    if (state.scoringConfig == null) return;

    emit(state.copyWith(submitting: true, clearError: true));

    try {
      final teamAPoints = state.scoringConfig!.computePoints(state.sets, 0);
      final teamBPoints = state.scoringConfig!.computePoints(state.sets, 1);
      final scores = <Map<String, Object?>>[
        for (final uid in state.teamA) {'userId': uid, 'points': teamAPoints},
        for (final uid in state.teamB) {'userId': uid, 'points': teamBPoints},
      ];
      final teams = <Map<String, Object?>>[
        {'label': 'A', 'userIds': state.teamA},
        {'label': 'B', 'userIds': state.teamB},
      ];
      final sets = state.sets
          .map((s) => <String, Object?>{'teamA': s.teamA, 'teamB': s.teamB})
          .toList();
      final sideByUserId = Map<String, String>.from(state.sideByUserId);

      await _matchesRepository.upsertResultDraft(
        matchId: _matchId,
        scores: scores,
        teams: teams,
        sets: sets,
        sideByUserId: sideByUserId,
      );

      emit(state.copyWith(submitting: false, submitted: true));
    } catch (e) {
      emit(
        state.copyWith(
          submitting: false,
          error: e.toString(),
        ),
      );
    }
  }
}
