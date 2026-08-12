// ignore_for_file: invalid_use_of_protected_member
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_core_platform_interface/firebase_core_platform_interface.dart'
    show FirebaseAppPlatform, FirebasePlatform;
import 'package:firebase_messaging_platform_interface/firebase_messaging_platform_interface.dart';
import 'package:flutter/foundation.dart'
    show TargetPlatform, debugDefaultTargetPlatformOverride;
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

import 'package:cuadrala_mobile/src/core/push/fcm_push_token_sync_service.dart';
import 'package:cuadrala_mobile/src/features/auth/data/auth_repository.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/auth_tokens.dart';
import 'package:cuadrala_mobile/src/features/auth/data/secure_token_storage.dart';
import 'package:cuadrala_mobile/src/features/notifications/data/notifications_repository.dart';

class MockFirebaseMessagingPlatform extends Mock
    with MockPlatformInterfaceMixin
    implements FirebaseMessagingPlatform {}

class MockFirebasePlatform extends Mock
    with MockPlatformInterfaceMixin
    implements FirebasePlatform {}

class FakeFirebaseApp extends Fake implements FirebaseApp {}

class MockSecureTokenStorage extends Mock implements SecureTokenStorage {}

class MockAuthRepository extends Mock implements AuthRepository {}

class MockNotificationsRepository extends Mock
    implements NotificationsRepository {}

const _validToken = 'valid-fcm-token-1234567890';

NotificationSettings _settings(AuthorizationStatus status) {
  return NotificationSettings(
    alert: AppleNotificationSetting.enabled,
    announcement: AppleNotificationSetting.notSupported,
    authorizationStatus: status,
    badge: AppleNotificationSetting.enabled,
    carPlay: AppleNotificationSetting.notSupported,
    criticalAlert: AppleNotificationSetting.notSupported,
    lockScreen: AppleNotificationSetting.enabled,
    notificationCenter: AppleNotificationSetting.enabled,
    providesAppNotificationSettings: AppleNotificationSetting.notSupported,
    showPreviews: AppleShowPreviewSetting.always,
    sound: AppleNotificationSetting.enabled,
    timeSensitive: AppleNotificationSetting.notSupported,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockFirebaseMessagingPlatform messagingPlatform;
  late MockFirebasePlatform firebasePlatform;
  late MockSecureTokenStorage secureTokenStorage;
  late MockAuthRepository authRepository;
  late MockNotificationsRepository notificationsRepository;
  late FcmPushTokenSyncService service;

  setUpAll(() {
    registerFallbackValue(FakeFirebaseApp());

    messagingPlatform = MockFirebaseMessagingPlatform();
    firebasePlatform = MockFirebasePlatform();

    final defaultApp = FirebaseAppPlatform(
      defaultFirebaseAppName,
      const FirebaseOptions(
        apiKey: 'apiKey',
        appId: 'appId',
        messagingSenderId: 'senderId',
        projectId: 'projectId',
      ),
    );

    when(() => firebasePlatform.apps).thenReturn(<FirebaseAppPlatform>[]);
    when(() => firebasePlatform.initializeApp(
          name: any(named: 'name'),
          options: any(named: 'options'),
        )).thenAnswer((_) async => defaultApp);
    when(() => firebasePlatform.app(any())).thenReturn(defaultApp);

    Firebase.delegatePackingProperty = firebasePlatform;
    FirebaseMessagingPlatform.instance = messagingPlatform;

    // Cadena de delegación usada por `FirebaseMessaging.instance` → `_delegate`.
    when(() => messagingPlatform.delegateFor(app: any(named: 'app')))
        .thenReturn(messagingPlatform);
    when(() => messagingPlatform.setInitialValues(
          isAutoInitEnabled: any(named: 'isAutoInitEnabled'),
        )).thenReturn(messagingPlatform);
    when(() => messagingPlatform.onTokenRefresh)
        .thenAnswer((_) => Stream<String>.empty());
  });

  setUp(() async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    clearInteractions(messagingPlatform);

    secureTokenStorage = MockSecureTokenStorage();
    authRepository = MockAuthRepository();
    notificationsRepository = MockNotificationsRepository();

    when(() => secureTokenStorage.readRefreshToken())
        .thenAnswer((_) async => 'refresh-token');
    when(() => authRepository.tokensInMemory).thenReturn(
      const AuthTokens(accessToken: 'access', refreshToken: 'refresh'),
    );

    service = FcmPushTokenSyncService(
      notificationsRepository: notificationsRepository,
      secureTokenStorage: secureTokenStorage,
      authRepository: authRepository,
    );
    await service.initialize();
  });

  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
  });

  void stubRequestPermission(AuthorizationStatus status) {
    when(() => messagingPlatform.requestPermission(
          alert: any(named: 'alert'),
          announcement: any(named: 'announcement'),
          badge: any(named: 'badge'),
          carPlay: any(named: 'carPlay'),
          criticalAlert: any(named: 'criticalAlert'),
          provisional: any(named: 'provisional'),
          sound: any(named: 'sound'),
          providesAppNotificationSettings:
              any(named: 'providesAppNotificationSettings'),
        )).thenAnswer((_) async => _settings(status));
  }

  group('FcmPushTokenSyncService', () {
    test('registra el token cuando el permiso es concedido', () async {
      stubRequestPermission(AuthorizationStatus.authorized);
      when(() => messagingPlatform.getToken())
          .thenAnswer((_) async => _validToken);

      await service.syncTokenIfAuthenticated();

      verify(() => notificationsRepository.registerPushToken(
            token: _validToken,
            platform: 'android',
          )).called(1);
    });

    test('no registra el token cuando el permiso es denegado', () async {
      stubRequestPermission(AuthorizationStatus.denied);

      await service.syncTokenIfAuthenticated();

      verifyNever(() => messagingPlatform.getToken());
      verifyNever(() => notificationsRepository.registerPushToken(
            token: any(named: 'token'),
            platform: any(named: 'platform'),
          ));
    });

    test('registra el token cuando el permiso es provisional', () async {
      stubRequestPermission(AuthorizationStatus.provisional);
      when(() => messagingPlatform.getToken())
          .thenAnswer((_) async => _validToken);

      await service.syncTokenIfAuthenticated();

      verify(() => notificationsRepository.registerPushToken(
            token: _validToken,
            platform: 'android',
          )).called(1);
    });

    test('omite el registro cuando el token es vacío o corto', () async {
      stubRequestPermission(AuthorizationStatus.authorized);
      when(() => messagingPlatform.getToken()).thenAnswer((_) async => 'abc');

      await service.syncTokenIfAuthenticated();

      verify(() => messagingPlatform.getToken()).called(1);
      verifyNever(() => notificationsRepository.registerPushToken(
            token: any(named: 'token'),
            platform: any(named: 'platform'),
          ));
    });

    test('captura el error cuando el repositorio lanza una excepción', () async {
      stubRequestPermission(AuthorizationStatus.authorized);
      when(() => messagingPlatform.getToken())
          .thenAnswer((_) async => _validToken);
      when(() => notificationsRepository.registerPushToken(
            token: any(named: 'token'),
            platform: any(named: 'platform'),
          )).thenThrow(Exception('network down'));

      await service.syncTokenIfAuthenticated();

      verify(() => notificationsRepository.registerPushToken(
            token: _validToken,
            platform: 'android',
          )).called(1);
    });
  });
}
