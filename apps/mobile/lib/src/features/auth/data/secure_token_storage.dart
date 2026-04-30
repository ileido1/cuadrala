abstract interface class SecureTokenStorage {
  Future<String?> readRefreshToken();
  Future<void> writeRefreshToken(String token);
  Future<void> deleteRefreshToken();
}
