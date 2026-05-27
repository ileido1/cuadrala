import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';

void main() {
  final Map<String, Object?> _baseJson = {
    'id': 'match-1',
    'sportId': 'sport-1',
    'categoryId': 'cat-1',
    'status': 'SCHEDULED',
    'scheduledAt': '2026-06-01T18:00:00.000Z',
    'pricePerPlayerCents': 1000,
    'maxParticipants': 4,
    'participantCount': 2,
    'openSpots': 2,
    'clubName': 'Club Test',
    'courtName': 'Court 1',
    'locationLabel': 'Buenos Aires',
  };

  group('OpenMatchDto.fromJson', () {
    group('participantPreview', () {
      test('parses correctly from JSON list with userId and displayName', () {
        final json = Map<String, Object?>.from(_baseJson)
          ..['participantPreview'] = [
            {'userId': 'user-1', 'displayName': 'Alice Smith'},
            {'userId': 'user-2', 'displayName': 'Bob Jones'},
          ];

        final dto = OpenMatchDto.fromJson(json);

        expect(dto.participantPreview.length, 2);
        expect(dto.participantPreview[0].userId, 'user-1');
        expect(dto.participantPreview[0].displayName, 'Alice Smith');
        expect(dto.participantPreview[1].userId, 'user-2');
        expect(dto.participantPreview[1].displayName, 'Bob Jones');
      });

      test('defaults to empty list when key is absent from JSON', () {
        final dto = OpenMatchDto.fromJson(_baseJson);

        expect(dto.participantPreview, isEmpty);
      });
    });

    group('affectsElo', () {
      test('defaults to true when key is absent from JSON', () {
        final dto = OpenMatchDto.fromJson(_baseJson);

        expect(dto.affectsElo, isTrue);
      });

      test('parses false when explicitly set', () {
        final json = Map<String, Object?>.from(_baseJson)
          ..['affectsElo'] = false;

        final dto = OpenMatchDto.fromJson(json);

        expect(dto.affectsElo, isFalse);
      });
    });

    group('venueImageUrl', () {
      test('is null when key is absent from JSON', () {
        final dto = OpenMatchDto.fromJson(_baseJson);

        expect(dto.venueImageUrl, isNull);
      });

      test('parses correctly when present', () {
        final json = Map<String, Object?>.from(_baseJson)
          ..['venueImageUrl'] = 'https://example.com/image.jpg';

        final dto = OpenMatchDto.fromJson(json);

        expect(dto.venueImageUrl, 'https://example.com/image.jpg');
      });
    });
  });
}
