/// Sincroniza el token FCM del dispositivo con la API tras login.
abstract class PushTokenSyncService {
  /// Inicializa Firebase/FCM y listeners (idempotente).
  Future<void> initialize();

  /// Registra el token en el backend si hay sesión activa.
  Future<void> syncTokenIfAuthenticated();

  /// Deshabilita tokens del usuario antes de cerrar sesión.
  Future<void> clearOnLogout();
}
