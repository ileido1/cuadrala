import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_scoreboard_dto.dart';

void main() {
  Map<String, Object?> rowJsonSV({Map<String, Object?> extra = const {}}) => {
        'userId': 'user-1',
        'name': 'Ana',
        'points': 10,
        'gamesPlayed': 3,
        'gamesWon': 2,
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

    test('should default numeric fields to 0 when the API omits them', () {
      final row = TournamentScoreboardRowDto.fromJson({
        'userId': 'user-1',
        'name': 'Ana',
      });

      expect(row.points, 0);
      expect(row.gamesPlayed, 0);
      expect(row.gamesWon, 0);
      expect(row.rank, 0);
    });
  });
}
