import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/core/network/api_json.dart';

void main() {
  group('decodeEnvelopeDataMap', () {
    test('extrae el data de un envelope {success,message,data}', () {
      final result = decodeEnvelopeDataMap({
        'success': true,
        'message': 'Inscripción registrada correctamente.',
        'data': {'id': 'reg-1', 'status': 'PENDING'},
      });

      expect(result['id'], 'reg-1');
      expect(result['status'], 'PENDING');
    });

    test('lanza INVALID_RESPONSE si no hay data', () {
      expect(
        () => decodeEnvelopeDataMap({'success': true, 'message': 'sin data'}),
        throwsA(
          isA<AppFailure>().having((e) => e.code, 'code', 'INVALID_RESPONSE'),
        ),
      );
    });

    test('mantiene el decoder estricto para data null', () {
      expect(
        () => decodeEnvelopeDataMap({'success': true, 'data': null}),
        throwsA(
          isA<AppFailure>().having((e) => e.code, 'code', 'INVALID_RESPONSE'),
        ),
      );
    });
  });

  group('decodeNullableEnvelopeDataMap', () {
    test('devuelve null cuando el envelope indica que no hay búsqueda', () {
      expect(
        decodeNullableEnvelopeDataMap({'success': true, 'data': null}),
        isNull,
      );
    });

    test('extrae un mapa cuando el envelope contiene datos', () {
      expect(
        decodeNullableEnvelopeDataMap({
          'success': true,
          'data': {'id': 'search-1'},
        }),
        {'id': 'search-1'},
      );
    });

    test('rechaza payloads no mapa aunque el dato sea nullable', () {
      expect(
        () => decodeNullableEnvelopeDataMap({'success': true, 'data': []}),
        throwsA(
          isA<AppFailure>().having((e) => e.code, 'code', 'INVALID_RESPONSE'),
        ),
      );
    });
  });
}
