import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure_mapper.dart';
import 'package:cuadrala_mobile/src/core/network/api_client.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/data/tournament_invite_link_api.dart';

class _MockDio extends Mock implements Dio {}

void main() {
  group('DioTournamentInviteLinkApi', () {
    late Dio dio;
    late DioTournamentInviteLinkApi api;

    setUp(() {
      dio = _MockDio();
      api = DioTournamentInviteLinkApi(
        apiClient: ApiClient(dio: dio, failureMapper: AppFailureMapper()),
      );
    });

    Response<Object?> response(Object? data, String path) =>
        Response<Object?>(
          data: data,
          requestOptions: RequestOptions(path: path),
          statusCode: 200,
        );

    Response<Object?> emptyResponse(String path) => Response<Object?>(
      requestOptions: RequestOptions(path: path),
      statusCode: 204,
    );

    test('createEnvelope issues POST with the expiresAt/maxUses overrides', () async {
      const path = '/api/v1/tournaments/t-1/invite-links';
      when(
        () => dio.request<Object?>(
          path,
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => response({
          'success': true,
          'data': {
            'id': 'link-1',
            'token': 'raw-token',
            'url': 'https://cuadrala.app/invite/raw-token',
            'deepLink': 'https://cuadrala.app/invite/raw-token',
            'expiresAt': '2026-02-01T00:00:00.000Z',
            'maxUses': 5,
            'usesCount': 0,
            'revokedAt': null,
            'createdAt': '2026-01-15T10:00:00.000Z',
          },
        }, path),
      );

      final result = await api.createEnvelope(
        tournamentId: 't-1',
        expiresAt: DateTime.parse('2026-02-01T00:00:00.000Z'),
        maxUses: 5,
      );

      expect(result['success'], isTrue);
      final captured = verify(
        () => dio.request<Object?>(
          path,
          data: captureAny(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: captureAny(named: 'options'),
        ),
      ).captured;
      final body = captured[0] as Map<String, Object?>;
      final options = captured[1] as Options;
      expect(options.method, 'POST');
      expect(body['expiresAt'], '2026-02-01T00:00:00.000Z');
      expect(body['maxUses'], 5);
    });

    test('createEnvelope omits expiresAt/maxUses when not overridden', () async {
      const path = '/api/v1/tournaments/t-1/invite-links';
      when(
        () => dio.request<Object?>(
          path,
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).thenAnswer((_) async => response({'success': true, 'data': {}}, path));

      await api.createEnvelope(tournamentId: 't-1');

      final captured = verify(
        () => dio.request<Object?>(
          path,
          data: captureAny(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).captured;
      final body = captured.single as Map<String, Object?>;
      expect(body.containsKey('expiresAt'), isFalse);
      expect(body.containsKey('maxUses'), isFalse);
    });

    test('listEnvelope issues GET to the tournament invite-links collection', () async {
      const path = '/api/v1/tournaments/t-1/invite-links';
      when(
        () => dio.request<Object?>(
          path,
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => response({
          'success': true,
          'data': [
            {'id': 'link-1'},
          ],
        }, path),
      );

      final result = await api.listEnvelope(tournamentId: 't-1');

      expect(result['data'], isA<List<Object?>>());
      final captured = verify(
        () => dio.request<Object?>(
          path,
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: captureAny(named: 'options'),
        ),
      ).captured;
      final options = captured.single as Options;
      expect(options.method, 'GET');
    });

    test('revoke issues DELETE to the specific link', () async {
      const path = '/api/v1/tournaments/t-1/invite-links/link-1';
      when(
        () => dio.delete<Object?>(
          path,
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).thenAnswer((_) async => emptyResponse(path));

      await api.revoke(tournamentId: 't-1', linkId: 'link-1');

      verify(
        () => dio.delete<Object?>(
          path,
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).called(1);
    });

    test('previewEnvelope issues GET to the public endpoint', () async {
      const path = '/api/v1/public/tournament-invite-links/tok-1';
      when(
        () => dio.request<Object?>(
          path,
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => response({
          'success': true,
          'data': {'tournamentId': 'tour-1'},
        }, path),
      );

      final result = await api.previewEnvelope(token: 'tok-1');

      expect(result['success'], isTrue);
      final captured = verify(
        () => dio.request<Object?>(
          path,
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: captureAny(named: 'options'),
        ),
      ).captured;
      final options = captured.single as Options;
      expect(options.method, 'GET');
    });

    test('registerEnvelope issues POST with guest fields when provided', () async {
      const path = '/api/v1/public/tournament-invite-links/tok-1/register';
      when(
        () => dio.request<Object?>(
          path,
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => response({
          'success': true,
          'data': {'registrationId': 'reg-1'},
        }, path),
      );

      await api.registerEnvelope(
        token: 'tok-1',
        name: 'Juan',
        phone: '+5804121234567',
        email: 'juan@mail.com',
      );

      final captured = verify(
        () => dio.request<Object?>(
          path,
          data: captureAny(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: captureAny(named: 'options'),
        ),
      ).captured;
      final body = captured[0] as Map<String, Object?>;
      final options = captured[1] as Options;
      expect(options.method, 'POST');
      expect(body['name'], 'Juan');
      expect(body['phone'], '+5804121234567');
      expect(body['email'], 'juan@mail.com');
    });

    test('registerEnvelope sends an empty body when no guest fields are given (authenticated path)', () async {
      const path = '/api/v1/public/tournament-invite-links/tok-1/register';
      when(
        () => dio.request<Object?>(
          path,
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => response({
          'success': true,
          'data': {'registrationId': 'reg-1'},
        }, path),
      );

      await api.registerEnvelope(token: 'tok-1');

      final captured = verify(
        () => dio.request<Object?>(
          path,
          data: captureAny(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).captured;
      final body = captured.single as Map<String, Object?>;
      expect(body, isEmpty);
    });

    test('propagates the backend error code on a failed request', () async {
      const path = '/api/v1/public/tournament-invite-links/tok-1';
      when(
        () => dio.request<Object?>(
          path,
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: path),
          response: Response<Object?>(
            requestOptions: RequestOptions(path: path),
            statusCode: 410,
            data: {
              'success': false,
              'code': 'ENLACE_INVALIDO',
              'message': 'El enlace ya no es válido.',
            },
          ),
        ),
      );

      await expectLater(
        () => api.previewEnvelope(token: 'tok-1'),
        throwsA(
          isA<AppFailure>().having((e) => e.code, 'code', 'ENLACE_INVALIDO'),
        ),
      );
    });
  });
}
