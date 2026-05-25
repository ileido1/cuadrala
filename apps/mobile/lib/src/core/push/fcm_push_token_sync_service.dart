import 'dart:developer' as developer;
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/data/secure_token_storage.dart';
import '../../features/notifications/data/notifications_repository.dart';
import 'push_token_sync_service.dart';

/// Registro del token FCM en la API tras autenticación.
final class FcmPushTokenSyncService implements PushTokenSyncService {
  FcmPushTokenSyncService({
    required NotificationsRepository notificationsRepository,
    required SecureTokenStorage secureTokenStorage,
    required AuthRepository authRepository,
  })  : _notificationsRepository = notificationsRepository,
        _secureTokenStorage = secureTokenStorage,
        _authRepository = authRepository;

  final NotificationsRepository _notificationsRepository;
  final SecureTokenStorage _secureTokenStorage;
  final AuthRepository _authRepository;

  bool _initialized = false;
  bool _firebaseReady = false;

  @override
  Future<void> initialize() async {
    if (_initialized || kIsWeb) return;
    _initialized = true;

    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }
      _firebaseReady = true;
    } catch (e, st) {
      developer.log(
        'Firebase no disponible; push desactivado. '
        'Configura google-services.json / GoogleService-Info.plist.',
        name: 'FcmPushTokenSyncService',
        error: e,
        stackTrace: st,
      );
      return;
    }

    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    FirebaseMessaging.instance.onTokenRefresh.listen((_) {
      syncTokenIfAuthenticated();
    });
  }

  @override
  Future<void> syncTokenIfAuthenticated() async {
    if (kIsWeb || !_firebaseReady) return;

    final refresh = await _secureTokenStorage.readRefreshToken();
    if (refresh == null || refresh.isEmpty) {
      developer.log(
        'Sin refresh token; omitiendo registro FCM',
        name: 'FcmPushTokenSyncService',
      );
      return;
    }

    try {
      if (_authRepository.tokensInMemory?.accessToken == null ||
          _authRepository.tokensInMemory!.accessToken.isEmpty) {
        await _authRepository.refresh();
      }
      await _requestPermissionIfNeeded();
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null || token.length < 16) {
        developer.log(
          'FCM getToken() vacío (¿emulador sin Google Play o Firebase sin configurar?)',
          name: 'FcmPushTokenSyncService',
        );
        return;
      }

      await _notificationsRepository.registerPushToken(
        token: token,
        platform: _platformLabel(),
      );
      developer.log(
        'Token FCM registrado en API (${token.length} chars)',
        name: 'FcmPushTokenSyncService',
      );
    } catch (e, st) {
      developer.log(
        'No se pudo registrar token FCM',
        name: 'FcmPushTokenSyncService',
        error: e,
        stackTrace: st,
      );
    }
  }

  @override
  Future<void> clearOnLogout() async {
    if (kIsWeb) return;
    try {
      await _notificationsRepository.unregisterPushTokens();
    } catch (e, st) {
      developer.log(
        'No se pudieron desregistrar tokens push',
        name: 'FcmPushTokenSyncService',
        error: e,
        stackTrace: st,
      );
    }
    if (_firebaseReady) {
      try {
        await FirebaseMessaging.instance.deleteToken();
      } catch (_) {}
    }
  }

  Future<void> _requestPermissionIfNeeded() async {
    if (!Platform.isIOS && !Platform.isAndroid) return;
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
  }

  String? _platformLabel() {
    if (Platform.isAndroid) return 'android';
    if (Platform.isIOS) return 'ios';
    return null;
  }
}

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp();
  }
}
