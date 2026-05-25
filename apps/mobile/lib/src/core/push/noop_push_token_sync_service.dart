import 'push_token_sync_service.dart';

/// Sin FCM (web, tests o Firebase no configurado).
final class NoopPushTokenSyncService implements PushTokenSyncService {
  @override
  Future<void> initialize() async {}

  @override
  Future<void> syncTokenIfAuthenticated() async {}

  @override
  Future<void> clearOnLogout() async {}
}
