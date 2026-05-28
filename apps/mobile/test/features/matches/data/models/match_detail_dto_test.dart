import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';

void main() {
  final Map<String, Object?> baseJson = {
    'id': 'match-1',
    'sportId': 'sport-1',
    'categoryId': 'cat-1',
    'type': 'OPEN',
    'status': 'SCHEDULED',
    'scheduledAt': '2026-06-01T18:00:00.000Z',
    'pricePerPlayerCents': 1000,
    'maxParticipants': 4,
    'participantCount': 2,
    'openSpots': 2,
    'clubName': 'Club Test',
    'courtName': 'Court 1',
    'locationLabel': 'Buenos Aires',
    'participants': <Map<String, Object?>>[],
    'createdAt': '2026-05-01T10:00:00.000Z',
    'updatedAt': '2026-05-01T10:00:00.000Z',
  };

  group('MatchDetailDto.fromJson', () {
    group('affectsElo', () {
      test('defaults to true when key is absent from JSON', () {
        final dto = MatchDetailDto.fromJson(baseJson);

        expect(dto.affectsElo, isTrue);
      });

      test('parses false when explicitly set', () {
        final json = Map<String, Object?>.from(baseJson)
          ..['affectsElo'] = false;

        final dto = MatchDetailDto.fromJson(json);

        expect(dto.affectsElo, isFalse);
      });
    });
  });
}
