import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_cubit.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_state.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/profile_screen.dart';

import '../../../helpers/golden_harness.dart';
import 'goldens/profile_golden_fixtures.dart';

class _MockProfileCubit extends MockCubit<ProfileState>
    implements ProfileCubit {}

//? Issue #116: profile_screen.dart ya tenía tests de comportamiento pero
//? ningún golden. Cubre la pantalla de perfil cargada (identidad, ELO,
//? estadísticas, forma reciente y disponibilidad).
void main() {
  late _MockProfileCubit profileCubit;

  setUpAll(loadGoldenFonts);

  setUp(() {
    profileCubit = _MockProfileCubit();
    when(() => profileCubit.load()).thenAnswer((_) async {});
    when(() => profileCubit.state).thenReturn(profileGoldenLoaded);
    whenListen(
      profileCubit,
      const Stream<ProfileState>.empty(),
      initialState: profileGoldenLoaded,
    );
  });

  for (final brightness in Brightness.values) {
    testWidgets('Perfil — cargado ${brightness.name}', (tester) async {
      //? ProfileScreen vive dentro del shell (que aporta el Scaffold), así
      //? que se envuelve en uno para tener el fondo del tema.
      await pumpGolden(
        tester,
        brightness: brightness,
        child: Scaffold(
          body: BlocProvider<ProfileCubit>.value(
            value: profileCubit,
            child: const ProfileScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile('goldens/profile_screen_loaded_${brightness.name}.png'),
      );
    });
  }
}
