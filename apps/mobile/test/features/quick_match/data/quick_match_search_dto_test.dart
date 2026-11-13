import 'package:cuadrala_mobile/src/features/quick_match/data/models/quick_match_search_dto.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _json({Object? acceptedCount, bool includeCount = true}) =>
    {
      'id': 'search-1',
      'sportId': 'sport-1',
      'categoryId': 'category-1',
      'status': 'PROPOSAL',
      'slots': ['EVENING'],
      'targetDate': '2030-06-01T00:00:00.000Z',
      'acceptedCount': ?(includeCount ? acceptedCount : null),
    };

void main() {
  test('should parse acceptedCount when the API sends it', () {
    final search = QuickMatchSearchDto.fromJson(_json(acceptedCount: 3));

    expect(search.acceptedCount, 3);
  });

  test('should default acceptedCount to 0 when an older API omits it', () {
    final search = QuickMatchSearchDto.fromJson(_json(includeCount: false));

    expect(search.acceptedCount, 0);
  });

  //? S12: el flag distingue una invitación de un miembro del ready check cuyo
  //? grupo perdió a alguien (ambos PENDING con menos de 4 jugadores).
  test('should parse invitedByAvailability and default it to false', () {
    final invited = QuickMatchSearchDto.fromJson({
      ..._json(acceptedCount: 0),
      'invitedByAvailability': true,
    });
    final legacy = QuickMatchSearchDto.fromJson(_json(acceptedCount: 0));

    expect(invited.invitedByAvailability, isTrue);
    expect(legacy.invitedByAvailability, isFalse);
  });
}
