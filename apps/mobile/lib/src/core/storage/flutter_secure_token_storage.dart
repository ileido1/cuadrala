import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/auth/data/secure_token_storage.dart';

final class FlutterSecureTokenStorage implements SecureTokenStorage {
  FlutterSecureTokenStorage({required FlutterSecureStorage secureStorage})
      : _secureStorage = secureStorage;

  static const _refreshTokenKey = 'auth.refresh_token';

  final FlutterSecureStorage _secureStorage;

  @override
  Future<void> deleteRefreshToken() {
    return _secureStorage.delete(key: _refreshTokenKey);
  }

  @override
  Future<String?> readRefreshToken() {
    return _secureStorage.read(key: _refreshTokenKey);
  }

  @override
  Future<void> writeRefreshToken(String token) {
    return _secureStorage.write(key: _refreshTokenKey, value: token);
  }
}
