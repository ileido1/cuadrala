/// Resultado de una solicitud explícita de registro web.
enum PushEnrollmentResult { enabled, unavailable, permissionDenied, failed }

/// Sincroniza el token FCM del dispositivo con la API tras login.
abstract class PushTokenSyncService {
  /// Indica si la configuración pública permite el registro de push web.
  bool get isWebPushAvailable;

  /// Inicializa Firebase/FCM y listeners (idempotente).
  Future<void> initialize();

  /// Registra el token en el backend si hay sesión activa.
  Future<void> syncTokenIfAuthenticated();

  /// Lee el estado persistido de consentimiento para la cuenta actual.
  Future<bool> isWebPushEnabled();

  /// Solicita permiso y registra el token sólo tras una acción explícita web.
  Future<PushEnrollmentResult> enableWebPush();

  /// Deshabilita tokens del usuario antes de cerrar sesión.
  Future<void> clearOnLogout();
}
