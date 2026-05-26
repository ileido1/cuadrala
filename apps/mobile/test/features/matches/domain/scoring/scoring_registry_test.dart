import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/features/matches/domain/scoring/scoring_registry.dart';
import 'package:cuadrala_mobile/src/features/matches/domain/scoring/padel_scoring_config.dart';

void main() {
  group('ScoringRegistry.forCode', () {
    test('PADEL en mayúsculas retorna PadelScoringConfig', () {
      final config = ScoringRegistry.forCode('PADEL');
      expect(config, isA<PadelScoringConfig>());
    });

    test('padel en minúsculas retorna PadelScoringConfig (case-insensitive)', () {
      final config = ScoringRegistry.forCode('padel');
      expect(config, isA<PadelScoringConfig>());
    });

    test('Padel en mixedCase retorna PadelScoringConfig', () {
      final config = ScoringRegistry.forCode('Padel');
      expect(config, isA<PadelScoringConfig>());
    });

    test('UNKNOWN lanza ArgumentError', () {
      expect(
        () => ScoringRegistry.forCode('UNKNOWN'),
        throwsA(isA<ArgumentError>()),
      );
    });

    test('string vacío lanza ArgumentError', () {
      expect(
        () => ScoringRegistry.forCode(''),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}
