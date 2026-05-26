import 'padel_scoring_config.dart';
import 'scoring_config.dart';

final class ScoringRegistry {
  const ScoringRegistry._();

  static ScoringConfig forCode(String sportCode) {
    return switch (sportCode.toUpperCase()) {
      'PADEL' => const PadelScoringConfig(),
      _ => throw ArgumentError('No ScoringConfig for sportCode: $sportCode'),
    };
  }
}
