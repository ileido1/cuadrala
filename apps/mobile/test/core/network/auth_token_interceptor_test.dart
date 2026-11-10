import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/core/network/auth_token_interceptor.dart';
import 'package:cuadrala_mobile/src/core/push/push_token_sync_service.dart';
import 'package:cuadrala_mobile/src/features/auth/data/auth_repository.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/auth_tokens.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

class _MockPushTokenSyncService extends Mock implements PushTokenSyncService {}

/// Simulates a backend that rotates the refresh token on every successful
/// `/auth/refresh` call and rejects a refresh token that was already
/// consumed by a concurrent call (single-use rotation, matching
/// `RefreshSessionUseCase.rotateSV` in services/api). Each call snapshots
/// the token version it read before "sending the request" (await), so two
/// calls started while the token is still at version N race on which one's
/// rotation lands first.
class _SingleUseRotatingBackend {
  int _currentTokenVersion = 0;

  Future<void> refresh() async {
    final readVersion = _currentTokenVersion;
    // Simulates the network round-trip; also guarantees both concurrent
    // calls have already snapshotted their version before either resolves.
    await Future<void>.delayed(const Duration(milliseconds: 20));
    if (readVersion != _currentTokenVersion) {
      // Matches what the real backend returns for an already-rotated
      // refresh token: a clean 401 -> AppFailure(AUTH_UNAUTHORIZED), not a
      // generic/network error. That is what makes this race indistinguishable
      // from a genuinely dead session (see the AUTH_UNAUTHORIZED-only test
      // below) and is why this specific scenario stays a known limitation
      // rather than something #137's fix can tell apart.
      throw const AppFailure(
        code: 'AUTH_UNAUTHORIZED',
        message: 'Sesión expirada. Inicia sesión nuevamente.',
      );
    }
    _currentTokenVersion++;
  }
}

