import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/features/matches/domain/scoring/padel_scoring_config.dart';
import 'package:cuadrala_mobile/src/features/matches/domain/scoring/set_score.dart';

void main() {
  const config = PadelScoringConfig();

  group('PadelScoringConfig.isValidSetScore', () {
    group('valid scores', () {
      test('6-4 es válido (victoria normal)', () {
        expect(config.isValidSetScore(6, 4), isTrue);
      });

      test('4-6 es válido (victoria normal del otro equipo)', () {
        expect(config.isValidSetScore(4, 6), isTrue);
      });

      test('6-0 es válido (bagel)', () {
        expect(config.isValidSetScore(6, 0), isTrue);
      });

      test('0-6 es válido (bagel inverso)', () {
        expect(config.isValidSetScore(0, 6), isTrue);
      });

      test('7-6 es válido (tiebreak)', () {
        expect(config.isValidSetScore(7, 6), isTrue);
      });

      test('6-7 es válido (tiebreak perdido)', () {
        expect(config.isValidSetScore(6, 7), isTrue);
      });

      test('6-1 es válido', () {
        expect(config.isValidSetScore(6, 1), isTrue);
      });

      test('6-2 es válido', () {
        expect(config.isValidSetScore(6, 2), isTrue);
      });

      test('6-3 es válido', () {
        expect(config.isValidSetScore(6, 3), isTrue);
      });
    });

    group('invalid scores', () {
      test('7-5 es inválido (no existe en pádel)', () {
        expect(config.isValidSetScore(7, 5), isFalse);
      });

      test('6-6 es inválido (empate no permitido, debe jugarse tiebreak)', () {
        expect(config.isValidSetScore(6, 6), isFalse);
      });

      test('5-3 es inválido (nadie llegó a 6)', () {
        expect(config.isValidSetScore(5, 3), isFalse);
      });

      test('8-6 es inválido', () {
        expect(config.isValidSetScore(8, 6), isFalse);
      });

      test('7-7 es inválido', () {
        expect(config.isValidSetScore(7, 7), isFalse);
      });

      test('6-5 es inválido (diferencia insuficiente sin tiebreak)', () {
        expect(config.isValidSetScore(6, 5), isFalse);
      });
    });
  });

  group('PadelScoringConfig.isMatchOver', () {
    test('dos sets ganados por el mismo equipo → partido terminado', () {
      const sets = [
        SetScore(teamA: 6, teamB: 4),
        SetScore(teamA: 6, teamB: 3),
      ];
      expect(config.isMatchOver(sets), isTrue);
    });

    test('un set cada equipo → partido no terminado', () {
      const sets = [
        SetScore(teamA: 6, teamB: 4),
        SetScore(teamA: 3, teamB: 6),
      ];
      expect(config.isMatchOver(sets), isFalse);
    });

    test('equipo B gana dos sets → partido terminado', () {
      const sets = [
        SetScore(teamA: 4, teamB: 6),
        SetScore(teamA: 3, teamB: 6),
      ];
      expect(config.isMatchOver(sets), isTrue);
    });

    test('tres sets, equipo A gana 2-1 → partido terminado', () {
      const sets = [
        SetScore(teamA: 6, teamB: 4),
        SetScore(teamA: 3, teamB: 6),
        SetScore(teamA: 6, teamB: 4),
      ];
      expect(config.isMatchOver(sets), isTrue);
    });

    test('lista vacía → partido no terminado', () {
      expect(config.isMatchOver([]), isFalse);
    });
  });

  group('PadelScoringConfig.computePoints', () {
    test('teamIndex 0 en sets [6-4, 6-3] → 12', () {
      const sets = [
        SetScore(teamA: 6, teamB: 4),
        SetScore(teamA: 6, teamB: 3),
      ];
      expect(config.computePoints(sets, 0), equals(12));
    });

    test('teamIndex 1 en sets [6-4, 6-3] → 7', () {
      const sets = [
        SetScore(teamA: 6, teamB: 4),
        SetScore(teamA: 6, teamB: 3),
      ];
      expect(config.computePoints(sets, 1), equals(7));
    });

    test('tres sets divididos, teamIndex 0 → 15', () {
      const sets = [
        SetScore(teamA: 6, teamB: 4),
        SetScore(teamA: 3, teamB: 6),
        SetScore(teamA: 6, teamB: 4),
      ];
      expect(config.computePoints(sets, 0), equals(15));
    });

    test('tres sets divididos, teamIndex 1 → 14', () {
      const sets = [
        SetScore(teamA: 6, teamB: 4),
        SetScore(teamA: 3, teamB: 6),
        SetScore(teamA: 6, teamB: 4),
      ];
      expect(config.computePoints(sets, 1), equals(14));
    });
  });
}
