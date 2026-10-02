import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_preset_dto.dart';

void main() {
  test('should preserve nullable preset descriptions from the API', () {
    final withDescription = TournamentPresetDto.fromJson({
      'id': 'preset',
      'sportId': 'sport',
      'code': 'ROUND_ROBIN',
      'version': 1,
      'name': 'Liga',
      'description': 'Todos juegan contra todos.',
      'schemaVersion': 1,
      'defaultParameters': <String, Object?>{},
    });
    final withoutDescription = TournamentPresetDto.fromJson({
      'id': 'preset-legacy',
      'sportId': 'sport',
      'code': 'AMERICANO',
      'version': 1,
      'name': 'Americano',
      'description': null,
      'schemaVersion': 1,
      'defaultParameters': <String, Object?>{},
    });

    expect(withDescription.description, 'Todos juegan contra todos.');
    expect(withoutDescription.description, isNull);
    expect(withoutDescription.toJson()['description'], isNull);
  });
}
