import 'package:dio/dio.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import '../../features/auth/data/auth_repository.dart';
import '../failures/app_failure.dart';

typedef AuthTokenRefresher = Future<void> Function();
typedef AuthRefreshFailureHandler = Future<void> Function();

final class AuthTokenInterceptor extends Interceptor {
  AuthTokenInterceptor({
    required AuthRepository authRepository,
    required AuthTokenRefresher refreshSession,
    AuthRefreshFailureHandler? onRefreshFailure,
  }) : _authRepository = authRepository,
       _refreshSession = refreshSession,
       _onRefreshFailure = onRefreshFailure;

  final AuthRepository _authRepository;
  final AuthTokenRefresher _refreshSession;
  final AuthRefreshFailureHandler? _onRefreshFailure;

  static const _retryExtraKey = 'auth_retry';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final path = options.path;
    if (path.startsWith('/api/v1/auth/')) {
      return handler.next(options);
    }

    final token = _authRepository.tokensInMemory?.accessToken;
    if (token != null && token.isNotEmpty) {
      options.headers['authorization'] = 'Bearer $token';
    }

    return handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final response = err.response;
    if (response?.statusCode != 401) {
      return handler.next(err);
    }

    final requestOptions = err.requestOptions;
    if (requestOptions.path.startsWith('/api/v1/auth/')) {
      return handler.next(err);
    }

    final alreadyRetried = requestOptions.extra[_retryExtraKey] == true;
    if (alreadyRetried) {
      return handler.next(err);
    }

    try {
      await _refreshSession();
    } catch (error) {
      // Solo un rechazo DEFINITIVO del backend (o la ausencia local del
      // refresh token) significa que la sesión está realmente muerta. Un
      // fallo ambiguo (red, timeout, 5xx, error desconocido) no lo prueba:
      // tratarlo igual mataba sesiones válidas cuando varias llamadas
      // autenticadas concurrentes (p. ej. al entrar a onboarding) pisaban
      // un refresh que solo falló de forma transitoria (issue #137).
      //? Un request que salió sin token no prueba que haya una sesión que
      //? cerrar: cerrarla igual formaba el bucle de logout de 1.7.28.
      final hadSession = requestOptions.headers['authorization'] is String;
      if (hadSession && isDefinitiveSessionFailure(error)) {
        Sentry.logger.warn(
          'Refresh rechazado: sesión muerta, se dispara logout global',
          attributes: {
            'cuadrala.auth.refresh_rejected_reason': SentryAttribute.string(
              error is AppFailure ? error.code : 'unknown',
            ),
          },
        );
        await _notifyRefreshFailure();
      } else {
        // Fallo ambiguo (red, timeout, 5xx): se trata como transitorio y NO
        // mata la sesión (issue #137). Queda en INFO para poder auditar si
        // este swallow está ocultando un problema real del backend.
        Sentry.logger.info(
          'Refresh falló de forma ambigua, sesión se mantiene',
          attributes: {
            'cuadrala.auth.refresh_ambiguous_error': SentryAttribute.string(
              error.runtimeType.toString(),
            ),
          },
        );
      }
      return handler.next(err);
    }

    final token = _authRepository.tokensInMemory?.accessToken;
    if (token == null || token.isEmpty) {
      return handler.next(err);
    }

    try {
      final dio = err.requestOptions.extra['dio'] as Dio?;
      if (dio == null) {
        return handler.next(err);
      }

      final newRequest = await dio.fetch<dynamic>(
        requestOptions.copyWith(
          headers: {
            ...requestOptions.headers,
            'authorization': 'Bearer $token',
          },
          extra: {...requestOptions.extra, _retryExtraKey: true},
        ),
      );

      return handler.resolve(newRequest);
    } catch (e) {
      if (e is DioException) {
        return handler.next(e);
      }
      return handler.next(err);
    }
  }

  Future<void> _notifyRefreshFailure() async {
    if (_onRefreshFailure == null) return;
    try {
      await _onRefreshFailure();
    } catch (_) {
      // La sesión se considera inválida aunque falle la limpieza remota.
    }
  }
}
