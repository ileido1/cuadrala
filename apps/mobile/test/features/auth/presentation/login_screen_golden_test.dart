import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/login_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/login_state.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/login_screen.dart';

import '../../../helpers/golden_harness.dart';

class _MockLoginCubit extends MockCubit<LoginState> implements LoginCubit {}

/// Decodes every asset [Image] on screen so the logo renders in the golden.
Future<void> _precacheImages(WidgetTester tester) async {
  await tester.runAsync(() async {
    for (final element in find.byType(Image).evaluate()) {
      await precacheImage((element.widget as Image).image, element);
    }
  });
  await tester.pumpAndSettle();
}

//? Issue #116: login_screen.dart ya tenía tests de comportamiento pero ningún
//? golden. Cubre el formulario vacío y el estado de error de credenciales.
void main() {
  late LoginCubit loginCubit;

  setUpAll(loadGoldenFonts);

  setUp(() async {
    await getIt.reset();
    loginCubit = _MockLoginCubit();
  });

  tearDown(() async {
    await getIt.reset();
  });

  const states = <String, LoginState>{
    'default': LoginState.idle(),
    'failure': LoginState.failure(message: 'Credenciales inválidas'),
  };

  for (final entry in states.entries) {
    for (final brightness in Brightness.values) {
      testWidgets('Login — ${entry.key} ${brightness.name}', (tester) async {
        whenListen(
          loginCubit,
          Stream<LoginState>.value(entry.value),
          initialState: entry.value,
        );

        await pumpGolden(
          tester,
          brightness: brightness,
          child: BlocProvider<LoginCubit>.value(
            value: loginCubit,
            child: const LoginScreen(),
          ),
        );
        await _precacheImages(tester);

        await expectLater(
          find.byKey(goldenKey),
          matchesGoldenFile(
            'goldens/login_screen_${entry.key}_${brightness.name}.png',
          ),
        );
      });
    }
  }
}
