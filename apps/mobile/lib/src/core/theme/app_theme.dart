import 'package:flutter/material.dart';

import 'brand_colors.dart';
import 'brand_gradients.dart';

final class AppTheme {
  // ─── Shared constants ──────────────────────────────────────────────────────
  static const _radius = 12.0;
  static const _radiusLg = 18.0;

  /// Family name registered by [google_fonts] for Plus Jakarta Sans.
  static const plusJakartaFontFamily = 'PlusJakartaSans';

  // ─── Light ─────────────────────────────────────────────────────────────────
  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: BrandColors.padelGreen,
      brightness: Brightness.light,
    ).copyWith(
      primary: BrandColors.padelGreen,
      onPrimary: BrandColors.onHero,
      secondary: BrandColors.navy,
      onSecondary: BrandColors.onHero,
      tertiary: BrandColors.limeAccent,
      onTertiary: BrandColors.navy,
      surface: BrandColors.lightSurface,
      surfaceContainerHighest: BrandColors.lightSurfaceContainer,
      outline: BrandColors.lightOutline,
    );

    return _buildTheme(scheme, BrandGradients.light());
  }

  // ─── Dark ──────────────────────────────────────────────────────────────────
  static ThemeData dark() {
    final scheme = ColorScheme.fromSeed(
      seedColor: BrandColors.padelGreen,
      brightness: Brightness.dark,
    ).copyWith(
      primary: BrandColors.padelGreen,
      onPrimary: BrandColors.onHero,
      secondary: BrandColors.navy,
      onSecondary: BrandColors.onHero,
      tertiary: BrandColors.limeAccent,
      onTertiary: BrandColors.navy,
      surface: BrandColors.darkSurface,
      surfaceContainerHighest: BrandColors.darkSurfaceContainer,
      outline: BrandColors.darkOutline,
      onSurface: BrandColors.darkOnSurface,
    );

    return _buildTheme(scheme, BrandGradients.dark());
  }

  // ─── Shared builder ────────────────────────────────────────────────────────
  static ThemeData _buildTheme(ColorScheme scheme, BrandGradients gradients) {
    final textTheme = _textTheme(scheme);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      textTheme: textTheme,
      extensions: [gradients],
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        surfaceTintColor: scheme.surface,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainerHighest,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radius),
          borderSide: BorderSide(color: scheme.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radius),
          borderSide: BorderSide(color: scheme.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radius),
          borderSide: BorderSide(color: scheme.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radius),
          borderSide: BorderSide(color: scheme.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radius),
          borderSide: BorderSide(color: scheme.error, width: 1.5),
        ),
        labelStyle: TextStyle(color: scheme.onSurfaceVariant),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_radius),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          side: BorderSide(color: scheme.outline),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_radius),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      cardTheme: CardThemeData(
        color: scheme.surface,
        elevation: 1,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_radiusLg),
          side: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.6)),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: scheme.surface,
        selectedItemColor: scheme.primary,
        unselectedItemColor: scheme.onSurfaceVariant,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surface,
        indicatorColor: scheme.primaryContainer,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return IconThemeData(color: scheme.onPrimaryContainer);
          }
          return IconThemeData(color: scheme.onSurfaceVariant);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return TextStyle(
              color: scheme.onSurface,
              fontWeight: FontWeight.w700,
              fontSize: 11,
            );
          }
          return TextStyle(
            color: scheme.onSurfaceVariant,
            fontWeight: FontWeight.w600,
            fontSize: 11,
          );
        }),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: scheme.surface,
          foregroundColor: scheme.primary,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_radius),
          ),
        ),
      ),
    );
  }

  /// Plus Jakarta Sans — alineado con mockups (`DESIGN_SPEC.md`).
  ///
  /// Usa `fontFamily` en el [TextTheme] sin descargar fuentes en build:
  /// [google_fonts] resuelve el glyph en runtime al pintar texto.
  static TextTheme _textTheme(ColorScheme scheme) {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
    ).textTheme;
    return base.apply(
      fontFamily: plusJakartaFontFamily,
      bodyColor: scheme.onSurface,
      displayColor: scheme.onSurface,
    );
  }
}
