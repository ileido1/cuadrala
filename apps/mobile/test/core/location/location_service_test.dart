import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/location/location_service.dart';

class _StubLocationService implements LocationService {
  _StubLocationService(this._result);
  final Future<DeviceLocation> Function() _result;

  @override
  Future<DeviceLocation> getCurrentLocation() => _result();
}

void main() {
  group('LocationService (contract)', () {
    test('getCurrentLocation devuelve DeviceLocation con lat/lng', () async {
      final service = _StubLocationService(() async {
        return const DeviceLocation(latitude: 10.4806, longitude: -66.9036);
      });

      final loc = await service.getCurrentLocation();

      expect(loc.latitude, closeTo(10.48, 0.01));
      expect(loc.longitude, closeTo(-66.90, 0.01));
    });

    test('LocationFailure preserva código y mensaje', () {
      const f = LocationFailure(code: 'LOCATION_DENIED', message: 'denegado');

      expect(f.code, 'LOCATION_DENIED');
      expect(f.message, 'denegado');
      expect(f.toString(), contains('LOCATION_DENIED'));
    });

    test('Servicio puede lanzar LocationFailure cuando no hay permiso', () async {
      final service = _StubLocationService(() async {
        throw const LocationFailure(
          code: 'LOCATION_DENIED',
          message: 'Necesitamos permiso de ubicación.',
        );
      });

      await expectLater(
        service.getCurrentLocation(),
        throwsA(isA<LocationFailure>()
            .having((f) => f.code, 'code', 'LOCATION_DENIED')),
      );
    });
  });
}
