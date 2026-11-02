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
      // Antes emitía authenticated() (onboardingComplete: null) como paso
      // intermedio: el router reacciona a CADA emit (GoRouterRefreshStream),
      // y auth_redirect.dart manda onboardingComplete==null en ruta de auth
      // a /home. Eso hacía rebotar /login → /home → /onboarding en cada
      // login/registro con onboarding pendiente. Fix: resolver el estado
      // real antes de emitir, un solo emit final.
      'bootstrap: loading → authenticated(complete=true) sin estado intermedio con onboarding desconocido',
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
        SessionState.authenticated(onboardingComplete: true),
      ],
      verify: (_) {
        verify(() => pushTokenSyncService.syncTokenIfAuthenticated()).called(1);
      },
    );

    blocTest<SessionCubit, SessionState>(
      // Mismo bug que bootstrap, pero disparado por login/register:
      // login_screen.dart y register_screen.dart llaman markAuthenticated()
      // y navegan confiando en el redirect del router — un emit intermedio
      // con onboardingComplete: null manda a /home antes de llegar a
      // /onboarding, lo que el usuario percibe como un parpadeo/cierre de
      // sesión.
      'markAuthenticated: un solo emit con el onboarding ya resuelto, sin estado intermedio',
      build: () => SessionCubit(
        authRepository: authRepository,
        onboardingRepository: onboardingRepository,
        pushTokenSyncService: pushTokenSyncService,
      ),
      act: (cubit) => cubit.markAuthenticated(),
      expect: () => const <SessionState>[
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
