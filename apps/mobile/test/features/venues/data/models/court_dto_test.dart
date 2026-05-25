import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/venues/data/models/court_dto.dart';

void main() {
  group('CourtDto', () {
    group('fromJson', () {
      test('should parse pricePerHourCents and durationMinutes when present', () {
        final json = <String, Object?>{
          'id': 'court-1',
          'venueId': 'venue-1',
          'name': 'Cancha 1',
          'sportType': 'PADEL',
          'indoor': true,
          'lighting': true,
          'status': 'ACTIVE',
          'createdAt': '2026-01-15T10:00:00.000Z',
          'pricePerHourCents': 18000,
          'durationMinutes': 90,
        };

        final dto = CourtDto.fromJson(json);

        expect(dto.pricePerHourCents, 18000);
        expect(dto.durationMinutes, 90);
      });

      test('should default pricePerHourCents to 0 when omitted', () {
        final json = <String, Object?>{
          'id': 'court-1',
          'venueId': 'venue-1',
          'name': 'Cancha 1',
          'createdAt': '2026-01-15T10:00:00.000Z',
        };

        final dto = CourtDto.fromJson(json);

        expect(dto.pricePerHourCents, 0);
        expect(dto.durationMinutes, 60);
      });

      test('should coerce num values to int', () {
        final json = <String, Object?>{
          'id': 'court-1',
          'venueId': 'venue-1',
          'name': 'Cancha 1',
          'createdAt': '2026-01-15T10:00:00.000Z',
          'pricePerHourCents': 12000.0,
          'durationMinutes': 60.0,
        };

        final dto = CourtDto.fromJson(json);

        expect(dto.pricePerHourCents, isA<int>());
        expect(dto.durationMinutes, isA<int>());
      });
    });
  });
}
