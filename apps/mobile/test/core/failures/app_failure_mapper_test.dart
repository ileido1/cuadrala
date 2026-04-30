import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure_mapper.dart';

void main() {
  group('AppFailureMapper', () {
    test('mapea error de red a mensaje corto en español', () {
      final mapper = AppFailureMapper();

      final failure = mapper.fromException(
        Exception('SocketException: Failed host lookup'),
      );

      expect(failure, isA<AppFailure>());
      expect(failure.message, isNotEmpty);
    });

    test('mapea 401 a "Sesión expirada"', () {
      final mapper = AppFailureMapper();

      final failure = mapper.fromHttp(
        statusCode: 401,
        backendCode: 'AUTH_UNAUTHORIZED',
        backendMessage: 'Unauthorized',
      );

      expect(failure.code, equals('AUTH_UNAUTHORIZED'));
      expect(failure.message, contains('Sesión'));
    });

    test('mapea error desconocido a fallback estable', () {
      final mapper = AppFailureMapper();

      final failure = mapper.fromException(Object());

      expect(failure.code, isNotEmpty);
      expect(failure.message, isNotEmpty);
    });
  });
}
