import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_cubit.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_state.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/public_profile_screen.dart';

import '../../../helpers/golden_harness.dart';
import 'goldens/profile_golden_fixtures.dart';

class _MockProfileCubit extends MockCubit<ProfileState>
    implements ProfileCubit {}

//? Issue #116: public_profile_screen.dart ya tenía tests de comportamiento
//? pero ningún golden. Cubre la vista pública cargada del propio jugador.
void main() {
  late _MockProfileCubit profileCubit;

  setUpAll(loadGoldenFonts);

  setUp(() async {
    await getIt.reset();
    profileCubit = _MockProfileCubit();
    when(() => profileCubit.load()).thenAnswer((_) async {});
    when(() => profileCubit.state).thenReturn(profileGoldenLoaded);
    whenListen(
      profileCubit,
      const Stream<ProfileState>.empty(),
      initialState: profileGoldenLoaded,
    );
    getIt.registerFactory<ProfileCubit>(() => profileCubit);
  });

  tearDown(() async {
    await getIt.reset();
  });

  for (final brightness in Brightness.values) {
    testWidgets('Vista pública — cargada ${brightness.name}', (tester) async {
      await pumpGolden(
        tester,
        brightness: brightness,
        child: const PublicProfileScreen(),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/public_profile_screen_loaded_${brightness.name}.png',
        ),
      );
    });
  }
}
