import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_format_label.dart';

void main() {
  group('tournamentFormatLabel', () {
    //? `formatPresetName` es el CODE del preset
    //? (`get_tournament_bracket.use_case.ts:97`), no una etiqueta lista para
    //? mostrar — la tarjeta "Formato" del handoff (`cuadrala-torneos.jsx:268`)
    //? espera "Eliminación simple", no "SINGLE_ELIMINATION".
    test('should map SINGLE_ELIMINATION to the handoff label', () {
      expect(
        tournamentFormatLabel('SINGLE_ELIMINATION'),
        'Eliminación simple',
      );
    });

    test('should map ROUND_ROBIN to the handoff label', () {
      expect(tournamentFormatLabel('ROUND_ROBIN'), 'Round robin');
    });

    test('should map GROUPS_PLUS_KNOCKOUT to its user-facing label', () {
      expect(
        tournamentFormatLabel('GROUPS_PLUS_KNOCKOUT'),
        'Grupos + eliminación',
      );
    });

    //? Un preset code sin mapeo conocido muestra el nombre crudo en vez de
    //? esconder la tarjeta (diseño: "other codes show the raw name") — a
    //? diferencia de `tournamentStatusLabel`, que sí falla cerrado.
    test('should show the raw name for an unmapped preset code', () {
      expect(tournamentFormatLabel('AMERICANO'), 'AMERICANO');
    });

    //? La tarjeta del listado no trae `formatPresetName` (sólo el detalle de
    //? un torneo lo hace); el mapper nunca debe reventar ni inventar un
    //? nombre de deporte.
    test('should return an empty string when the preset code is null', () {
      expect(tournamentFormatLabel(null), '');
    });
  });

  group('tournamentFormatPresentation', () {
    test('should keep groups plus knockout distinct from direct brackets', () {
      expect(
        tournamentFormatPresentation('GROUPS_PLUS_KNOCKOUT'),
        TournamentFormatPresentation.groupsPlusKnockout,
      );
      expect(
        tournamentFormatPresentation('SINGLE_ELIMINATION'),
        TournamentFormatPresentation.bracket,
      );
    });
  });
}
