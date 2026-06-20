import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/core/theme/brand_colors.dart';
import 'package:cuadrala_mobile/src/core/theme/brand_gradients.dart';

void main() {
  group('AppTheme.dark()', () {
    late ThemeData dark;

    setUp(() {
      dark = AppTheme.dark();
    });

    test('produces brightness == Brightness.dark', () {
      expect(dark.colorScheme.brightness, Brightness.dark);
    });

    test('primary is BrandColors.padelGreen', () {
      expect(dark.colorScheme.primary, BrandColors.padelGreen);
    });

    // `colorScheme.surface` es el color de card (`--surface`) a propósito —
    // el fondo de scaffold (`--bg`) vive en `surfaceContainerLowest`. Ver
    // el comentario en `AppTheme.dark()` (rampa de superficies del rediseño).
    test('surfaceContainerLowest is BrandColors.darkSurface (--bg, scaffold)', () {
      expect(dark.colorScheme.surfaceContainerLowest, BrandColors.darkSurface);
    });

    test('surface is BrandColors.darkSurfaceContainer (--surface, card color)', () {
      expect(dark.colorScheme.surface, BrandColors.darkSurfaceContainer);
    });

    test('tertiary is BrandColors.limeAccent', () {
      expect(dark.colorScheme.tertiary, BrandColors.limeAccent);
    });

    test('onSurface contrast against surface is >= 4.5 (WCAG AA)', () {
      final onSurface = dark.colorScheme.onSurface;
      final surface = dark.colorScheme.surface;
      final contrast = _contrastRatio(onSurface, surface);
      expect(contrast, greaterThanOrEqualTo(4.5),
          reason: 'onSurface on dark surface must meet WCAG AA 4.5:1');
    });

    test('onPrimary contrast against primary is >= 3.0 (WCAG AA large text)', () {
      // FilledButton labels are 14sp bold — qualifies as "large text" under WCAG 2.2
      // which requires 3:1 minimum (not 4.5:1).
      final onPrimary = dark.colorScheme.onPrimary;
      final primary = dark.colorScheme.primary;
      final contrast = _contrastRatio(onPrimary, primary);
      expect(contrast, greaterThanOrEqualTo(3.0),
          reason: 'onPrimary on primary must meet WCAG AA large-text 3:1');
    });

    test('BrandGradients extension is registered', () {
      final gradients = dark.extension<BrandGradients>();
      expect(gradients, isNotNull);
    });

    test('heroCard gradient has two stops', () {
      final gradients = dark.extension<BrandGradients>()!;
      expect(gradients.heroCard.colors.length, 2);
    });
  });

  group('AppTheme.light()', () {
    late ThemeData light;

    setUp(() {
      light = AppTheme.light();
    });

    test('produces brightness == Brightness.light', () {
      expect(light.colorScheme.brightness, Brightness.light);
    });

    test('BrandGradients extension is registered', () {
      final gradients = light.extension<BrandGradients>();
      expect(gradients, isNotNull);
    });

    test('onSurface contrast against surface is >= 4.5 (WCAG AA)', () {
      final onSurface = light.colorScheme.onSurface;
      final surface = light.colorScheme.surface;
      final contrast = _contrastRatio(onSurface, surface);
      expect(contrast, greaterThanOrEqualTo(4.5),
          reason: 'onSurface on light surface must meet WCAG AA 4.5:1');
    });

    test('onPrimary contrast against primary is >= 3.0 (WCAG AA large text)', () {
      // FilledButton labels are 14sp bold — qualifies as "large text" under WCAG 2.2
      // which requires 3:1 minimum (not 4.5:1).
      final onPrimary = light.colorScheme.onPrimary;
      final primary = light.colorScheme.primary;
      final contrast = _contrastRatio(onPrimary, primary);
      expect(contrast, greaterThanOrEqualTo(3.0),
          reason: 'onPrimary on primary must meet WCAG AA large-text 3:1');
    });
  });
}

/// Computes relative luminance for a color per WCAG 2.1 formula.
double _relativeLuminance(Color c) {
  // Color.r / .g / .b return values in [0, 1] on Flutter 3.x.
  double linearize(double v) =>
      v <= 0.04045 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();

  return 0.2126 * linearize(c.r) +
      0.7152 * linearize(c.g) +
      0.0722 * linearize(c.b);
}

double _contrastRatio(Color a, Color b) {
  final l1 = _relativeLuminance(a);
  final l2 = _relativeLuminance(b);
  final lighter = l1 > l2 ? l1 : l2;
  final darker = l1 > l2 ? l2 : l1;
  return (lighter + 0.05) / (darker + 0.05);
}
