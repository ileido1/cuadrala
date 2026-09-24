import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure_mapper.dart';
import 'package:cuadrala_mobile/src/core/network/api_client.dart';

class _MockDio extends Mock implements Dio {}

void main() {
  late Dio dio;
  late ApiClient client;

  setUp(() {
    dio = _MockDio();
    client = ApiClient(dio: dio, failureMapper: AppFailureMapper());
  });

  Response<Object?> response(Object? data, String path) => Response<Object?>(
    data: data,
    requestOptions: RequestOptions(path: path),
    statusCode: 200,
  );

  test(
    'getNullableEnvelopeDataMap accepts an empty active-search response',
    () async {
      const path = '/api/v1/quick-match';
      when(
        () => dio.request<Object?>(
          path,
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).thenAnswer((_) async => response({'data': null}, path));

      expect(await client.getNullableEnvelopeDataMap(path), isNull);
    },
  );

  test('getNullableEnvelopeDataMap rejects a non-map data payload', () async {
    const path = '/api/v1/quick-match';
    when(
      () => dio.request<Object?>(
        path,
        data: any(named: 'data'),
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenAnswer((_) async => response({'data': []}, path));

    expect(
      () => client.getNullableEnvelopeDataMap(path),
      throwsA(
        isA<AppFailure>().having((e) => e.code, 'code', 'INVALID_RESPONSE'),
      ),
    );
  });
}
