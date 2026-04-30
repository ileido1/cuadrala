import '../../../core/network/api_client.dart';
import 'models/auth_tokens.dart';
import 'models/login_request.dart';
import 'models/register_request.dart';

abstract interface class AuthApi {
  Future<AuthTokens> login(LoginRequest request);
  Future<AuthTokens> register(RegisterRequest request);
  Future<AuthTokens> refresh({required String refreshToken});
  Future<void> logout({required String refreshToken});
}

final class DioAuthApi implements AuthApi {
  const DioAuthApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<AuthTokens> login(LoginRequest request) async {
    final json = await _apiClient.postJson(
      '/api/v1/auth/login',
      body: request.toJson(),
    );
    return _decodeAuthTokens(json);
  }

  @override
  Future<AuthTokens> refresh({required String refreshToken}) async {
    final json = await _apiClient.postJson(
      '/api/v1/auth/refresh',
      body: {'refreshToken': refreshToken},
    );
    return _decodeAuthTokens(json);
  }

  @override
  Future<AuthTokens> register(RegisterRequest request) async {
    final json = await _apiClient.postJson(
      '/api/v1/auth/register',
      body: request.toJson(),
    );
    return _decodeAuthTokens(json);
  }

  @override
  Future<void> logout({required String refreshToken}) async {
    await _apiClient.postJson(
      '/api/v1/auth/logout',
      body: {'refreshToken': refreshToken},
    );
  }

  AuthTokens _decodeAuthTokens(Map<String, Object?> json) {
    final data = json['data'];
    if (data is Map<String, Object?>) {
      final accessToken = data['accessToken'];
      final refreshToken = data['refreshToken'];
      if (accessToken is String && refreshToken is String) {
        return AuthTokens(accessToken: accessToken, refreshToken: refreshToken);
      }
    }
    throw const FormatException('Respuesta Auth inválida');
  }
}
