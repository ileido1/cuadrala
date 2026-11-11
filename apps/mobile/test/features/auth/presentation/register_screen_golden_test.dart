import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/register_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/register_state.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/register_screen.dart';

import '../../../helpers/golden_harness.dart';

class _MockRegisterCubit extends MockCubit<RegisterState>
    implements RegisterCubit {}

/// Decodes every asset [Image] on screen so the logo renders in the golden.
Future<void> _precacheImages(WidgetTester tester) async {
  await tester.runAsync(() async {
    for (final element in find.byType(Image).evaluate()) {
      await precacheImage((element.widget as Image).image, element);
    }
  });
  await tester.pumpAndSettle();
}

//? Issue #116: register_screen.dart ya tenía tests de comportamiento pero
//? ningún golden. Cubre el formulario de registro vacío.
void main() {
  late RegisterCubit registerCubit;

  setUpAll(loadGoldenFonts);

  setUp(() async {
    await getIt.reset();
    registerCubit = _MockRegisterCubit();
    whenListen(
      registerCubit,
      Stream<RegisterState>.value(const RegisterState.idle()),
      initialState: const RegisterState.idle(),
    );
  });

  tearDown(() async {
    await getIt.reset();
  });

  for (final brightness in Brightness.values) {
    testWidgets('Registro — default ${brightness.name}', (tester) async {
      await pumpGolden(
        tester,
        brightness: brightness,
        child: BlocProvider<RegisterCubit>.value(
          value: registerCubit,
          child: const RegisterScreen(),
        ),
      );
      await _precacheImages(tester);

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/register_screen_default_${brightness.name}.png',
        ),
      );
    });
  }
}
