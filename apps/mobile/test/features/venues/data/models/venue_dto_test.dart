import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';

void main() {
  group('VenueDto.fromJson', () {
    test('should parse averageRating when present', () {
      final dto = VenueDto.fromJson({
        'id': 'v1',
        'name': 'Club Test',
        'averageRating': 4.8,
      });

      expect(dto.averageRating, 4.8);
    });

    test('should leave averageRating null when absent', () {
      final dto = VenueDto.fromJson({
        'id': 'v1',
        'name': 'Club Test',
      });

      expect(dto.averageRating, isNull);
    });
  });
}
