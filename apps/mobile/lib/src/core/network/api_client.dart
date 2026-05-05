import 'package:dio/dio.dart';

import '../failures/app_failure.dart';
import '../failures/app_failure_mapper.dart';
import 'api_json.dart';

final class ApiClient {
  ApiClient({required Dio dio, required AppFailureMapper failureMapper})
      : _dio = dio,
        _failureMapper = failureMapper;

  final Dio _dio;
  final AppFailureMapper _failureMapper;

  Future<Map<String, Object?>> postJson(
    String path, {
    Object? body,
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
  }) async {
    try {
      final response = await _dio.post<Object?>(
        path,
        data: body,
        queryParameters: queryParameters,
        options: Options(headers: headers),
      );

      final data = response.data;
      if (data is Map<String, Object?>) {
        return data;
      }
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    } catch (e) {
      throw _failureMapper.fromException(e);
    }
  }

  Future<void> postNoContent(
    String path, {
    Object? body,
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
  }) async {
    try {
      await _dio.post<Object?>(
        path,
        data: body,
        queryParameters: queryParameters,
        options: Options(headers: headers),
      );
    } catch (e) {
      throw _failureMapper.fromException(e);
    }
  }

  Future<Map<String, Object?>> getJson(
    String path, {
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
  }) async {
    try {
      final response = await _dio.get<Object?>(
        path,
        queryParameters: queryParameters,
        options: Options(headers: headers),
      );

      final data = response.data;
      if (data is Map<String, Object?>) {
        return data;
      }
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    } catch (e) {
      throw _failureMapper.fromException(e);
    }
  }

  Future<Map<String, Object?>> patchJson(
    String path, {
    Object? body,
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
  }) async {
    try {
      final response = await _dio.patch<Object?>(
        path,
        data: body,
        queryParameters: queryParameters,
        options: Options(headers: headers),
      );

      final data = response.data;
      if (data is Map<String, Object?>) {
        return data;
      }
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    } catch (e) {
      throw _failureMapper.fromException(e);
    }
  }

  Future<Map<String, Object?>> putJson(
    String path, {
    Object? body,
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
  }) async {
    try {
      final response = await _dio.put<Object?>(
        path,
        data: body,
        queryParameters: queryParameters,
        options: Options(headers: headers),
      );

      final data = response.data;
      if (data is Map<String, Object?>) {
        return data;
      }
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    } catch (e) {
      throw _failureMapper.fromException(e);
    }
  }

  Future<Map<String, Object?>> getEnvelopeDataMap(
    String path, {
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
  }) async {
    final json = await getJson(
      path,
      queryParameters: queryParameters,
      headers: headers,
    );
    return decodeEnvelopeDataMap(json);
  }
}
