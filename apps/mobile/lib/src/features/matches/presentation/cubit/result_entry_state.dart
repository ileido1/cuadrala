import 'package:equatable/equatable.dart';

import '../../data/models/match_detail_dto.dart';
import '../../domain/scoring/scoring_config.dart';
import '../../domain/scoring/set_score.dart';

enum CourtPosition { teamADrive, teamAReves, teamBDrive, teamBReves }

final class ResultEntryState extends Equatable {
  const ResultEntryState({
    this.loading = true,
    this.submitting = false,
    this.submitted = false,
    this.error,
    this.match,
    this.scoringConfig,
    this.step = 0,
    this.courtPositions = const {},
    this.sets = const [],
  });

  final bool loading;
  final bool submitting;
  final bool submitted;
  final String? error;
  final MatchDetailDto? match;
  final ScoringConfig? scoringConfig;
  final int step;
  final Map<CourtPosition, String> courtPositions;
  final List<SetScore> sets;

  // ---------------------------------------------------------------------------
  // Derived getters (backward-compatible with submit())
  // ---------------------------------------------------------------------------

  List<String> get teamA => courtPositions.entries
      .where(
        (e) =>
            e.key == CourtPosition.teamADrive ||
            e.key == CourtPosition.teamAReves,
      )
      .map((e) => e.value)
      .toList();

  List<String> get teamB => courtPositions.entries
      .where(
        (e) =>
            e.key == CourtPosition.teamBDrive ||
            e.key == CourtPosition.teamBReves,
      )
      .map((e) => e.value)
      .toList();

  Map<String, String> get sideByUserId => courtPositions.map(
        (pos, uid) => MapEntry(uid, pos.name.contains('Drive') ? 'DRIVE' : 'REVES'),
      );

  bool get isCourtComplete => courtPositions.length == 4;

  // ---------------------------------------------------------------------------
  // Remaining getters
  // ---------------------------------------------------------------------------

  List<String> get unassigned {
    if (match == null) return [];
    return match!.participants
        .map((p) => p.userId)
        .where((uid) => !courtPositions.values.contains(uid))
        .toList();
  }

  bool get isScoreEntryComplete =>
      scoringConfig != null &&
      sets.isNotEmpty &&
      scoringConfig!.isMatchOver(sets);

  int? get winnerTeamIndex {
    if (scoringConfig == null || !isScoreEntryComplete) return null;
    int wA = 0, wB = 0;
    for (final s in sets) {
      if (s.teamA > s.teamB) {
        wA++;
      } else {
        wB++;
      }
    }
    if (wA >= scoringConfig!.setsToWin) return 0;
    if (wB >= scoringConfig!.setsToWin) return 1;
    return null;
  }

  bool get canSubmit =>
      !loading && !submitting && !submitted && isScoreEntryComplete && isCourtComplete;

  ResultEntryState copyWith({
    bool? loading,
    bool? submitting,
    bool? submitted,
    String? error,
    bool clearError = false,
    MatchDetailDto? match,
    ScoringConfig? scoringConfig,
    int? step,
    Map<CourtPosition, String>? courtPositions,
    List<SetScore>? sets,
  }) {
    return ResultEntryState(
      loading: loading ?? this.loading,
      submitting: submitting ?? this.submitting,
      submitted: submitted ?? this.submitted,
      error: clearError ? null : (error ?? this.error),
      match: match ?? this.match,
      scoringConfig: scoringConfig ?? this.scoringConfig,
      step: step ?? this.step,
      courtPositions: courtPositions ?? this.courtPositions,
      sets: sets ?? this.sets,
    );
  }

  @override
  List<Object?> get props => [
        loading,
        submitting,
        submitted,
        error,
        match,
        scoringConfig,
        step,
        courtPositions,
        sets,
      ];
}