void main() {
  test(
    'a definitive AUTH_UNAUTHORIZED refresh failure invalidates the active '
    'session instance',
    () async {
    final authRepository = _MockAuthRepository();
    final onboardingRepository = _MockOnboardingRepository();
    final pushTokenSyncService = _MockPushTokenSyncService();
    final activeSession = SessionCubit(
      authRepository: authRepository,
      onboardingRepository: onboardingRepository,
      pushTokenSyncService: pushTokenSyncService,
    );
    final interceptor = AuthTokenInterceptor(
      authRepository: authRepository,
      refreshSession: () async => throw const AppFailure(
        code: 'AUTH_UNAUTHORIZED',
        message: 'Sesión expirada. Inicia sesión nuevamente.',
      ),
      onRefreshFailure: activeSession.logout,
    );
    final request = RequestOptions(path: '/api/v1/profile');
    final error = DioException(
      requestOptions: request,
      response: Response<dynamic>(requestOptions: request, statusCode: 401),
    );

    when(() => pushTokenSyncService.clearOnLogout()).thenAnswer((_) async {});
    when(() => authRepository.logout()).thenAnswer((_) async {});

    DioException? forwardedError;
    await interceptor.onError(
      error,
      _CapturingErrorInterceptorHandler(
        onNext: (value) => forwardedError = value,
      ),
    );

    expect(forwardedError, same(error));
    expect(activeSession.state, const SessionState.unauthenticated());
    verify(() => authRepository.logout()).called(1);
    await activeSession.close();
  });

  test(
    'two requests that 401 concurrently race on the single-use refresh '
    'token: one succeeds, the other forces a logout even though the '
    'session was never actually invalid',
    () async {
      // Reproduces a real login flow: Home's HomeCubit.load() fires
      // getMe()/resolveDefaultSportId() then Future.wait([listOpenMatches,
      // listMyMatches, exchangeRates]) — several authenticated requests in
      // flight together. AuthTokenInterceptor has no mutex/single-flight
      // guard around refreshSession(), so if two of them 401 at the same
      // time, each independently calls authRepository.refresh(), racing
      // on the backend's single-use refresh-token rotation
      // (RefreshSessionUseCase.rotateSV).
      final authRepository = _MockAuthRepository();
      final onboardingRepository = _MockOnboardingRepository();
      final pushTokenSyncService = _MockPushTokenSyncService();
      final activeSession = SessionCubit(
        authRepository: authRepository,
        onboardingRepository: onboardingRepository,
        pushTokenSyncService: pushTokenSyncService,
      );
      final backend = _SingleUseRotatingBackend();

      when(() => authRepository.tokensInMemory).thenReturn(
        const AuthTokens(accessToken: 'access-1', refreshToken: 'refresh-1'),
      );
      when(() => pushTokenSyncService.clearOnLogout()).thenAnswer((_) async {});
      when(() => authRepository.logout()).thenAnswer((_) async {});

      final interceptor = AuthTokenInterceptor(
        authRepository: authRepository,
        refreshSession: backend.refresh,
        onRefreshFailure: activeSession.logout,
      );

      DioException makeError(String path) {
        final request = RequestOptions(path: path);
        return DioException(
          requestOptions: request,
          response: Response<dynamic>(requestOptions: request, statusCode: 401),
        );
      }

      final forwarded = <DioException?>[null, null];
      Future<void> run(int index, String path) => interceptor.onError(
            makeError(path),
            _CapturingErrorInterceptorHandler(
              onNext: (value) => forwarded[index] = value,
            ),
          );

      // Both requests 401 "at the same time", exactly like two of Home's
      // Future.wait([...]) calls would.
      await Future.wait([
        run(0, '/api/v1/matches/open'),
        run(1, '/api/v1/matches/mine'),
      ]);

      // One of the two concurrent refresh attempts must have lost the
      // single-use rotation race and forced a logout...
      expect(activeSession.state, const SessionState.unauthenticated());
      verify(() => authRepository.logout()).called(1);
      // ...even though a refresh token was valid and successfully rotated
      // moments earlier — this is a false logout, not an expired session.
      expect(backend._currentTokenVersion, 1);

      await activeSession.close();
    },
  );

  test(
    'an ambiguous refresh failure (network/timeout/5xx) propagates the '
    'request error WITHOUT logging out — issue #137: onboarding fires '
    'several concurrent authenticated calls right after register, and a '
    'merely transient refresh failure on one of them must not kill a '
    'session that is otherwise still valid',
    () async {
      final authRepository = _MockAuthRepository();
      final onboardingRepository = _MockOnboardingRepository();
      final pushTokenSyncService = _MockPushTokenSyncService();
      final activeSession = SessionCubit(
        authRepository: authRepository,
        onboardingRepository: onboardingRepository,
        pushTokenSyncService: pushTokenSyncService,
      );
      final interceptor = AuthTokenInterceptor(
        authRepository: authRepository,
        refreshSession: () async => throw const AppFailure(
          code: 'NETWORK_TIMEOUT',
          message: 'La conexión tardó demasiado. Inténtalo de nuevo.',
        ),
        onRefreshFailure: activeSession.logout,
      );
      final request = RequestOptions(path: '/api/v1/onboarding/sport-profiles');
      final error = DioException(
        requestOptions: request,
        response: Response<dynamic>(requestOptions: request, statusCode: 401),
      );

      DioException? forwardedError;
      await interceptor.onError(
        error,
        _CapturingErrorInterceptorHandler(
          onNext: (value) => forwardedError = value,
        ),
      );

      expect(forwardedError, same(error));
      verifyNever(() => authRepository.logout());
      await activeSession.close();
    },
  );
}

final class _CapturingErrorInterceptorHandler extends ErrorInterceptorHandler {
  _CapturingErrorInterceptorHandler({required this.onNext});

  final void Function(DioException error) onNext;

  @override
  void next(DioException error) => onNext(error);
}
