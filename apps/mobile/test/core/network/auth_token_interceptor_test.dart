import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/network/auth_token_interceptor.dart';
import 'package:cuadrala_mobile/src/core/push/push_token_sync_service.dart';
import 'package:cuadrala_mobile/src/features/auth/data/auth_repository.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

class _MockPushTokenSyncService extends Mock implements PushTokenSyncService {}

void main() {
  test('refresh failure invalidates the active session instance', () async {
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
      refreshSession: () async => throw Exception('refresh failed'),
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
}

final class _CapturingErrorInterceptorHandler extends ErrorInterceptorHandler {
  _CapturingErrorInterceptorHandler({required this.onNext});

  final void Function(DioException error) onNext;

  @override
  void next(DioException error) => onNext(error);
}
