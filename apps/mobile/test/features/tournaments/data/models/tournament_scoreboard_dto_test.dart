import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_scoreboard_dto.dart';

void main() {
  Map<String, Object?> rowJsonSV({Map<String, Object?> extra = const {}}) => {
        'userId': 'user-1',
        'name': 'Ana',
        'points': 10,
        'gamesPlayed': 3,
        'gamesWon': 2,
        'gamesLost': 1,
        'gamesDrawn': 0,
        'pointsFor': 12,
        'pointsAgainst': 9,
        'difference': 3,
        'rank': 1,
        ...extra,
      };

  group('TournamentScoreboardRowDto', () {
    //? D5: la API manda `userId/name/points/gamesPlayed/gamesWon/rank`, no
    //? `teamId/teamName` — el DTO estaba desalineado con el contrato real.
    test('should read userId and name from the API contract', () {
      final row = TournamentScoreboardRowDto.fromJson(rowJsonSV());

      expect(row.userId, 'user-1');
      expect(row.name, 'Ana');
    });

    test('should read gamesPlayed, gamesWon and rank', () {
      final row = TournamentScoreboardRowDto.fromJson(rowJsonSV());

      expect(row.gamesPlayed, 3);
      expect(row.gamesWon, 2);
      expect(row.rank, 1);
    });

    test('should read loss, draw and point-difference metrics', () {
      final row = TournamentScoreboardRowDto.fromJson(rowJsonSV());

      expect(row.gamesLost, 1);
      expect(row.gamesDrawn, 0);
      expect(row.pointsFor, 12);
      expect(row.pointsAgainst, 9);
      expect(row.difference, 3);
    });

    test('should default numeric fields to 0 when the API omits them', () {
      final row = TournamentScoreboardRowDto.fromJson({
        'userId': 'user-1',
        'name': 'Ana',
      });

      expect(row.points, 0);
      expect(row.gamesPlayed, 0);
      expect(row.gamesWon, 0);
      expect(row.gamesLost, 0);
      expect(row.gamesDrawn, 0);
      expect(row.pointsFor, 0);
      expect(row.pointsAgainst, 0);
      expect(row.difference, 0);
      expect(row.rank, 0);
    });
  });
}
