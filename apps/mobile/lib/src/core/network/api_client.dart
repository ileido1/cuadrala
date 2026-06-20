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

  Future<Map<String, Object?>> getJson(
    String path, {
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
  }) {
    return _requestJson(
      path,
      method: 'GET',
      queryParameters: queryParameters,
      headers: headers,
    );
  }

  Future<Map<String, Object?>> postJson(
    String path, {
    Object? body,
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
  }) {
    return _requestJson(
      path,
      method: 'POST',
      body: body,
      queryParameters: queryParameters,
      headers: headers,
    );
  }

  Future<Map<String, Object?>> patchJson(
    String path, {
    Object? body,
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
  }) {
    return _requestJson(
      path,
      method: 'PATCH',
      body: body,
      queryParameters: queryParameters,
      headers: headers,
    );
  }

  Future<Map<String, Object?>> putJson(
    String path, {
    Object? body,
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
  }) {
    return _requestJson(
      path,
      method: 'PUT',
      body: body,
      queryParameters: queryParameters,
      headers: headers,
    );
  }

  Future<Map<String, Object?>> postMultipart(
    String path, {
    required FormData formData,
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
  }) {
    return _requestJson(
      path,
      method: 'POST',
      body: formData,
      queryParameters: queryParameters,
      headers: headers,
      contentType: 'multipart/form-data',
    );
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

  Future<Map<String, Object?>> getEnvelopeDataMap(
    String path, {
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
    String? method,
    Map<String, Object?>? body,
  }) async {
    final json = await _requestJson(
      path,
      method: method,
      queryParameters: queryParameters,
      headers: headers,
      body: body,
    );
    return decodeEnvelopeDataMap(json);
  }

  Future<Map<String, Object?>> _requestJson(
    String path, {
    String? method,
    Map<String, Object?>? queryParameters,
    Map<String, Object?>? headers,
    Object? body,
    String? contentType,
  }) async {
    final m = method?.toUpperCase() ?? 'GET';
    try {
      final response = await _dio.request<Object?>(
        path,
        data: body,
        queryParameters: queryParameters,
        options: Options(method: m, headers: headers, contentType: contentType),
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
}
