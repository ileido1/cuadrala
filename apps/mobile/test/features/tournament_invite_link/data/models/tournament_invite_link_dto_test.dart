import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournament_invite_link/data/models/tournament_invite_link_dto.dart';

void main() {
  group('TournamentInviteLinkRegistrantDto', () {
    test('fromJson maps all fields', () {
      final dto = TournamentInviteLinkRegistrantDto.fromJson({
        'registrationId': 'reg-1',
        'type': 'GUEST',
        'displayName': 'Juan Pérez',
        'registeredAt': '2026-01-15T10:00:00.000Z',
      });

      expect(dto.registrationId, 'reg-1');
      expect(dto.type, 'GUEST');
      expect(dto.displayName, 'Juan Pérez');
      expect(dto.registeredAt, DateTime.parse('2026-01-15T10:00:00.000Z'));
    });

    test('toJson round-trips through fromJson', () {
      final dto = TournamentInviteLinkRegistrantDto.fromJson({
        'registrationId': 'reg-1',
        'type': 'AUTHENTICATED',
        'displayName': 'María',
        'registeredAt': '2026-01-15T10:00:00.000Z',
      });

      final roundTripped = TournamentInviteLinkRegistrantDto.fromJson(
        dto.toJson(),
      );

      expect(roundTripped, dto);
    });
  });

  group('TournamentInviteLinkDto', () {
    test('fromJson maps the creation response (REQ-TIL-001): raw token, url, deepLink, empty registrants', () {
      final dto = TournamentInviteLinkDto.fromJson({
        'id': 'link-1',
        'token': 'raw-token-value',
        'url': 'https://cuadrala.app/invite/raw-token-value',
        'deepLink': 'https://cuadrala.app/invite/raw-token-value',
        'expiresAt': '2026-02-01T00:00:00.000Z',
        'maxUses': null,
        'usesCount': 0,
        'revokedAt': null,
        'createdAt': '2026-01-15T10:00:00.000Z',
      });

      expect(dto.id, 'link-1');
      expect(dto.token, 'raw-token-value');
      expect(dto.url, 'https://cuadrala.app/invite/raw-token-value');
      expect(dto.deepLink, 'https://cuadrala.app/invite/raw-token-value');
      expect(dto.maxUses, isNull);
      expect(dto.usesCount, 0);
      expect(dto.revokedAt, isNull);
      expect(dto.createdByUserId, isNull);
      expect(dto.registrants, isEmpty);
      expect(dto.isRevoked, isFalse);
      expect(dto.isExhausted, isFalse);
    });

    test('fromJson maps the listing response (REQ-TIL-006): no token, with registrants', () {
      final dto = TournamentInviteLinkDto.fromJson({
        'id': 'link-1',
        'expiresAt': '2026-02-01T00:00:00.000Z',
        'maxUses': 5,
        'usesCount': 5,
        'revokedAt': '2026-01-20T00:00:00.000Z',
        'createdAt': '2026-01-15T10:00:00.000Z',
        'createdByUserId': 'user-organizer',
        'registrants': [
          {
            'registrationId': 'reg-1',
            'type': 'AUTHENTICATED',
            'displayName': 'Pedro',
            'registeredAt': '2026-01-16T00:00:00.000Z',
          },
          {
            'registrationId': 'reg-2',
            'type': 'GUEST',
            'displayName': 'Invitado',
            'registeredAt': '2026-01-17T00:00:00.000Z',
          },
        ],
      });

      expect(dto.token, isNull);
      expect(dto.createdByUserId, 'user-organizer');
      expect(dto.registrants, hasLength(2));
      expect(dto.registrants.first.displayName, 'Pedro');
      expect(dto.isRevoked, isTrue);
      expect(dto.isExhausted, isTrue);
    });

    test('toJson round-trips through fromJson', () {
      final dto = TournamentInviteLinkDto.fromJson({
        'id': 'link-1',
        'expiresAt': '2026-02-01T00:00:00.000Z',
        'maxUses': 5,
        'usesCount': 1,
        'revokedAt': null,
        'createdAt': '2026-01-15T10:00:00.000Z',
        'createdByUserId': 'user-organizer',
        'registrants': [
          {
            'registrationId': 'reg-1',
            'type': 'AUTHENTICATED',
            'displayName': 'Pedro',
            'registeredAt': '2026-01-16T00:00:00.000Z',
          },
        ],
      });

      final roundTripped = TournamentInviteLinkDto.fromJson(dto.toJson());

      expect(roundTripped, dto);
    });
  });

  group('TournamentInviteLinkPreviewDto', () {
    test('fromJson maps the public preview response (REQ-TIL-012)', () {
      final dto = TournamentInviteLinkPreviewDto.fromJson({
        'tournamentId': 'tour-1',
        'tournamentName': 'Torneo de Verano',
        'sportName': 'Padel',
        'categoryName': 'Cuarta',
        'venueName': 'Club Central',
        'startsAt': '2026-03-01T00:00:00.000Z',
        'status': 'OPEN',
        'acceptsRegistration': true,
      });

      expect(dto.tournamentId, 'tour-1');
      expect(dto.tournamentName, 'Torneo de Verano');
      expect(dto.sportName, 'Padel');
      expect(dto.categoryName, 'Cuarta');
      expect(dto.venueName, 'Club Central');
      expect(dto.startsAt, DateTime.parse('2026-03-01T00:00:00.000Z'));
      expect(dto.status, 'OPEN');
      expect(dto.acceptsRegistration, isTrue);
    });

    test('fromJson tolerates null venueName and startsAt', () {
      final dto = TournamentInviteLinkPreviewDto.fromJson({
        'tournamentId': 'tour-1',
        'tournamentName': 'Torneo de Verano',
        'sportName': 'Padel',
        'categoryName': 'Cuarta',
        'venueName': null,
        'startsAt': null,
        'status': 'DRAFT',
        'acceptsRegistration': false,
      });

      expect(dto.venueName, isNull);
      expect(dto.startsAt, isNull);
      expect(dto.acceptsRegistration, isFalse);
    });
  });

  group('TournamentInviteLinkRegistrationResultDto', () {
    test('fromJson maps the register response (REQ-TIL-007/008)', () {
      final dto = TournamentInviteLinkRegistrationResultDto.fromJson({
        'registrationId': 'reg-1',
        'registrationType': 'GUEST',
        'tournamentId': 'tour-1',
        'status': 'PENDING',
      });

      expect(dto.registrationId, 'reg-1');
      expect(dto.registrationType, 'GUEST');
      expect(dto.tournamentId, 'tour-1');
      expect(dto.status, 'PENDING');
    });
  });
}
