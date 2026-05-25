import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/profile/data/profile_api.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/leaderboard_entry_dto.dart';

class _MockProfileApi extends Mock implements ProfileApi {}

void main() {
  group('ProfileRepository.getLeaderboard', () {
    late ProfileApi api;
    late ProfileRepository repository;

    setUp(() {
      api = _MockProfileApi();
      repository = ProfileRepository(profileApi: api);
    });

    test('UT-03: unwraps 5 items to typed list preserving server order', () async {
      when(
        () => api.getRatingsLeaderboardEnvelope(
          categoryId: 'cat-1',
          limit: 5,
        ),
      ).thenAnswer(
        (_) async => {
          'items': [
            {'rank': 1, 'userId': 'u1', 'displayName': 'Alice', 'rating': 1600.0},
            {'rank': 2, 'userId': 'u2', 'displayName': 'Bob', 'rating': 1550.0},
            {'rank': 3, 'userId': 'u3', 'displayName': 'Carlos', 'rating': 1500.0},
            {'rank': 4, 'userId': 'u4', 'displayName': 'Diana', 'rating': 1450.0},
            {'rank': 5, 'userId': 'u5', 'displayName': 'Eva', 'rating': 1400.0},
          ],
        },
      );

      final result = await repository.getLeaderboard('cat-1');

      expect(result, hasLength(5));
      expect(result.first, isA<LeaderboardEntryDto>());
      expect(result.first.rank, 1);
      expect(result.first.userId, 'u1');
      expect(result.first.displayName, 'Alice');
      expect(result.first.rating, 1600.0);
      expect(result.last.rank, 5);
      expect(result.last.userId, 'u5');
    });

    test('UT-04: returns empty list when items is empty', () async {
      when(
        () => api.getRatingsLeaderboardEnvelope(
          categoryId: 'cat-1',
          limit: 5,
        ),
      ).thenAnswer((_) async => {'items': <Object?>[]});

      final result = await repository.getLeaderboard('cat-1');

      expect(result, isEmpty);
    });

    test('throws AppFailure when items key is absent', () async {
      when(
        () => api.getRatingsLeaderboardEnvelope(
          categoryId: 'cat-1',
          limit: 5,
        ),
      ).thenAnswer((_) async => <String, Object?>{});

      expect(
        () => repository.getLeaderboard('cat-1'),
        throwsA(anything),
      );
    });
  });
}
