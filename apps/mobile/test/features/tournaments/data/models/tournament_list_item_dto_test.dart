import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';

void main() {
  Map<String, Object?> jsonSV({Map<String, Object?> extra = const {}}) => {
        'id': 'tournament-1',
        'name': 'Copa Cuádrala',
        'status': 'OPEN',
        'sportName': 'Padel',
        'categoryName': 'Masculino 7ma',
        'startsAt': '2026-09-12T09:00:00.000Z',
        'registrationCount': 11,
        ...extra,
      };

  group('TournamentListItemDto', () {
    //? Los cuatro datos de "¿puedo entrar?": sin ellos la tarjeta del listado
    //? no puede responder la primera pregunta del jugador.
    test('should read venue, price, slots and deadline from the API', () {
      final dto = TournamentListItemDto.fromJson(jsonSV(extra: {
        'venueId': 'venue-1',
        'venueName': 'Club Cuádrala',
        'inscriptionPrice': 12.5,
        'maxSlots': 16,
        'registrationClosesAt': '2026-09-11T20:00:00.000Z',
      }));

      expect(dto.venueId, 'venue-1');
      expect(dto.venueName, 'Club Cuádrala');
      expect(dto.inscriptionPrice, 12.5);
      expect(dto.maxSlots, 16);
      expect(
        dto.registrationClosesAt,
        DateTime.parse('2026-09-11T20:00:00.000Z'),
      );
    });

    //? Un torneo viejo no declara nada de esto. Tiene que seguir parseando.
    test('should leave the four fields null when the API omits them', () {
      final dto = TournamentListItemDto.fromJson(jsonSV());

      expect(dto.venueId, isNull);
      expect(dto.venueName, isNull);
      expect(dto.inscriptionPrice, isNull);
      expect(dto.maxSlots, isNull);
      expect(dto.registrationClosesAt, isNull);
    });

    //? "Gratis declarado" y "sin declarar" son dos cosas distintas y la tarjeta
    //? las pinta distinto: 0 muestra "Gratis", null no muestra fila de precio.
    test('should keep a declared zero price apart from an absent one', () {
      final free = TournamentListItemDto.fromJson(
        jsonSV(extra: {'inscriptionPrice': 0}),
      );

      expect(free.inscriptionPrice, 0);
      expect(free.inscriptionPrice, isNotNull);
    });

    //? La API manda Decimal serializado; segun el driver puede llegar int.
    test('should accept an integer price from the API', () {
      final dto = TournamentListItemDto.fromJson(
        jsonSV(extra: {'inscriptionPrice': 15}),
      );

      expect(dto.inscriptionPrice, 15.0);
    });
  });
}
