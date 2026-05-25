import 'package:flutter/material.dart';

/// Cuádrala brand palette — all named constants.
///
/// Use these constants when wiring ColorScheme overrides in [AppTheme].
/// Widgets must NOT import this file directly — use
/// `Theme.of(context).colorScheme.*` or
/// `Theme.of(context).extension<BrandGradients>()`.
abstract final class BrandColors {
  // ─── Brand primary ────────────────────────────────────────────────────────
  static const padelGreen = Color(0xFF17A34A);
  static const navy = Color(0xFF0F172A);
  static const navyMid = Color(0xFF172340);
  static const limeAccent = Color(0xFFC5FF00);

  // ─── Light scheme overrides ───────────────────────────────────────────────
  static const lightSurface = Color(0xFFFFFFFF);
  static const lightSurfaceContainer = Color(0xFFF3F4F6);
  static const lightOutline = Color(0xFFE5E7EB);

  // ─── Dark scheme overrides ────────────────────────────────────────────────
  static const darkSurface = Color(0xFF0B1220);
  static const darkSurfaceContainer = Color(0xFF111827);
  static const darkOutline = Color(0xFF1F2937);
  static const darkOnSurface = Color(0xFFE5E7EB);

  // ─── Semantic / fixed colours ─────────────────────────────────────────────
  /// Apple sign-in button background — always near-black per Apple HIG.
  static const appleBlack = Color(0xFF111111);

  /// Warning state — readable on both light and dark backgrounds.
  static const warningAmber = Color(0xFFFB8C00);

  /// Success / good state — readable on both light and dark backgrounds.
  static const successGreen = Color(0xFF8BC34A);
}
