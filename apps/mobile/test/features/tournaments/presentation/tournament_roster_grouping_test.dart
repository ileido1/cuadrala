import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_roster_grouping.dart';
import 'package:flutter_test/flutter_test.dart';

TournamentRegistrationDto regSV(
  String id, {
  String? partnerRegistrationId,
  String status = 'CONFIRMED',
}) =>
    TournamentRegistrationDto(
      id: id,
      tournamentId: 't-1',
      userId: 'user-$id',
      userName: 'Jugador $id',
      status: status,
      createdAt: DateTime(2026),
      partnerRegistrationId: partnerRegistrationId,
    );

void main() {
  group('groupRosterIntoPairs', () {
    //? En torneo individual el roster se muestra como siempre: una fila por
    //? persona. La agrupación no puede cambiarle nada.
    test('should leave every registration alone in a singles tournament', () {
      final r = groupRosterIntoPairs(
        registrations: [regSV('a'), regSV('b')],
        paired: false,
      );

      expect(r.pairs, isEmpty);
      expect(r.unpaired.map((e) => e.id), ['a', 'b']);
    });

    test('should put partners together in one row', () {
      final r = groupRosterIntoPairs(
        registrations: [
          regSV('a', partnerRegistrationId: 'b'),
          regSV('b', partnerRegistrationId: 'a'),
        ],
        paired: true,
      );

      expect(r.pairs, hasLength(1));
      expect(r.pairs.first.first.id, 'a');
      expect(r.pairs.first.second.id, 'b');
      expect(r.unpaired, isEmpty);
    });

    //? Cada dupla aparece UNA vez, no dos: si se listara por cada miembro, el
    //? organizador vería el doble de parejas de las que hay.
    test('should not list the same pair twice', () {
      final r = groupRosterIntoPairs(
        registrations: [
          regSV('a', partnerRegistrationId: 'b'),
          regSV('b', partnerRegistrationId: 'a'),
          regSV('c', partnerRegistrationId: 'd'),
          regSV('d', partnerRegistrationId: 'c'),
        ],
        paired: true,
      );

      expect(r.pairs, hasLength(2));
    });

    //? La bolsa de individuales es lo que el organizador necesita ver: a quién
    //? le falta emparejar antes de generar el cuadro.
    test('should keep the players without a partner in their own bucket', () {
      final r = groupRosterIntoPairs(
        registrations: [
          regSV('a', partnerRegistrationId: 'b'),
          regSV('b', partnerRegistrationId: 'a'),
          regSV('c'),
        ],
        paired: true,
      );

      expect(r.pairs, hasLength(1));
      expect(r.unpaired.map((e) => e.id), ['c']);
    });

    //? Apuntar a alguien que no está en el roster es media dupla: se muestra
    //? como sin pareja para que el organizador lo resuelva.
    test('should treat a dangling partner as unpaired', () {
      final r = groupRosterIntoPairs(
        registrations: [regSV('a', partnerRegistrationId: 'z')],
        paired: true,
      );

      expect(r.pairs, isEmpty);
      expect(r.unpaired.map((e) => e.id), ['a']);
    });

    test('should ignore withdrawn registrations', () {
      final r = groupRosterIntoPairs(
        registrations: [regSV('a', status: 'WITHDRAWN'), regSV('b')],
        paired: true,
      );

      expect(r.unpaired.map((e) => e.id), ['b']);
    });
  });
}
