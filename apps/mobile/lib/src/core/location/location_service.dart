import 'package:geolocator/geolocator.dart';

/// Resultado simple de obtener una ubicación.
final class DeviceLocation {
  const DeviceLocation({required this.latitude, required this.longitude});
  final double latitude;
  final double longitude;
}

/// Falla de obtención de ubicación.
final class LocationFailure implements Exception {
  const LocationFailure({required this.code, required this.message});
  final String code;
  final String message;

  @override
  String toString() => 'LocationFailure($code: $message)';
}

/// Port de obtención de ubicación. La implementación concreta usa `geolocator`.
abstract interface class LocationService {
  Future<DeviceLocation> getCurrentLocation();
}

/// Implementación basada en `geolocator`. Maneja permisos y servicio apagado.
final class GeolocatorLocationService implements LocationService {
  const GeolocatorLocationService();

  @override
  Future<DeviceLocation> getCurrentLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationFailure(
        code: 'LOCATION_DISABLED',
        message: 'Activa el GPS de tu dispositivo para detectar tu ubicación.',
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) {
      throw const LocationFailure(
        code: 'LOCATION_DENIED_FOREVER',
        message:
            'Diste permiso denegado permanente. Habilita el permiso desde los ajustes del sistema.',
      );
    }
    if (permission == LocationPermission.denied) {
      throw const LocationFailure(
        code: 'LOCATION_DENIED',
        message: 'Necesitamos permiso de ubicación para sugerirte clubes cercanos.',
      );
    }

    final pos = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
        timeLimit: Duration(seconds: 12),
      ),
    );
    return DeviceLocation(latitude: pos.latitude, longitude: pos.longitude);
  }
}
