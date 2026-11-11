import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/profile/presentation/profile_settings_screen.dart';

import '../../../helpers/golden_harness.dart';

//? Issue #116: profile_settings_screen.dart ya tenía tests de comportamiento
//? pero ningún golden. Es una pantalla estática (solo usa SessionCubit al
//? tocar "Cerrar sesión"), así que no necesita mocks: cubre la vista inicial.
void main() {
  setUpAll(loadGoldenFonts);

  for (final brightness in Brightness.values) {
    testWidgets('Ajustes — inicial ${brightness.name}', (tester) async {
      await pumpGolden(
        tester,
        brightness: brightness,
        child: const ProfileSettingsScreen(),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/profile_settings_screen_default_${brightness.name}.png',
        ),
      );
    });
  }
}
