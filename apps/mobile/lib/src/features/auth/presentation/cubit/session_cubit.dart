import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/push/push_token_sync_service.dart';
import '../../../onboarding/data/onboarding_repository.dart';
import '../../data/auth_repository.dart';
import 'session_state.dart';

class SessionCubit extends Cubit<SessionState> {
  SessionCubit({
    required AuthRepository authRepository,
    required OnboardingRepository onboardingRepository,
    required PushTokenSyncService pushTokenSyncService,
  }) : _authRepository = authRepository,
       _onboardingRepository = onboardingRepository,
       _pushTokenSyncService = pushTokenSyncService,
       super(const SessionState.unauthenticated());

  final AuthRepository _authRepository;
  final OnboardingRepository _onboardingRepository;
  final PushTokenSyncService _pushTokenSyncService;

  Future<void> bootstrap() async {
    emit(const SessionState.loading());
    try {
      await _authRepository.refresh();
    } catch (error) {
      //? Solo un rechazo definitivo borra la sesión guardada. Sin red, un
      //? timeout o un 5xx no prueban nada: borrar el refresh token ahí
      //? perdía para siempre una sesión válida.
      if (isDefinitiveSessionFailure(error)) {
        await _authRepository.logout();
        emit(const SessionState.unauthenticated(reason: 'Sesión expirada'));
      } else {
        emit(
          const SessionState.unauthenticated(
            reason:
                'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.',
          ),
        );
      }
      return;
    }
    _syncPushTokenInBackground();
    final onboardingComplete = await _resolveOnboardingCompleteSV();
    emit(SessionState.authenticated(onboardingComplete: onboardingComplete));
  }

  /// El push es accesorio a la sesión: no se espera (en mobile pide permiso
  /// con un diálogo) y su fallo (p. ej. Firebase no soportado en el
  /// navegador) no debe cerrar ni frenar el login.
  void _syncPushTokenInBackground() {
    _pushTokenSyncService.syncTokenIfAuthenticated().catchError((Object _) {});
  }

  /// Evita logouts anidados: `clearOnLogout` hace requests autenticados; sin
  /// sesión responden 401, el interceptor no puede refrescar y vuelve a
  /// llamar a `logout()`. Eso formaba un bucle infinito y, si el usuario
  /// iniciaba sesión en medio, cada nivel pendiente borraba sus tokens nuevos.
  bool _loggingOut = false;

  Future<void> logout() async {
    //? Sin sesión no hay nada que cerrar. Re-emitir loading → unauthenticated
    //? hacía que el router remontara pantallas cuyos requests sin token
    //? devolvían 401 y volvían a llamar a logout (bucle en 1.7.28).
    if (_loggingOut || state is SessionUnauthenticated) return;
    _loggingOut = true;
    try {
      emit(const SessionState.loading());
      await _pushTokenSyncService.clearOnLogout();
      await _authRepository.logout();
      emit(const SessionState.unauthenticated());
    } finally {
      _loggingOut = false;
    }
  }

  /// Útil después de login/register: los tokens ya se guardaron en storage.
  ///
  /// Resuelve el estado real de onboarding ANTES de emitir: GoRouter
  /// (`GoRouterRefreshStream`) reacciona a cada emit del cubit, y
  /// `auth_redirect.dart` manda `onboardingComplete == null` en una ruta de
  /// auth a `/home`. Emitir `authenticated()` sin el dato real como paso
  /// intermedio hacía rebotar /login → /home → /onboarding en cada
  /// login/registro con onboarding pendiente.
  Future<void> markAuthenticated() async {
    _syncPushTokenInBackground();
    final onboardingComplete = await _resolveOnboardingCompleteSV();
    emit(SessionState.authenticated(onboardingComplete: onboardingComplete));
  }

  /// Re-consulta el estado de onboarding (útil cuando el usuario completa el último paso).
  Future<void> refreshOnboardingStatus() async {
    if (state is! SessionAuthenticated) return;
    try {
      final status = await _onboardingRepository.getStatus();
      emit(SessionState.authenticated(onboardingComplete: status.isComplete));
    } catch (_) {
      // Si falla la consulta, conservamos el estado actual.
    }
  }

  Future<bool?> _resolveOnboardingCompleteSV() async {
    try {
      final status = await _onboardingRepository.getStatus();
      return status.isComplete;
    } catch (_) {
      // Si falla la consulta, la UI tratará `null` como "desconocido".
      return null;
    }
  }
}
