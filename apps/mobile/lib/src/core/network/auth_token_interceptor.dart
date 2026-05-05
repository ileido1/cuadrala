import 'package:dio/dio.dart';

import '../../features/auth/data/auth_repository.dart';

typedef AuthTokenRefresher = Future<void> Function();

final class AuthTokenInterceptor extends Interceptor {
  AuthTokenInterceptor({
    required AuthRepository authRepository,
    required AuthTokenRefresher refreshSession,
  })  : _authRepository = authRepository,
        _refreshSession = refreshSession;

  final AuthRepository _authRepository;
  final AuthTokenRefresher _refreshSession;

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
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
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
    } catch (_) {
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
          extra: {
            ...requestOptions.extra,
            _retryExtraKey: true,
          },
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
}
