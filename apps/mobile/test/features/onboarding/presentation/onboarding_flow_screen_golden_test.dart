import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_cubit.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/onboarding_flow_screen.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

import '../../../helpers/golden_harness.dart';

class _MockOnboardingCubit extends MockCubit<OnboardingState>
    implements OnboardingCubit {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

const _pendingStatus = OnboardingStatusDto(
  completedSteps: [],
  pendingSteps: [
    OnboardingStep.identity,
    OnboardingStep.sports,
    OnboardingStep.sportProfiles,
    OnboardingStep.location,
    OnboardingStep.availability,
  ],
  isComplete: false,
  completedAt: null,
);

//? Issue #116: onboarding_flow_screen.dart ya tenía tests de comportamiento
//? pero ningún golden. Cubre el paso 1 (identidad) con el nombre precargado
//? y el estado de error al cargar el onboarding.
void main() {
  late OnboardingCubit cubit;
  late ProfileRepository profileRepository;

  setUpAll(loadGoldenFonts);

  setUp(() async {
    await getIt.reset();
    cubit = _MockOnboardingCubit();
    profileRepository = _MockProfileRepository();

    when(() => cubit.load()).thenAnswer((_) async {});
    when(() => profileRepository.getMe()).thenAnswer(
      (_) async => const UserMeDto(
        id: 'player',
        email: 'player@example.com',
        name: 'Carlos Rodríguez',
        subscriptionType: 'FREE',
      ),
    );

    //? La pantalla crea su cubit desde getIt y la página de identidad lee
    //? el perfil desde getIt.
    getIt.registerSingleton<OnboardingCubit>(cubit);
    getIt.registerSingleton<ProfileRepository>(profileRepository);
  });

  tearDown(() async {
    await getIt.reset();
  });

  void stubState(OnboardingState state) {
    when(() => cubit.state).thenReturn(state);
    when(() => cubit.stream).thenAnswer((_) => Stream.value(state));
  }

  for (final brightness in Brightness.values) {
    testWidgets('Onboarding — paso identidad ${brightness.name}', (
      tester,
    ) async {
      stubState(
        OnboardingState.initial().copyWith(
          type: OnboardingStatusType.loaded,
          status: _pendingStatus,
        ),
      );

      await pumpGolden(
        tester,
        brightness: brightness,
        child: const OnboardingFlowScreen(),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/onboarding_flow_screen_identity_${brightness.name}.png',
        ),
      );
    });

    testWidgets('Onboarding — error al cargar ${brightness.name}', (
      tester,
    ) async {
      stubState(
        OnboardingState.initial().copyWith(
          type: OnboardingStatusType.error,
          errorMessage: 'No se pudo cargar el onboarding.',
        ),
      );

      await pumpGolden(
        tester,
        brightness: brightness,
        child: const OnboardingFlowScreen(),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/onboarding_flow_screen_error_${brightness.name}.png',
        ),
      );
    });
  }
}
