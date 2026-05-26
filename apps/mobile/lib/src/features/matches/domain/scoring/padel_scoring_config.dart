import 'scoring_config.dart';
import 'set_score.dart';

final class PadelScoringConfig implements ScoringConfig {
  const PadelScoringConfig();

  static const int _regularGames = 6;
  static const int _tiebreakAt = 6;
  static const int _tiebreakGames = 7;

  @override
  String get sportCode => 'PADEL';

  @override
  int get maxSets => 3;

  @override
  int get setsToWin => 2;

  @override
  int get regularGamesPerSet => _regularGames;

  @override
  bool get hasTiebreak => true;

  @override
  int get tiebreakAt => _tiebreakAt;

  @override
  int get tiebreakGames => _tiebreakGames;

  @override
  bool isValidSetScore(int a, int b) {
    final high = a >= b ? a : b;
    final low = a >= b ? b : a;
    if (high < _regularGames) return false;
    if (high == _regularGames && low <= 4) return true;
    if (high == _tiebreakGames && low == _tiebreakAt) return true;
    return false;
  }

  @override
  bool isMatchOver(List<SetScore> sets) {
    int winsA = 0, winsB = 0;
    for (final s in sets) {
      if (s.teamA > s.teamB) {
        winsA++;
      } else {
        winsB++;
      }
    }
    return winsA >= setsToWin || winsB >= setsToWin;
  }

  @override
  int computePoints(List<SetScore> sets, int teamIndex) {
    int total = 0;
    for (final s in sets) {
      total += teamIndex == 0 ? s.teamA : s.teamB;
    }
    return total;
  }
}
