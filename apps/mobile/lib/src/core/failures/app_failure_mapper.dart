import 'dart:io';

import 'package:dio/dio.dart';

import 'app_failure.dart';

final class AppFailureMapper {
  AppFailure fromException(Object error) {
    if (error is AppFailure) {
      return error;
    }
    if (error is DioException) {
      return _fromDioException(error);
    }
    if (error is SocketException) {
      return const AppFailure(
        code: 'NETWORK_OFFLINE',
        message: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
      );
    }
    return AppFailure(
      code: 'UNKNOWN',
      message: 'Ocurrió un error inesperado. Inténtalo nuevamente.',
      details: error,
    );
  }

  AppFailure fromHttp({
    required int statusCode,
    String? backendCode,
    String? backendMessage,
    Object? details,
  }) {
    if (statusCode == 401) {
      return const AppFailure(
        code: 'AUTH_UNAUTHORIZED',
        message: 'Sesión expirada. Inicia sesión nuevamente.',
      );
    }
    return AppFailure(
      code: backendCode ?? 'HTTP_$statusCode',
      message: backendMessage?.isNotEmpty == true
          ? backendMessage!
          : 'No se pudo completar la operación. Inténtalo de nuevo.',
      details: details,
    );
  }

  AppFailure _fromDioException(DioException ex) {
    if (ex.error is SocketException) {
      return const AppFailure(
        code: 'NETWORK_OFFLINE',
        message: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
      );
    }
    final statusCode = ex.response?.statusCode;
    if (statusCode != null) {
      final data = ex.response?.data;
      if (data is Map<String, Object?>) {
        final success = data['success'];
        if (success == false) {
          return fromHttp(
            statusCode: statusCode,
            backendCode: data['code'] as String?,
            backendMessage: data['message'] as String?,
            details: data['details'],
          );
        }
      }
      return fromHttp(
        statusCode: statusCode,
        backendMessage: 'No se pudo completar la operación. Inténtalo de nuevo.',
      );
    }

    return switch (ex.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.receiveTimeout ||
      DioExceptionType.sendTimeout =>
        const AppFailure(
          code: 'NETWORK_TIMEOUT',
          message: 'La conexión tardó demasiado. Inténtalo de nuevo.',
        ),
      _ => AppFailure(
          code: 'NETWORK_ERROR',
          message: 'No se pudo conectar con el servidor. Inténtalo de nuevo.',
          details: ex,
        ),
    };
  }
}
