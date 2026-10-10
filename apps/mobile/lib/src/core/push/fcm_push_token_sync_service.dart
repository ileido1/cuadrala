import 'dart:developer' as developer;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/data/secure_token_storage.dart';
import '../../features/notifications/data/notifications_repository.dart';
import '../../features/profile/data/profile_repository.dart';
import '../env/app_env.dart';
import 'push_token_sync_service.dart';

/// Registro del token FCM en la API tras autenticación.
final class FcmPushTokenSyncService implements PushTokenSyncService {
  FcmPushTokenSyncService({
    required NotificationsRepository notificationsRepository,
    required SecureTokenStorage secureTokenStorage,
    required AuthRepository authRepository,
    required ProfileRepository profileRepository,
    AppEnv? appEnv,
    bool? isWebOverride,
  }) : _notificationsRepository = notificationsRepository,
       _secureTokenStorage = secureTokenStorage,
       _authRepository = authRepository,
       _profileRepository = profileRepository,
       _appEnv = appEnv ?? AppEnv.fromEnvironment(),
       _isWeb = isWebOverride ?? kIsWeb;

  final NotificationsRepository _notificationsRepository;
  final SecureTokenStorage _secureTokenStorage;
  final AuthRepository _authRepository;
  final ProfileRepository _profileRepository;
  final AppEnv _appEnv;
  final bool _isWeb;

  bool _initialized = false;
  bool _firebaseReady = false;
  bool _webPushEnabled = false;
  String? _webPushUserId;

  @override
  bool get isWebPushAvailable => _isWeb && _appEnv.hasWebPushConfiguration;

