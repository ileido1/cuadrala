import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';

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

      final scheme = Theme.of(capturedContext).colorScheme;
      expect(scheme.brightness, Brightness.dark);
      expect(scheme.surface, const Color(0xFF0B1220));
    });
  });
}
