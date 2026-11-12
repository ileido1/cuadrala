import '../../../core/failures/app_failure.dart';
import 'auth_api.dart';
import 'models/auth_tokens.dart';
import 'models/login_request.dart';
import 'models/register_request.dart';
import 'models/social_login_request.dart';
import 'secure_token_storage.dart';

/// `true` solo cuando la sesión está realmente muerta: el backend rechazó el
/// refresh (`AUTH_UNAUTHORIZED`) o no hay refresh token guardado. Red, timeout
/// o 5xx son ambiguos y no prueban nada (issue #137).
bool isDefinitiveSessionFailure(Object error) {
  return error is AppFailure &&
      (error.code == 'AUTH_UNAUTHORIZED' ||
          error.code == 'AUTH_NO_REFRESH_TOKEN');
}

class AuthRepository {
  AuthRepository({
    required AuthApi authApi,
    required SecureTokenStorage secureTokenStorage,
  }) : _authApi = authApi,
       _secureTokenStorage = secureTokenStorage;

  final AuthApi _authApi;
  final SecureTokenStorage _secureTokenStorage;

  AuthTokens? _tokensInMemory;

  AuthTokens? get tokensInMemory => _tokensInMemory;

  /// Request de refresh en vuelo, compartido entre llamadas concurrentes
  /// (ver [refresh]).
  Future<AuthTokens>? _inFlightRefresh;

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

  Future<AuthTokens> socialLogin(SocialLoginRequest request) async {
    final tokens = await _authApi.socialLogin(request);
    await _secureTokenStorage.writeRefreshToken(tokens.refreshToken);
    _tokensInMemory = tokens;
    return tokens;
  }

  /// El backend rota el refresh token en cada uso (single-use): si dos
  /// llamadores concurrentes (p. ej. dos requests 401 al mismo tiempo, vía
  /// `AuthTokenInterceptor`) dispararan cada uno su propio request, el que
  /// pierde la carrera usaría un token ya invalidado por el otro y fallaría,
  /// forzando un logout aunque la sesión seguía siendo válida. Por eso todo
  /// llamador mientras haya un refresh en curso espera ese MISMO Future en
  /// vez de iniciar uno nuevo — el backend nunca ve más de un request real
  /// por episodio de refresh.
  Future<AuthTokens> refresh() {
    final inFlight = _inFlightRefresh;
    if (inFlight != null) return inFlight;

    final request = _performRefreshSV();
    _inFlightRefresh = request;
    // `whenComplete` devuelve otro future que hereda el error; sin `ignore()`
    // ese derivado quedaba sin escuchar y llegaba a Sentry como no capturado
    // aunque el llamador sí manejara el fallo (CUADRALA-MOBILE-4).
    request.whenComplete(() => _inFlightRefresh = null).ignore();
    return request;
  }

  Future<AuthTokens> _performRefreshSV() async {
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
