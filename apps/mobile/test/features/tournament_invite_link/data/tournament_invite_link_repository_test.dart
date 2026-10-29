import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/data/tournament_invite_link_api.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/data/tournament_invite_link_repository.dart';

class _MockApi extends Mock implements TournamentInviteLinkApi {}

void main() {
  group('TournamentInviteLinkRepository', () {
    late _MockApi api;
    late TournamentInviteLinkRepository repo;

    setUp(() {
      api = _MockApi();
      repo = TournamentInviteLinkRepository(tournamentInviteLinkApi: api);
    });

    group('generate', () {
      test('decodes the envelope into a TournamentInviteLinkDto with the raw token', () async {
        when(
          () => api.createEnvelope(
            tournamentId: 't-1',
            expiresAt: any(named: 'expiresAt'),
            maxUses: any(named: 'maxUses'),
          ),
        ).thenAnswer(
          (_) async => {
            'success': true,
            'data': {
              'id': 'link-1',
              'token': 'raw-token',
              'url': 'https://cuadrala.app/invite/raw-token',
              'deepLink': 'https://cuadrala.app/invite/raw-token',
              'expiresAt': '2026-02-01T00:00:00.000Z',
              'maxUses': null,
              'usesCount': 0,
              'revokedAt': null,
              'createdAt': '2026-01-15T10:00:00.000Z',
            },
          },
        );

        final result = await repo.generate(tournamentId: 't-1');

        expect(result.id, 'link-1');
        expect(result.token, 'raw-token');
        expect(result.url, 'https://cuadrala.app/invite/raw-token');
      });

      test('throws INVALID_RESPONSE when the envelope has no data object', () async {
        when(
          () => api.createEnvelope(
            tournamentId: 't-1',
            expiresAt: any(named: 'expiresAt'),
            maxUses: any(named: 'maxUses'),
          ),
        ).thenAnswer((_) async => {'success': true});

        await expectLater(
          () => repo.generate(tournamentId: 't-1'),
          throwsA(
            isA<AppFailure>().having((e) => e.code, 'code', 'INVALID_RESPONSE'),
          ),
        );
      });

      test('propagates a 422 AppFailure from an out-of-range override unchanged', () async {
        when(
          () => api.createEnvelope(
            tournamentId: 't-1',
            expiresAt: any(named: 'expiresAt'),
            maxUses: any(named: 'maxUses'),
          ),
        ).thenThrow(
          const AppFailure(code: 'HTTP_422', message: 'Rango inválido.'),
        );

        await expectLater(
          () => repo.generate(tournamentId: 't-1'),
          throwsA(isA<AppFailure>().having((e) => e.code, 'code', 'HTTP_422')),
        );
      });
    });

    group('list', () {
      test('decodes the envelope into a list of DTOs with their registrants', () async {
        when(() => api.listEnvelope(tournamentId: 't-1')).thenAnswer(
          (_) async => {
            'success': true,
            'data': [
              {
                'id': 'link-1',
                'expiresAt': '2026-02-01T00:00:00.000Z',
                'maxUses': null,
                'usesCount': 1,
                'revokedAt': null,
                'createdAt': '2026-01-15T10:00:00.000Z',
                'createdByUserId': 'organizer-1',
                'registrants': [
                  {
                    'registrationId': 'reg-1',
                    'type': 'GUEST',
                    'displayName': 'Invitado',
                    'registeredAt': '2026-01-16T00:00:00.000Z',
                  },
                ],
              },
            ],
          },
        );

        final result = await repo.list(tournamentId: 't-1');

        expect(result, hasLength(1));
        expect(result.single.registrants, hasLength(1));
        expect(result.single.token, isNull);
      });

      test('throws INVALID_RESPONSE when data is not a list', () async {
        when(
          () => api.listEnvelope(tournamentId: 't-1'),
        ).thenAnswer((_) async => {'success': true, 'data': {}});

        await expectLater(
          () => repo.list(tournamentId: 't-1'),
          throwsA(
            isA<AppFailure>().having((e) => e.code, 'code', 'INVALID_RESPONSE'),
          ),
        );
      });
    });

    test('revoke delegates to the api', () async {
      when(
        () => api.revoke(tournamentId: 't-1', linkId: 'link-1'),
      ).thenAnswer((_) async {});

      await repo.revoke(tournamentId: 't-1', linkId: 'link-1');

      verify(() => api.revoke(tournamentId: 't-1', linkId: 'link-1')).called(1);
    });

    group('preview', () {
      test('decodes the envelope into a TournamentInviteLinkPreviewDto', () async {
        when(() => api.previewEnvelope(token: 'tok-1')).thenAnswer(
          (_) async => {
            'success': true,
            'data': {
              'tournamentId': 'tour-1',
              'tournamentName': 'Torneo',
              'sportName': 'Padel',
              'categoryName': 'Cuarta',
              'venueName': null,
              'startsAt': null,
              'status': 'OPEN',
              'acceptsRegistration': true,
            },
          },
        );

        final result = await repo.preview(token: 'tok-1');

        expect(result.tournamentId, 'tour-1');
        expect(result.acceptsRegistration, isTrue);
      });

      test('propagates a revoked-link AppFailure unchanged', () async {
        when(() => api.previewEnvelope(token: 'tok-1')).thenThrow(
          const AppFailure(code: 'ENLACE_REVOCADO', message: 'El enlace fue revocado.'),
        );

        await expectLater(
          () => repo.preview(token: 'tok-1'),
          throwsA(
            isA<AppFailure>().having((e) => e.code, 'code', 'ENLACE_REVOCADO'),
          ),
        );
      });
    });

    group('register', () {
      test('decodes the envelope into a TournamentInviteLinkRegistrationResultDto', () async {
        when(
          () => api.registerEnvelope(
            token: 'tok-1',
            name: any(named: 'name'),
            phone: any(named: 'phone'),
            email: any(named: 'email'),
          ),
        ).thenAnswer(
          (_) async => {
            'success': true,
            'data': {
              'registrationId': 'reg-1',
              'registrationType': 'GUEST',
              'tournamentId': 'tour-1',
              'status': 'PENDING',
            },
          },
        );

        final result = await repo.register(
          token: 'tok-1',
          name: 'Juan',
          email: 'juan@mail.com',
        );

        expect(result.registrationId, 'reg-1');
        expect(result.registrationType, 'GUEST');
      });

      test('propagates an exhausted-link AppFailure unchanged', () async {
        when(
          () => api.registerEnvelope(
            token: 'tok-1',
            name: any(named: 'name'),
            phone: any(named: 'phone'),
            email: any(named: 'email'),
          ),
        ).thenThrow(
          const AppFailure(code: 'ENLACE_AGOTADO', message: 'El enlace agotó sus usos.'),
        );

        await expectLater(
          () => repo.register(token: 'tok-1'),
          throwsA(
            isA<AppFailure>().having((e) => e.code, 'code', 'ENLACE_AGOTADO'),
          ),
        );
      });
    });
  });
}
