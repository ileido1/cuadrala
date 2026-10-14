import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/auth/data/secure_token_storage.dart';

final class FlutterSecureTokenStorage implements SecureTokenStorage {
  FlutterSecureTokenStorage({required FlutterSecureStorage secureStorage})
    : _secureStorage = secureStorage;

  static const _refreshTokenKey = 'auth.refresh_token';
  static const _webPushOptInPrefix = 'push.web_opt_in.';

  final FlutterSecureStorage _secureStorage;

  String _webPushOptInKey(String userId) => '$_webPushOptInPrefix$userId';

  @override
  Future<bool> hasWebPushOptIn(String userId) async =>
      (await _secureStorage.read(key: _webPushOptInKey(userId))) == 'true';

  @override
  Future<void> writeWebPushOptIn(String userId) =>
      _secureStorage.write(key: _webPushOptInKey(userId), value: 'true');

  @override
  Future<void> deleteWebPushOptIn(String userId) =>
      _secureStorage.delete(key: _webPushOptInKey(userId));

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
