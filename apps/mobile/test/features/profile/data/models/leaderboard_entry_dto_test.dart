import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/profile/data/models/leaderboard_entry_dto.dart';

void main() {
  group('LeaderboardEntryDto', () {
    group('fromJson', () {
      test('UT-01: parses all fields with num coercion', () {
        final json = <String, Object?>{
          'rank': 1,
          'userId': 'abc',
          'displayName': 'Ana',
          'rating': 1542.5,
        };

        final dto = LeaderboardEntryDto.fromJson(json);

        expect(dto.rank, 1);
        expect(dto.userId, 'abc');
        expect(dto.displayName, 'Ana');
        expect(dto.rating, 1542.5);
      });

      test('UT-01b: coerces int rank and int rating to correct types', () {
        final json = <String, Object?>{
          'rank': 2,
          'userId': 'xyz',
          'displayName': 'Bob',
          'rating': 1300,
        };

        final dto = LeaderboardEntryDto.fromJson(json);

        expect(dto.rank, isA<int>());
        expect(dto.rating, isA<double>());
      });

      test('UT-02: throws when a required field is missing', () {
        final missingRank = <String, Object?>{
          'userId': 'abc',
          'displayName': 'Ana',
          'rating': 1542.5,
        };
        final missingUserId = <String, Object?>{
          'rank': 1,
          'displayName': 'Ana',
          'rating': 1542.5,
        };
        final missingDisplayName = <String, Object?>{
          'rank': 1,
          'userId': 'abc',
          'rating': 1542.5,
        };
        final missingRating = <String, Object?>{
          'rank': 1,
          'userId': 'abc',
          'displayName': 'Ana',
        };

        expect(() => LeaderboardEntryDto.fromJson(missingRank), throwsA(anything));
        expect(() => LeaderboardEntryDto.fromJson(missingUserId), throwsA(anything));
        expect(() => LeaderboardEntryDto.fromJson(missingDisplayName), throwsA(anything));
        expect(() => LeaderboardEntryDto.fromJson(missingRating), throwsA(anything));
      });
    });
  });
}
