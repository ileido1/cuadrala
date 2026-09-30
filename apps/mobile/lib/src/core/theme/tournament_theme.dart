import 'package:flutter/material.dart';

import 'brand_colors.dart';

/// Tournament v2 tokens, scoped so the rest of the app retains its brand.
@immutable
class TournamentTheme extends ThemeExtension<TournamentTheme> {
  const TournamentTheme({
    required this.muted2,
    this.green = const Color(0xFF17A34A),
    this.destructive = const Color(0xFFDC2626),
  });

  final Color muted2;
  final Color green;
  final Color destructive;

  static TournamentTheme of(BuildContext context) =>
      Theme.of(context).extension<TournamentTheme>() ??
      TournamentTheme(
        muted2: Theme.of(context).brightness == Brightness.dark
            ? BrandColors.darkMuted2
            : BrandColors.lightMuted2,
      );

  static ThemeData apply(ThemeData base) {
    final dark = base.brightness == Brightness.dark;
    final tokens = TournamentTheme(
      muted2: dark ? BrandColors.darkMuted2 : BrandColors.lightMuted2,
    );
    final scheme = base.colorScheme.copyWith(
      primary: tokens.green,
      onTertiary: BrandColors.onLime,
      surfaceContainerLow: dark
          ? const Color(0xFF0F172A)
          : BrandColors.lightSurface,
      onSurface: dark ? BrandColors.darkOnSurface : const Color(0xFF0F172A),
      error: BrandColors.dangerRed,
    );
    return base.copyWith(
      colorScheme: scheme,
      extensions: [
        ...base.extensions.values.where((e) => e is! TournamentTheme),
        tokens,
      ],
      appBarTheme: base.appBarTheme.copyWith(
        backgroundColor: scheme.surfaceContainerLow,
        surfaceTintColor: scheme.surfaceContainerLow,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: base.filledButtonTheme.style?.copyWith(
          backgroundColor: WidgetStateProperty.resolveWith(
            (states) => states.contains(WidgetState.disabled)
                ? scheme.surfaceContainerHighest
                : tokens.green,
          ),
        ),
      ),
      textTheme: base.textTheme.apply(
        bodyColor: scheme.onSurface,
        displayColor: scheme.onSurface,
      ),
    );
  }

  @override
  TournamentTheme copyWith({Color? muted2, Color? green, Color? destructive}) =>
      TournamentTheme(
        muted2: muted2 ?? this.muted2,
        green: green ?? this.green,
        destructive: destructive ?? this.destructive,
      );

  @override
  TournamentTheme lerp(covariant TournamentTheme? other, double t) =>
      other == null
      ? this
      : TournamentTheme(
          muted2: Color.lerp(muted2, other.muted2, t)!,
          green: Color.lerp(green, other.green, t)!,
          destructive: Color.lerp(destructive, other.destructive, t)!,
        );
}
