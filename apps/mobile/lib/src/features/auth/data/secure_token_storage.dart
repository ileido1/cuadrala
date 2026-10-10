abstract interface class SecureTokenStorage {
  Future<String?> readRefreshToken();
  Future<void> writeRefreshToken(String token);
  Future<void> deleteRefreshToken();

  Future<bool> hasWebPushOptIn(String userId);
  Future<void> writeWebPushOptIn(String userId);
  Future<void> deleteWebPushOptIn(String userId);
}
