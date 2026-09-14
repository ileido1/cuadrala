import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/my_tournament_match_dto.dart';

void main() {
  Map<String, Object?> jsonSV({Map<String, Object?> extra = const {}}) => {
        'roundNumber': 1,
        'matchNumber': 2,
        'partners': const <String>[],
        'opponents': const ['Lucía', 'Diego'],
        'decision': 'PENDING',
        ...extra,
      };

  group('MyTournamentMatchDto', () {
    //? SINGLE_ELIMINATION trae un nombre cualitativo de ronda ya resuelto por
    //? la API: la tarjeta no tiene que inventarse "Octavos"/"Cuartos".
    test('should read the qualitative round name when the API sends it', () {
      final dto = MyTournamentMatchDto.fromJson(
        jsonSV(extra: {'roundName': 'Octavos'}),
      );

      expect(dto.roundName, 'Octavos');
    });

    //? ROUND_ROBIN y AMERICANO no tienen "cuartos" ni "semifinal": la API
    //? manda `null` y la tarjeta cae a "Ronda {n}" con `roundNumber`.
    test('should leave roundName null when the API omits it', () {
      final dto = MyTournamentMatchDto.fromJson(jsonSV());

      expect(dto.roundName, isNull);
    });
  });
}
