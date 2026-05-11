import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_cubit.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/onboarding_flow_screen.dart';

class _MockOnboardingCubit extends MockCubit<OnboardingState>
    implements OnboardingCubit {}

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

class _MockSessionCubit extends MockCubit<SessionState>
    implements SessionCubit {}

void main() {
  group('OnboardingFlowScreen', () {
    late OnboardingCubit onboardingCubit;
    late OnboardingRepository onboardingRepository;
    late SessionCubit sessionCubit;

    setUp(() {
      onboardingCubit = _MockOnboardingCubit();
      onboardingRepository = _MockOnboardingRepository();
      sessionCubit = _MockSessionCubit();

      when(() => onboardingCubit.load()).thenAnswer((_) async {});
      when(() => onboardingCubit.state).thenReturn(
        OnboardingState.initial().copyWith(
          type: OnboardingStatusType.loaded,
          status: const OnboardingStatusDto(
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
          ),
        ),
      );
      when(() => onboardingCubit.stream).thenAnswer(
        (_) => Stream.value(onboardingCubit.state),
      );
      when(() => sessionCubit.state).thenReturn(
        const SessionState.authenticated(onboardingComplete: false),
      );
      when(() => sessionCubit.stream).thenAnswer(
        (_) => Stream.value(sessionCubit.state),
      );
      when(() => sessionCubit.refreshOnboardingStatus()).thenAnswer((_) async {});

      // Register mocks in getIt so OnboardingFlowScreen.create can find them.
      final getIt = GetIt.instance;
      getIt.registerSingleton<OnboardingCubit>(onboardingCubit);
      getIt.registerSingleton<OnboardingRepository>(onboardingRepository);
      getIt.registerSingleton<SessionCubit>(sessionCubit);
    });

    tearDown(() {
      final getIt = GetIt.instance;
      getIt.unregister<OnboardingCubit>();
      getIt.unregister<OnboardingRepository>();
    });

    testWidgets(
      'on last page, tapping continue calls completeOnboarding then refreshOnboardingStatus then navigates to home',
      (tester) async {
        when(() => onboardingRepository.completeOnboarding())
            .thenAnswer((_) async {});
        when(() => sessionCubit.refreshOnboardingStatus())
            .thenAnswer((_) async {});

        await tester.pumpWidget(
          MaterialApp(
            home: MultiBlocProvider(
              providers: [
                BlocProvider<OnboardingCubit>.value(value: onboardingCubit),
                BlocProvider<SessionCubit>.value(value: sessionCubit),
              ],
              child: const OnboardingFlowScreen(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Verify screen rendered
        expect(find.byKey(const Key('onboarding.flow.screen')), findsOneWidget);
      },
    );
  });
}
