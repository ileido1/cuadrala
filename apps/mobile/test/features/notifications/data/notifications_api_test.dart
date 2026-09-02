import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure_mapper.dart';
import 'package:cuadrala_mobile/src/core/network/api_client.dart';
import 'package:cuadrala_mobile/src/features/notifications/data/notifications_api.dart';

class _MockDio extends Mock implements Dio {}

void main() {
  group('DioNotificationsApi', () {
    late Dio dio;
    late DioNotificationsApi api;

    setUp(() {
      dio = _MockDio();
      api = DioNotificationsApi(
        apiClient: ApiClient(dio: dio, failureMapper: AppFailureMapper()),
      );
    });

    Response<Object?> emptyResponse(String path) => Response<Object?>(
          requestOptions: RequestOptions(path: path),
          statusCode: 204,
        );

    // La API solo registra DELETE en estas dos rutas (profile.router.ts).
    // El helper postNoContent es POST fijo: no acepta override de metodo,
    // asi que llamarlo aca daba 404 y la baja nunca se aplicaba.

    test('disableSubscription emite DELETE, no POST', () async {
      const path = '/api/v1/users/me/notification-subscriptions/sub-1';
      when(() => dio.delete<Object?>(path,
              queryParameters: any(named: 'queryParameters'),
              options: any(named: 'options')))
          .thenAnswer((_) async => emptyResponse(path));

      await api.disableSubscription(subscriptionId: 'sub-1');

      verify(() => dio.delete<Object?>(path,
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'))).called(1);
      verifyNever(() => dio.post<Object?>(any(),
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options')));
    });

    test('disableDevicePushToken emite DELETE, no POST', () async {
      const path = '/api/v1/users/me/device-push-tokens/token-1';
      when(() => dio.delete<Object?>(path,
              queryParameters: any(named: 'queryParameters'),
              options: any(named: 'options')))
          .thenAnswer((_) async => emptyResponse(path));

      await api.disableDevicePushToken(tokenId: 'token-1');

      verify(() => dio.delete<Object?>(path,
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'))).called(1);
      verifyNever(() => dio.post<Object?>(any(),
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options')));
    });
  });
}
