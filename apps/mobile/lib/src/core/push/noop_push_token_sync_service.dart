import 'push_token_sync_service.dart';

/// Sin FCM (web, tests o Firebase no configurado).
final class NoopPushTokenSyncService implements PushTokenSyncService {
  @override
  bool get isWebPushAvailable => false;

  @override
  Future<void> initialize() async {}

  @override
  Future<void> syncTokenIfAuthenticated() async {}

  @override
  Future<bool> isWebPushEnabled() async => false;

  @override
  Future<PushEnrollmentResult> enableWebPush() async =>
      PushEnrollmentResult.unavailable;

  @override
  Future<void> clearOnLogout() async {}
}
