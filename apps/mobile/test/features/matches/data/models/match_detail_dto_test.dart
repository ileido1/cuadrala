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

    //? S6: la API expone quién organiza; antes se asumía el primer
    //? participante, que deja de valer cuando el organizador sale y vuelve.
    group('organizer', () {
      final participantsJson = <Map<String, Object?>>[
        {'userId': 'first', 'joinedAt': '2026-05-01T10:00:00.000Z'},
        {'userId': 'second', 'joinedAt': '2026-05-01T11:00:00.000Z'},
      ];

      test('should use organizerUserId when the API sends it', () {
        final json = Map<String, Object?>.from(baseJson)
          ..['participants'] = participantsJson
          ..['organizerUserId'] = 'second';

        final dto = MatchDetailDto.fromJson(json);

        expect(dto.organizerUserId, 'second');
        expect(dto.resolvedOrganizerUserId, 'second');
        expect(dto.isOrganizer('second'), isTrue);
        expect(dto.isOrganizer('first'), isFalse);
      });

      test(
        'should fall back to the first participant when organizerUserId is absent',
        () {
          final json = Map<String, Object?>.from(baseJson)
            ..['participants'] = participantsJson;

          final dto = MatchDetailDto.fromJson(json);

          expect(dto.organizerUserId, isNull);
          expect(dto.resolvedOrganizerUserId, 'first');
          expect(dto.isOrganizer('first'), isTrue);
        },
      );

      test(
        'should have no organizer when there are no participants nor organizerUserId',
        () {
          final dto = MatchDetailDto.fromJson(baseJson);

          expect(dto.resolvedOrganizerUserId, isNull);
          expect(dto.isOrganizer(null), isFalse);
        },
      );
    });
  });
}
