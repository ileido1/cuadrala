import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/auth/presentation/welcome_screen.dart';

import '../../../helpers/golden_harness.dart';

/// Decodes every asset [Image] on screen so the logo renders in the golden.
Future<void> _precacheImages(WidgetTester tester) async {
  await tester.runAsync(() async {
    for (final element in find.byType(Image).evaluate()) {
      await precacheImage((element.widget as Image).image, element);
    }
  });
  await tester.pumpAndSettle();
}

//? Issue #116: welcome_screen.dart no tenía golden. Cubre la pantalla de
//? bienvenida por defecto (logo, tagline y botones de registro/login).
void main() {
  setUpAll(loadGoldenFonts);

  for (final brightness in Brightness.values) {
    testWidgets('Bienvenida — default ${brightness.name}', (tester) async {
      await pumpGolden(
        tester,
        brightness: brightness,
        child: const WelcomeScreen(),
      );
      await _precacheImages(tester);

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile('goldens/welcome_screen_default_${brightness.name}.png'),
      );
    });
  }
}
