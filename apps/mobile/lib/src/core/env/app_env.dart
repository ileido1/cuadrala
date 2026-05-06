final class AppEnv {
  const AppEnv({
    required this.baseUrl,
    this.googleWebClientId,
  });

  final String baseUrl;
  /// Web OAuth Client ID (serverClientId) para obtener `idToken` en Google Sign-In.
  final String? googleWebClientId;

  factory AppEnv.fromEnvironment() {
    const baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    const googleWebClientId =
        String.fromEnvironment('GOOGLE_WEB_CLIENT_ID', defaultValue: '');
    if (baseUrl.isEmpty) {
      return AppEnv(
        baseUrl: 'http://localhost:4000',
        googleWebClientId: googleWebClientId.isEmpty ? null : googleWebClientId,
      );
    }
    return AppEnv(
      baseUrl: baseUrl,
      googleWebClientId: googleWebClientId.isEmpty ? null : googleWebClientId,
    );
  }
}
