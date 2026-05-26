import 'set_score.dart';

abstract interface class ScoringConfig {
  String get sportCode;
  int get maxSets;
  int get setsToWin;
  int get regularGamesPerSet;
  bool get hasTiebreak;
  int get tiebreakAt;
  int get tiebreakGames;

  bool isValidSetScore(int teamA, int teamB);
  bool isMatchOver(List<SetScore> sets);
  int computePoints(List<SetScore> sets, int teamIndex);
}
