import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_status_view.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('tournamentStatusLabel', () {
    //? El switch anterior traducía REGISTRATION_OPEN, REGISTRATION_CLOSED y
    //? FINISHED, que no existen en el enum de la API. Los estados reales caían
    //? en el default y al usuario le aparecía "OPEN" y "COMPLETED" crudos.
    test('should translate every status the API can actually return', () {
      expect(tournamentStatusLabel('DRAFT'), 'Borrador');
      expect(tournamentStatusLabel('OPEN'), 'Inscripciones abiertas');
      expect(tournamentStatusLabel('IN_PROGRESS'), 'En curso');
      expect(tournamentStatusLabel('COMPLETED'), 'Finalizado');
      expect(tournamentStatusLabel('CANCELLED'), 'Cancelado');
    });

    test('should never show a raw enum value for a known status', () {
      for (final status in tournamentStatuses) {
        expect(tournamentStatusLabel(status), isNot(status));
      }
    });

    test('should fall back to a readable text for an unknown status', () {
      expect(tournamentStatusLabel('WAT'), 'Estado desconocido');
    });
  });

  group('isTournamentRosterOpen', () {
    //? Espeja TOURNAMENT_ROSTER_OPEN_STATUSES de la API
    //? (domain/tournament/tournament_registration_window.ts). Si se desincronizan,
    //? la app vuelve a ofrecer un botón que el servidor rechaza con 409.
    test('should allow joining while the tournament is DRAFT or OPEN', () {
      expect(isTournamentRosterOpen('DRAFT'), isTrue);
      expect(isTournamentRosterOpen('OPEN'), isTrue);
    });

    test('should close the roster once the tournament started or ended', () {
      expect(isTournamentRosterOpen('IN_PROGRESS'), isFalse);
      expect(isTournamentRosterOpen('COMPLETED'), isFalse);
      expect(isTournamentRosterOpen('CANCELLED'), isFalse);
    });

    test('should close the roster when the status is unknown', () {
      //? Fallar cerrado: mejor no ofrecer la acción que ofrecer un 409.
      expect(isTournamentRosterOpen(null), isFalse);
      expect(isTournamentRosterOpen('WAT'), isFalse);
    });
  });
}
