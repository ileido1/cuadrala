import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/venues/data/venues_api.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';

class _MockVenuesApi extends Mock implements VenuesApi {}

Map<String, Object?> _availabilityEnvelope() => {
      'venueId': 'venue-1',
      'courts': const [],
    };

void main() {
  group('VenuesRepository.getVenueAvailability', () {
    late _MockVenuesApi api;
    late VenuesRepository repo;

    setUp(() {
      api = _MockVenuesApi();
      repo = VenuesRepository(venuesApi: api);

      when(() => api.getVenueAvailabilityEnvelope(
            venueId: any(named: 'venueId'),
            courtId: any(named: 'courtId'),
            fromIso: any(named: 'fromIso'),
            toIso: any(named: 'toIso'),
            durationMinutes: any(named: 'durationMinutes'),
            stepMinutes: any(named: 'stepMinutes'),
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          )).thenAnswer((_) async => _availabilityEnvelope());
    });

    // El DateTime base se construye LOCAL (como en el cubit). El repository
    // debe convertirlo a UTC al serializar para satisfacer
    // z.string().datetime({offset:true}) del backend.
    test('should serialize from/to with UTC offset (suffix Z) '
        'when called with a local DateTime', () async {
      final from = DateTime(2026, 6, 20);
      final to = DateTime(2026, 6, 20, 23, 59, 59);

      await repo.getVenueAvailability(
        venueId: 'venue-1',
        courtId: 'court-1',
        from: from,
        to: to,
        durationMinutes: 90,
      );

      final captured = verify(() => api.getVenueAvailabilityEnvelope(
            venueId: any(named: 'venueId'),
            courtId: any(named: 'courtId'),
            fromIso: captureAny(named: 'fromIso'),
            toIso: captureAny(named: 'toIso'),
            durationMinutes: any(named: 'durationMinutes'),
            stepMinutes: any(named: 'stepMinutes'),
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          )).captured;

      final fromIso = captured[0] as String;
      final toIso = captured[1] as String;

      expect(fromIso.endsWith('Z'), isTrue);
      expect(toIso.endsWith('Z'), isTrue);
      // Contrato exacto: equivale a la conversión UTC del DateTime local.
      expect(fromIso, from.toUtc().toIso8601String());
      expect(toIso, to.toUtc().toIso8601String());
    });

    // TZ-robusto: el round-trip garantiza que no se desplaza el día calendario
    // (en America/Caracas UTC-4: 00:00 local → ...T04:00:00.000Z del mismo día).
    test('should keep the local calendar day (00:00 -> 23:59:59) '
        'when serializing from/to', () async {
      final from = DateTime(2026, 6, 20);
      final to = DateTime(2026, 6, 20, 23, 59, 59);

      await repo.getVenueAvailability(
        venueId: 'venue-1',
        courtId: 'court-1',
        from: from,
        to: to,
        durationMinutes: 90,
      );

      final captured = verify(() => api.getVenueAvailabilityEnvelope(
            venueId: any(named: 'venueId'),
            courtId: any(named: 'courtId'),
            fromIso: captureAny(named: 'fromIso'),
            toIso: captureAny(named: 'toIso'),
            durationMinutes: any(named: 'durationMinutes'),
            stepMinutes: any(named: 'stepMinutes'),
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          )).captured;

      final fromIso = captured[0] as String;
      final toIso = captured[1] as String;

      // Volver a local debe reproducir el mismo instante local (sin shift de día).
      expect(DateTime.parse(fromIso).toLocal(), from);
      expect(DateTime.parse(toIso).toLocal(), to);
      // from < to siempre.
      expect(DateTime.parse(fromIso).isBefore(DateTime.parse(toIso)), isTrue);
    });
  });
}
