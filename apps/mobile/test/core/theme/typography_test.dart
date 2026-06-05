import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';

void main() {
  group('AppTheme typography', () {
    test('light theme text styles use Plus Jakarta Sans family', () {
      final theme = AppTheme.light();
      _expectPlusJakartaSans(theme.textTheme);
    });

    test('dark theme text styles use Plus Jakarta Sans family', () {
      final theme = AppTheme.dark();
      _expectPlusJakartaSans(theme.textTheme);
    });

    test('plusJakartaFontFamily matches google_fonts package id', () {
      expect(AppTheme.plusJakartaFontFamily, 'PlusJakartaSans');
    });
  });
}

void _expectPlusJakartaSans(TextTheme textTheme) {
  const jakartaFamily = AppTheme.plusJakartaFontFamily;

  for (final style in [
    textTheme.displayLarge,
    textTheme.headlineSmall,
    textTheme.titleMedium,
    textTheme.bodyMedium,
    textTheme.labelLarge,
  ]) {
    expect(style?.fontFamily, contains(jakartaFamily),
        reason: 'All text styles should use Plus Jakarta Sans');
  }
}
