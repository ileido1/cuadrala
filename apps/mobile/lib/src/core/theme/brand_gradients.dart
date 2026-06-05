import 'package:flutter/material.dart';

import 'brand_colors.dart';

/// Cuádrala gradient tokens exposed as a [ThemeExtension].
///
/// Access in widgets:
/// ```dart
/// final gradients = Theme.of(context).extension<BrandGradients>()!;
/// decoration: BoxDecoration(gradient: gradients.heroCard);
/// ```
@immutable
class BrandGradients extends ThemeExtension<BrandGradients> {
  const BrandGradients({
    required this.heroCard,
    required this.nextMatchCard,
  });

  /// The dark navy-to-navy-mid gradient used on the Search Hero Card.
  final LinearGradient heroCard;

  /// The green gradient used on the Next Match Card.
  final LinearGradient nextMatchCard;

  // ─── Factories ────────────────────────────────────────────────────────────

  factory BrandGradients.light() => const BrandGradients(
        heroCard: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [BrandColors.navy, BrandColors.navyMid],
        ),
        nextMatchCard: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [BrandColors.padelGreen, BrandColors.padelGreenDark],
        ),
      );

  factory BrandGradients.dark() => const BrandGradients(
        heroCard: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [BrandColors.navy, BrandColors.navyMid],
        ),
        nextMatchCard: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [BrandColors.padelGreen, BrandColors.padelGreenDark],
        ),
      );

  // ─── ThemeExtension overrides ─────────────────────────────────────────────

  @override
  BrandGradients copyWith({
    LinearGradient? heroCard,
    LinearGradient? nextMatchCard,
  }) =>
      BrandGradients(
        heroCard: heroCard ?? this.heroCard,
        nextMatchCard: nextMatchCard ?? this.nextMatchCard,
      );

  @override
  BrandGradients lerp(BrandGradients? other, double t) {
    if (other == null) return this;
    return BrandGradients(
      heroCard: LinearGradient.lerp(heroCard, other.heroCard, t)!,
      nextMatchCard: LinearGradient.lerp(nextMatchCard, other.nextMatchCard, t)!,
    );
  }
}
