import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/core/theme/brand_colors.dart';

/// Smoke tests: verify key screens render without overflow or exceptions
/// in both light and dark mode.
void main() {
  group('Dark mode smoke — no overflow', () {
    testWidgets('Scaffold with FilledButton renders in dark theme', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: ThemeMode.dark,
          home: Scaffold(
            body: Center(
              child: FilledButton(
                onPressed: () {},
                child: const Text('Buscar Partida'),
              ),
            ),
          ),
        ),
      );

      expect(tester.takeException(), isNull);
      expect(find.text('Buscar Partida'), findsOneWidget);
    });

    testWidgets('Scaffold with FilledButton renders in light theme', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: ThemeMode.light,
          home: Scaffold(
            body: Center(
              child: FilledButton(
                onPressed: () {},
                child: const Text('Buscar Partida'),
              ),
            ),
          ),
        ),
      );

      expect(tester.takeException(), isNull);
      expect(find.text('Buscar Partida'), findsOneWidget);
    });

    testWidgets('dark theme scaffold background is BrandColors.darkSurface', (tester) async {
      late BuildContext capturedContext;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: ThemeMode.dark,
          home: Builder(
            builder: (ctx) {
              capturedContext = ctx;
              return const Scaffold(body: SizedBox.expand());
            },
          ),
        ),
      );

      final theme = Theme.of(capturedContext);
      expect(theme.colorScheme.brightness, Brightness.dark);
      // El fondo de scaffold es `--bg`; `colorScheme.surface` es el color de
      // card (`--surface`) a propósito — ver AppTheme.dark().
      expect(theme.scaffoldBackgroundColor, BrandColors.darkSurface);
    });
  });
}
