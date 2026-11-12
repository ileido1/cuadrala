import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
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
        when(() => authRepository.refresh()).thenThrow(
          const AppFailure(code: 'AUTH_UNAUTHORIZED', message: 'expirada'),
        );
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

    //? Bucle de producción: logout → clearOnLogout pide device-push-tokens →
    //? 401 → el interceptor no puede refrescar → logout otra vez → ... Cada
    //? nivel pendiente terminaba borrando los tokens de un login nuevo.
    test(
      'should run a single logout when clearing push tokens triggers logout again',
      () async {
        when(() => authRepository.logout()).thenAnswer((_) async {});
        final cubit = SessionCubit(
          authRepository: authRepository,
          onboardingRepository: onboardingRepository,
          pushTokenSyncService: pushTokenSyncService,
        );
        await cubit.markAuthenticated();
        var nested = 0;
        when(() => pushTokenSyncService.clearOnLogout()).thenAnswer((_) async {
          //? Simula el 401 que vuelve a disparar el logout global.
          if (nested++ < 5) await cubit.logout();
        });

        await cubit.logout();

        expect(nested, 1);
        verify(() => authRepository.logout()).called(1);
        expect(cubit.state, const SessionState.unauthenticated());
        await cubit.close();
      },
    );

    //? Bucle de producción en 1.7.28 (797 "Refresh rechazado" en una traza):
    //? sin sesión, cada 401 rezagado volvía a correr un logout completo, que
    //? emitía loading → unauthenticated, el router remontaba pantallas y
    //? estas disparaban nuevos 401.
    test(
      'should do nothing when logout is called while already unauthenticated',
      () async {
        final cubit = SessionCubit(
          authRepository: authRepository,
          onboardingRepository: onboardingRepository,
          pushTokenSyncService: pushTokenSyncService,
        );
        final states = <SessionState>[];
        final sub = cubit.stream.listen(states.add);

        await cubit.logout();
        await Future<void>.delayed(Duration.zero);

        expect(states, isEmpty);
        verifyNever(() => pushTokenSyncService.clearOnLogout());
        verifyNever(() => authRepository.logout());
        await sub.cancel();
        await cubit.close();
      },
    );

    //? Abrir la app sin red (timeout/5xx) borraba el refresh token y la
    //? sesión se perdía para siempre aunque seguía siendo válida.
    blocTest<SessionCubit, SessionState>(
      'should keep the stored session when bootstrap refresh fails ambiguously',
      build: () {
        when(() => authRepository.refresh()).thenThrow(
          const AppFailure(code: 'NETWORK_TIMEOUT', message: 'timeout'),
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
        SessionState.unauthenticated(
          reason: 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.',
        ),
      ],
      verify: (_) => verifyNever(() => authRepository.logout()),
    );

    //? Un fallo de Firebase al sincronizar el token push no debe cerrar ni
    //? bloquear la sesión: el push es accesorio al login.
    blocTest<SessionCubit, SessionState>(
      'should authenticate on bootstrap even when push sync fails',
      build: () {
        when(() => authRepository.refresh()).thenAnswer(
          (_) async => const AuthTokens(accessToken: 'a', refreshToken: 'r'),
        );
        when(() => pushTokenSyncService.syncTokenIfAuthenticated())
            .thenAnswer((_) async => throw Exception('messaging/unsupported-browser'));
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
      verify: (_) => verifyNever(() => authRepository.logout()),
    );

    blocTest<SessionCubit, SessionState>(
      'should authenticate after login even when push sync fails',
      build: () {
        when(() => pushTokenSyncService.syncTokenIfAuthenticated())
            .thenAnswer((_) async => throw Exception('getToken failed'));
        return SessionCubit(
          authRepository: authRepository,
          onboardingRepository: onboardingRepository,
          pushTokenSyncService: pushTokenSyncService,
        );
      },
      act: (cubit) => cubit.markAuthenticated(),
      expect: () => const <SessionState>[
        SessionState.authenticated(onboardingComplete: true),
      ],
    );
  });
}
