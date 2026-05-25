import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/push/push_token_sync_service.dart';
import 'package:cuadrala_mobile/src/features/auth/data/auth_repository.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/auth_tokens.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

class _MockPushTokenSyncService extends Mock implements PushTokenSyncService {}

void main() {
  group('SessionCubit', () {
    late AuthRepository authRepository;
    late OnboardingRepository onboardingRepository;
    late PushTokenSyncService pushTokenSyncService;

    setUp(() {
      authRepository = _MockAuthRepository();
      onboardingRepository = _MockOnboardingRepository();
      pushTokenSyncService = _MockPushTokenSyncService();
      when(() => pushTokenSyncService.syncTokenIfAuthenticated())
          .thenAnswer((_) async {});
      when(() => pushTokenSyncService.clearOnLogout()).thenAnswer((_) async {});
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
          pushTokenSyncService: pushTokenSyncService,
        );
      },
      act: (cubit) => cubit.bootstrap(),
      expect: () => const <SessionState>[
        SessionState.loading(),
        SessionState.authenticated(),
        SessionState.authenticated(onboardingComplete: true),
      ],
      verify: (_) {
        verify(() => pushTokenSyncService.syncTokenIfAuthenticated()).called(1);
      },
    );

    blocTest<SessionCubit, SessionState>(
      'bootstrap: loading → unauthenticated y limpia sesión cuando refresh falla',
      build: () {
        when(() => authRepository.refresh()).thenThrow(Exception('401'));
        when(() => authRepository.logout()).thenAnswer((_) async {});
        return SessionCubit(
          authRepository: authRepository,
          onboardingRepository: onboardingRepository,
          pushTokenSyncService: pushTokenSyncService,
        );
      },
      act: (cubit) => cubit.bootstrap(),
      expect: () => const <SessionState>[
        SessionState.loading(),
        SessionState.unauthenticated(reason: 'Sesión expirada'),
      ],
      verify: (_) {
        verify(() => authRepository.logout()).called(1);
        verifyNever(() => pushTokenSyncService.syncTokenIfAuthenticated());
      },
    );
  });
}
