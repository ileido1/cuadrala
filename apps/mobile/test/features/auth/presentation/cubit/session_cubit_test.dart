import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/auth/data/auth_repository.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/auth_tokens.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

void main() {
  group('SessionCubit', () {
    late AuthRepository authRepository;
    late OnboardingRepository onboardingRepository;

    setUp(() {
      authRepository = _MockAuthRepository();
      onboardingRepository = _MockOnboardingRepository();
      when(() => onboardingRepository.getStatus()).thenAnswer(
        (_) async => const OnboardingStatusDto(
          completedSteps: [],
          pendingSteps: [],
          isComplete: true,
          completedAt: null,
        ),
      );
    });

    blocTest<SessionCubit, SessionState>(
      'bootstrap: loading → authenticated, luego authenticated(complete=true) tras refrescar onboarding',
      build: () {
        when(() => authRepository.refresh()).thenAnswer(
          (_) async => const AuthTokens(accessToken: 'a', refreshToken: 'r'),
        );
        return SessionCubit(
          authRepository: authRepository,
          onboardingRepository: onboardingRepository,
        );
      },
      act: (cubit) => cubit.bootstrap(),
      expect: () => const <SessionState>[
        SessionState.loading(),
        SessionState.authenticated(),
        SessionState.authenticated(onboardingComplete: true),
      ],
    );

    blocTest<SessionCubit, SessionState>(
      'bootstrap: loading → unauthenticated y limpia sesión cuando refresh falla',
      build: () {
        when(() => authRepository.refresh()).thenThrow(Exception('401'));
        when(() => authRepository.logout()).thenAnswer((_) async {});
        return SessionCubit(
          authRepository: authRepository,
          onboardingRepository: onboardingRepository,
        );
      },
      act: (cubit) => cubit.bootstrap(),
      expect: () => const <SessionState>[
        SessionState.loading(),
        SessionState.unauthenticated(reason: 'Sesión expirada'),
      ],
      verify: (_) {
        verify(() => authRepository.logout()).called(1);
      },
    );
  });
}
