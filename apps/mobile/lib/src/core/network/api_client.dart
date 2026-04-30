import 'package:dio/dio.dart';

import '../failures/app_failure.dart';
import '../failures/app_failure_mapper.dart';

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
}
