import 'package:dio/dio.dart';

final class InjectDioExtraInterceptor extends Interceptor {
  InjectDioExtraInterceptor({required Dio dio}) : _dio = dio;

  final Dio _dio;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.extra['dio'] = _dio;
    handler.next(options);
  }
}
