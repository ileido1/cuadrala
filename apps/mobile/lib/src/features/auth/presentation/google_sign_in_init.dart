/// Inicialización compartida de `GoogleSignIn.instance`.
///
/// El plugin es un singleton y solo admite una llamada a `initialize()` por
/// app: en web la segunda lanza `StateError`. Memorizarlo por pantalla no
/// alcanza, porque cada LoginScreen nueva volvía a inicializar
/// (CUADRALA-MOBILE-7). Por eso vive a nivel de archivo.
Future<void>? _googleInit;

/// Ejecuta [initialize] una sola vez por app y devuelve siempre el mismo
/// future. Si falla, se olvida para que el próximo intento reintente.
Future<void> ensureGoogleSignInInitialized(
  Future<void> Function() initialize,
) => _googleInit ??= initialize().catchError((Object e, StackTrace st) {
  _googleInit = null;
  Error.throwWithStackTrace(e, st);
});
