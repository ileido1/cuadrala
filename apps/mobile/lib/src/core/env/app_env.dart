final class AppEnv {
  const AppEnv({
    required this.baseUrl,
    this.googleWebClientId,
    this.firebaseWebApiKey,
    this.firebaseWebAppId,
    this.firebaseWebMessagingSenderId,
    this.firebaseWebProjectId,
    this.firebaseWebVapidKey,
    this.firebaseWebAuthDomain,
    this.firebaseWebStorageBucket,
  });

  final String baseUrl;

  /// Web OAuth Client ID (serverClientId) para obtener `idToken` en Google Sign-In.
  final String? googleWebClientId;
  final String? firebaseWebApiKey;
  final String? firebaseWebAppId;
  final String? firebaseWebMessagingSenderId;
  final String? firebaseWebProjectId;
  final String? firebaseWebVapidKey;
  final String? firebaseWebAuthDomain;
  final String? firebaseWebStorageBucket;

  bool get hasWebPushConfiguration =>
      _hasValue(firebaseWebApiKey) &&
      _hasValue(firebaseWebAppId) &&
      _hasValue(firebaseWebMessagingSenderId) &&
      _hasValue(firebaseWebProjectId) &&
      _hasValue(firebaseWebVapidKey);

  factory AppEnv.fromEnvironment() {
    const baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    const googleWebClientId = String.fromEnvironment(
      'GOOGLE_WEB_CLIENT_ID',
      defaultValue: '',
    );
    return AppEnv(
      baseUrl: baseUrl.isEmpty ? 'http://localhost:4000' : baseUrl,
      googleWebClientId: _optional(googleWebClientId),
      firebaseWebApiKey: _optional(
        const String.fromEnvironment('FIREBASE_WEB_API_KEY'),
      ),
      firebaseWebAppId: _optional(
        const String.fromEnvironment('FIREBASE_WEB_APP_ID'),
      ),
      firebaseWebMessagingSenderId: _optional(
        const String.fromEnvironment('FIREBASE_WEB_MESSAGING_SENDER_ID'),
      ),
      firebaseWebProjectId: _optional(
        const String.fromEnvironment('FIREBASE_WEB_PROJECT_ID'),
      ),
      firebaseWebVapidKey: _optional(
        const String.fromEnvironment('FIREBASE_WEB_VAPID_KEY'),
      ),
      firebaseWebAuthDomain: _optional(
        const String.fromEnvironment('FIREBASE_WEB_AUTH_DOMAIN'),
      ),
      firebaseWebStorageBucket: _optional(
        const String.fromEnvironment('FIREBASE_WEB_STORAGE_BUCKET'),
      ),
    );
  }

  static bool _hasValue(String? value) => value != null && value.isNotEmpty;
  static String? _optional(String value) => value.isEmpty ? null : value;
}
