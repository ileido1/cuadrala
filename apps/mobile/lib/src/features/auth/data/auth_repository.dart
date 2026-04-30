import '../../../core/failures/app_failure.dart';
import 'auth_api.dart';
import 'models/auth_tokens.dart';
import 'models/login_request.dart';
import 'models/register_request.dart';
import 'secure_token_storage.dart';

class AuthRepository {
  AuthRepository({
    required AuthApi authApi,
    required SecureTokenStorage secureTokenStorage,
  })  : _authApi = authApi,
        _secureTokenStorage = secureTokenStorage;

  final AuthApi _authApi;
  final SecureTokenStorage _secureTokenStorage;

  AuthTokens? _tokensInMemory;

  AuthTokens? get tokensInMemory => _tokensInMemory;

  Future<AuthTokens> login(LoginRequest request) async {
    final tokens = await _authApi.login(request);
    await _secureTokenStorage.writeRefreshToken(tokens.refreshToken);
    _tokensInMemory = tokens;
    return tokens;
  }

  Future<AuthTokens> register(RegisterRequest request) async {
    final tokens = await _authApi.register(request);
    await _secureTokenStorage.writeRefreshToken(tokens.refreshToken);
    _tokensInMemory = tokens;
    return tokens;
  }

  Future<AuthTokens> refresh() async {
    final refreshToken = await _secureTokenStorage.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      throw const AppFailure(
        code: 'AUTH_NO_REFRESH_TOKEN',
        message: 'No hay sesión guardada. Inicia sesión nuevamente.',
      );
    }
    final tokens = await _authApi.refresh(refreshToken: refreshToken);
    await _secureTokenStorage.writeRefreshToken(tokens.refreshToken);
    _tokensInMemory = tokens;
    return tokens;
  }

  Future<AppFailure> refreshOrFailure() async {
    try {
      await refresh();
      return const AppFailure(code: 'OK', message: 'OK');
    } catch (e) {
      return e is AppFailure
          ? e
          : const AppFailure(
              code: 'AUTH_REFRESH_FAILED',
              message: 'No se pudo refrescar la sesión.',
            );
    }
  }

  Future<void> logout() async {
    final refreshToken = await _secureTokenStorage.readRefreshToken();
    try {
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _authApi.logout(refreshToken: refreshToken);
      }
    } catch (_) {
      // fallback offline: limpiamos local igual
    } finally {
      _tokensInMemory = null;
      await _secureTokenStorage.deleteRefreshToken();
    }
  }
}