  @override
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    if (_isWeb && !isWebPushAvailable) return;

    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(options: _isWeb ? _webOptions() : null);
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
    FirebaseMessaging.instance.onTokenRefresh.listen((token) {
      if (_isWeb && !_webPushEnabled) return;
      _registerTokenIfAuthenticated(token: token);
    });
  }

  @override
  Future<bool> isWebPushEnabled() async {
    if (!_isWeb || !isWebPushAvailable || !_firebaseReady) return false;
    return _hasWebPushOptIn();
  }

  @override
  Future<PushEnrollmentResult> enableWebPush() async {
    if (!_isWeb) return PushEnrollmentResult.unavailable;
    await initialize();
    if (!isWebPushAvailable || !_firebaseReady) {
      return PushEnrollmentResult.unavailable;
    }

    try {
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      if (settings.authorizationStatus != AuthorizationStatus.authorized &&
          settings.authorizationStatus != AuthorizationStatus.provisional) {
        return PushEnrollmentResult.permissionDenied;
      }
      final token = await FirebaseMessaging.instance.getToken(
        vapidKey: _appEnv.firebaseWebVapidKey,
      );
      if (token == null || token.length < 16) {
        return PushEnrollmentResult.failed;
      }
      final userId = await _currentUserId();
      if (userId == null) return PushEnrollmentResult.failed;
      final registered = await _registerTokenIfAuthenticated(token: token);
      if (!registered) return PushEnrollmentResult.failed;
      await _secureTokenStorage.writeWebPushOptIn(userId);
      _webPushUserId = userId;
      _webPushEnabled = true;
      return PushEnrollmentResult.enabled;
    } catch (e, st) {
      developer.log(
        'No se pudo registrar token FCM web',
        name: 'FcmPushTokenSyncService',
        error: e,
        stackTrace: st,
      );
      return PushEnrollmentResult.failed;
    }
  }

  @override
  Future<void> syncTokenIfAuthenticated() async {
    if (!_firebaseReady) return;
    if (_isWeb) {
      if (!await _hasWebPushOptIn()) return;
      final token = await FirebaseMessaging.instance.getToken(
        vapidKey: _appEnv.firebaseWebVapidKey,
      );
      if (token == null || token.length < 16) return;
      await _registerTokenIfAuthenticated(token: token);
      return;
    }

    final permitted = await _requestPermissionIfNeeded();
    if (!permitted) return;
    final token = await FirebaseMessaging.instance.getToken();
    if (token == null || token.length < 16) {
      developer.log(
        'FCM getToken() vacío (¿emulador sin Google Play o Firebase sin configurar?)',
        name: 'FcmPushTokenSyncService',
      );
      return;
    }
    await _registerTokenIfAuthenticated(token: token);
  }

  Future<bool> _hasWebPushOptIn() async {
    final userId = await _currentUserId();
    if (userId == null) return false;
    _webPushUserId = userId;
    _webPushEnabled = await _secureTokenStorage.hasWebPushOptIn(userId);
    return _webPushEnabled;
  }

  Future<String?> _currentUserId() async {
    try {
      return (await _profileRepository.getMe()).id;
    } catch (_) {
      return null;
    }
  }

  Future<bool> _registerTokenIfAuthenticated({required String token}) async {
    final refresh = await _secureTokenStorage.readRefreshToken();
    if (refresh == null || refresh.isEmpty) {
      developer.log(
        'Sin refresh token; omitiendo registro FCM',
        name: 'FcmPushTokenSyncService',
      );
      return false;
    }

    try {
      if (_authRepository.tokensInMemory?.accessToken == null ||
          _authRepository.tokensInMemory!.accessToken.isEmpty) {
        await _authRepository.refresh();
      }
      await _notificationsRepository.registerPushToken(
        token: token,
        platform: _isWeb ? null : _platformLabel(),
      );
      developer.log(
        'Token FCM registrado en API (${token.length} chars)',
        name: 'FcmPushTokenSyncService',
      );
      return true;
    } catch (e, st) {
      developer.log(
        'No se pudo registrar token FCM',
        name: 'FcmPushTokenSyncService',
        error: e,
        stackTrace: st,
      );
      return false;
    }
  }

  @override
  Future<void> clearOnLogout() async {
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
    if (_isWeb) {
      final userId = await _currentUserId() ?? _webPushUserId;
      if (userId != null) {
        try {
          await _secureTokenStorage.deleteWebPushOptIn(userId);
        } catch (e, st) {
          developer.log(
            'No se pudo limpiar el consentimiento push web',
            name: 'FcmPushTokenSyncService',
            error: e,
            stackTrace: st,
          );
        }
      }
    }
    _webPushEnabled = false;
    _webPushUserId = null;
    if (_firebaseReady) {
      try {
        await FirebaseMessaging.instance.deleteToken();
      } catch (_) {}
    }
  }

  FirebaseOptions _webOptions() => FirebaseOptions(
    apiKey: _appEnv.firebaseWebApiKey!,
    appId: _appEnv.firebaseWebAppId!,
    messagingSenderId: _appEnv.firebaseWebMessagingSenderId!,
    projectId: _appEnv.firebaseWebProjectId!,
    authDomain: _appEnv.firebaseWebAuthDomain,
    storageBucket: _appEnv.firebaseWebStorageBucket,
  );

  /// Devuelve `true` cuando corresponde continuar con el registro del token
  /// (`authorized`/`provisional` o plataforma no móvil) y `false` cuando el
  /// permiso fue denegado o el usuario descartó el diálogo (`notDetermined`).
  Future<bool> _requestPermissionIfNeeded() async {
    if (defaultTargetPlatform != TargetPlatform.android &&
        defaultTargetPlatform != TargetPlatform.iOS) {
      return true;
    }
    final settings = await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    final status = settings.authorizationStatus;
    if (status == AuthorizationStatus.denied ||
        status == AuthorizationStatus.notDetermined) {
      developer.log(
        'Permiso de notificaciones denegado ($status); omitiendo registro FCM',
        name: 'FcmPushTokenSyncService',
      );
      return false;
    }
    return true;
  }

  String? _platformLabel() {
    if (defaultTargetPlatform == TargetPlatform.android) return 'android';
    if (defaultTargetPlatform == TargetPlatform.iOS) return 'ios';
    return null;
  }
}

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp();
  }
}
