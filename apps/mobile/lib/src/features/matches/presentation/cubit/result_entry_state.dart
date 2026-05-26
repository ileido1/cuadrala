import 'package:equatable/equatable.dart';

import '../../data/models/match_detail_dto.dart';
import '../../domain/scoring/scoring_config.dart';
import '../../domain/scoring/set_score.dart';

final class ResultEntryState extends Equatable {
  const ResultEntryState({
    this.loading = true,
    this.submitting = false,
    this.submitted = false,
    this.error,
    this.match,
    this.scoringConfig,
    this.step = 0,
    this.teamA = const [],
    this.teamB = const [],
    this.sideByUserId = const {},
    this.sets = const [],
  });

  final bool loading;
  final bool submitting;
  final bool submitted;
  final String? error;
  final MatchDetailDto? match;
  final ScoringConfig? scoringConfig;
  final int step;
  final List<String> teamA;
  final List<String> teamB;
  final Map<String, String> sideByUserId;
  final List<SetScore> sets;

  List<String> get unassigned {
    if (match == null) return [];
    return match!.participants
        .map((p) => p.userId)
        .where((uid) => !teamA.contains(uid) && !teamB.contains(uid))
        .toList();
  }

  bool get isTeamAssignmentComplete => teamA.length == 2 && teamB.length == 2;

  bool get isSideSelectionComplete =>
      isTeamAssignmentComplete &&
      [...teamA, ...teamB].every(sideByUserId.containsKey);

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
      !loading && !submitting && isScoreEntryComplete && isTeamAssignmentComplete && isSideSelectionComplete;

  ResultEntryState copyWith({
    bool? loading,
    bool? submitting,
    bool? submitted,
    String? error,
    bool clearError = false,
    MatchDetailDto? match,
    ScoringConfig? scoringConfig,
    int? step,
    List<String>? teamA,
    List<String>? teamB,
    Map<String, String>? sideByUserId,
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
      teamA: teamA ?? this.teamA,
      teamB: teamB ?? this.teamB,
      sideByUserId: sideByUserId ?? this.sideByUserId,
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
        teamA,
        teamB,
        sideByUserId,
        sets,
      ];
}
