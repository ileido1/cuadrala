// ignore_for_file: invalid_use_of_protected_member
import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_core_platform_interface/firebase_core_platform_interface.dart'
    show FirebaseAppPlatform, FirebasePlatform;
import 'package:firebase_messaging_platform_interface/firebase_messaging_platform_interface.dart';
import 'package:cuadrala_mobile/src/core/env/app_env.dart';
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
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

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

class MockProfileRepository extends Mock implements ProfileRepository {}

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
  late MockProfileRepository profileRepository;
  late FcmPushTokenSyncService service;

  const userA = UserMeDto(
    id: 'user-a',
    email: 'a@example.test',
    name: 'User A',
    subscriptionType: 'FREE',
  );
  const userB = UserMeDto(
    id: 'user-b',
    email: 'b@example.test',
    name: 'User B',
    subscriptionType: 'FREE',
  );

  dynamic createWebEnv() => Function.apply(AppEnv.new, const [], {
    #baseUrl: 'https://api.example.test',
    #firebaseWebApiKey: 'web-api-key',
    #firebaseWebAppId: 'web-app-id',
    #firebaseWebMessagingSenderId: 'sender-id',
    #firebaseWebProjectId: 'project-id',
    #firebaseWebVapidKey: 'public-vapid-key',
  });

  dynamic createWebService({AppEnv? appEnv}) =>
      Function.apply(FcmPushTokenSyncService.new, const [], {
        #notificationsRepository: notificationsRepository,
        #secureTokenStorage: secureTokenStorage,
        #authRepository: authRepository,
        #profileRepository: profileRepository,
        #appEnv: appEnv,
        #isWebOverride: true,
      });

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
    when(
      () => firebasePlatform.initializeApp(
        name: any(named: 'name'),
        options: any(named: 'options'),
      ),
    ).thenAnswer((_) async => defaultApp);
    when(() => firebasePlatform.app(any())).thenReturn(defaultApp);

    Firebase.delegatePackingProperty = firebasePlatform;
    FirebaseMessagingPlatform.instance = messagingPlatform;

    // Cadena de delegación usada por `FirebaseMessaging.instance` → `_delegate`.
    when(
      () => messagingPlatform.delegateFor(app: any(named: 'app')),
    ).thenReturn(messagingPlatform);
    when(
      () => messagingPlatform.setInitialValues(
        isAutoInitEnabled: any(named: 'isAutoInitEnabled'),
      ),
    ).thenReturn(messagingPlatform);
    when(
      () => messagingPlatform.onTokenRefresh,
    ).thenAnswer((_) => Stream<String>.empty());
  });

  setUp(() async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    clearInteractions(messagingPlatform);
    when(
      () => messagingPlatform.onTokenRefresh,
    ).thenAnswer((_) => Stream<String>.empty().asBroadcastStream());

    secureTokenStorage = MockSecureTokenStorage();
    authRepository = MockAuthRepository();
    notificationsRepository = MockNotificationsRepository();
    profileRepository = MockProfileRepository();

    when(
      () => secureTokenStorage.readRefreshToken(),
    ).thenAnswer((_) async => 'refresh-token');
    when(() => profileRepository.getMe()).thenAnswer((_) async => userA);
    when(
      () => secureTokenStorage.hasWebPushOptIn(any()),
    ).thenAnswer((_) async => false);
    when(
      () => secureTokenStorage.writeWebPushOptIn(any()),
    ).thenAnswer((_) async {});
    when(
      () => secureTokenStorage.deleteWebPushOptIn(any()),
    ).thenAnswer((_) async {});
    when(() => authRepository.tokensInMemory).thenReturn(
      const AuthTokens(accessToken: 'access', refreshToken: 'refresh'),
    );
    when(
      () => notificationsRepository.registerPushToken(
        token: any(named: 'token'),
        platform: any(named: 'platform'),
      ),
    ).thenAnswer((_) async {});

    service = FcmPushTokenSyncService(
      notificationsRepository: notificationsRepository,
      secureTokenStorage: secureTokenStorage,
      authRepository: authRepository,
      profileRepository: profileRepository,
    );
    await service.initialize();
  });

  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
  });

  void stubRequestPermission(AuthorizationStatus status) {
    when(
      () => messagingPlatform.requestPermission(
        alert: any(named: 'alert'),
        announcement: any(named: 'announcement'),
        badge: any(named: 'badge'),
        carPlay: any(named: 'carPlay'),
        criticalAlert: any(named: 'criticalAlert'),
        provisional: any(named: 'provisional'),
        sound: any(named: 'sound'),
        providesAppNotificationSettings: any(
          named: 'providesAppNotificationSettings',
        ),
      ),
    ).thenAnswer((_) async => _settings(status));
  }

  group('FcmPushTokenSyncService', () {
    test('does not prompt or register before explicit web opt-in', () async {
      final dynamic webService = createWebService(appEnv: createWebEnv());
      await webService.initialize();
      when(
        () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
      ).thenAnswer((_) async => _validToken);

      await webService.syncTokenIfAuthenticated();

      verifyNever(
        () => messagingPlatform.requestPermission(
          alert: any(named: 'alert'),
          announcement: any(named: 'announcement'),
          badge: any(named: 'badge'),
          carPlay: any(named: 'carPlay'),
          criticalAlert: any(named: 'criticalAlert'),
          provisional: any(named: 'provisional'),
          sound: any(named: 'sound'),
          providesAppNotificationSettings: any(
            named: 'providesAppNotificationSettings',
          ),
        ),
      );
      verifyNever(() => messagingPlatform.getToken());
      verifyNever(
        () => notificationsRepository.registerPushToken(
          token: any(named: 'token'),
          platform: any(named: 'platform'),
        ),
      );
    });

    test(
      'reports unavailable and does not request permission without web config',
      () async {
        final dynamic webService = createWebService();
        await webService.initialize();

        expect(webService.isWebPushAvailable, isFalse);
        expect(
          (await webService.enableWebPush()).toString(),
          'PushEnrollmentResult.unavailable',
        );
        verifyNever(
          () => messagingPlatform.requestPermission(
            alert: any(named: 'alert'),
            announcement: any(named: 'announcement'),
            badge: any(named: 'badge'),
            carPlay: any(named: 'carPlay'),
            criticalAlert: any(named: 'criticalAlert'),
            provisional: any(named: 'provisional'),
            sound: any(named: 'sound'),
            providesAppNotificationSettings: any(
              named: 'providesAppNotificationSettings',
            ),
          ),
        );
        verifyNever(() => messagingPlatform.getToken());
      },
    );

    test(
      'keeps enrollment disabled when the user denies browser permission',
      () async {
        final dynamic webService = createWebService(appEnv: createWebEnv());
        await webService.initialize();
        stubRequestPermission(AuthorizationStatus.denied);

        expect(
          (await webService.enableWebPush()).toString(),
          'PushEnrollmentResult.permissionDenied',
        );

        verifyNever(() => messagingPlatform.getToken());
        verifyNever(
          () => notificationsRepository.registerPushToken(
            token: any(named: 'token'),
            platform: any(named: 'platform'),
          ),
        );
      },
    );

    test(
      'registers a web token only after explicit opt-in and permission',
      () async {
        final dynamic webService = createWebService(appEnv: createWebEnv());
        await webService.initialize();
        stubRequestPermission(AuthorizationStatus.authorized);
        when(
          () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
        ).thenAnswer((_) async => _validToken);

        expect(
          (await webService.enableWebPush()).toString(),
          'PushEnrollmentResult.enabled',
        );

        verify(
          () => notificationsRepository.registerPushToken(
            token: _validToken,
            platform: null,
          ),
        ).called(1);
      },
    );

    test('keeps registration retryable when the API call fails', () async {
      final dynamic webService = createWebService(appEnv: createWebEnv());
      await webService.initialize();
      stubRequestPermission(AuthorizationStatus.authorized);
      when(
        () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
      ).thenAnswer((_) async => _validToken);
      var attempts = 0;
      when(
        () => notificationsRepository.registerPushToken(
          token: _validToken,
          platform: any(named: 'platform'),
        ),
      ).thenAnswer((_) async {
        attempts++;
        if (attempts == 1) throw Exception('network down');
      });

      expect(
        (await webService.enableWebPush()).toString(),
        'PushEnrollmentResult.failed',
      );
      expect(
        (await webService.enableWebPush()).toString(),
        'PushEnrollmentResult.enabled',
      );
      expect(attempts, 2);
    });

    test(
      'registers refreshed tokens after opt-in without another prompt',
      () async {
        final dynamic webService = createWebService(appEnv: createWebEnv());
        final refreshes = StreamController<String>();
        when(
          () => messagingPlatform.onTokenRefresh,
        ).thenAnswer((_) => refreshes.stream);
        stubRequestPermission(AuthorizationStatus.authorized);
        when(
          () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
        ).thenAnswer((_) async => _validToken);

        await webService.initialize();
        await webService.enableWebPush();
        refreshes.add('refreshed-fcm-token-987654321');
        await Future<void>.delayed(Duration.zero);

        verify(
          () => notificationsRepository.registerPushToken(
            token: 'refreshed-fcm-token-987654321',
            platform: null,
          ),
        ).called(1);
        verify(
          () => messagingPlatform.requestPermission(
            alert: any(named: 'alert'),
            announcement: any(named: 'announcement'),
            badge: any(named: 'badge'),
            carPlay: any(named: 'carPlay'),
            criticalAlert: any(named: 'criticalAlert'),
            provisional: any(named: 'provisional'),
            sound: any(named: 'sound'),
            providesAppNotificationSettings: any(
              named: 'providesAppNotificationSettings',
            ),
          ),
        ).called(1);
        await refreshes.close();
      },
    );

    test('resyncs after restart only for the opted-in account', () async {
      final dynamic firstService = createWebService(appEnv: createWebEnv());
      await firstService.initialize();
      stubRequestPermission(AuthorizationStatus.authorized);
      when(
        () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
      ).thenAnswer((_) async => _validToken);
      await firstService.enableWebPush();
      when(
        () => secureTokenStorage.hasWebPushOptIn('user-a'),
      ).thenAnswer((_) async => true);
      clearInteractions(messagingPlatform);
      clearInteractions(notificationsRepository);

      final dynamic restartedService = createWebService(appEnv: createWebEnv());
      await restartedService.initialize();
      await restartedService.syncTokenIfAuthenticated();

      verify(
        () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
      ).called(1);
      verify(
        () => notificationsRepository.registerPushToken(
          token: _validToken,
          platform: null,
        ),
      ).called(1);
    });

    test('fails closed when web opt-in storage cannot be read', () async {
      final dynamic webService = createWebService(appEnv: createWebEnv());
      await webService.initialize();
      when(
        () => secureTokenStorage.hasWebPushOptIn('user-a'),
      ).thenThrow(StateError('storage unavailable'));

      await expectLater(webService.syncTokenIfAuthenticated(), completes);

      expect(await webService.isWebPushEnabled(), isFalse);
      verifyNever(
        () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
      );
      verifyNever(
        () => notificationsRepository.registerPushToken(
          token: any(named: 'token'),
          platform: any(named: 'platform'),
        ),
      );
    });

    test(
      'does not resync when the current account cannot be identified',
      () async {
        final dynamic webService = createWebService(appEnv: createWebEnv());
        await webService.initialize();
        stubRequestPermission(AuthorizationStatus.authorized);
        when(
          () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
        ).thenAnswer((_) async => _validToken);
        await webService.enableWebPush();
        when(
          () => profileRepository.getMe(),
        ).thenThrow(Exception('profile unavailable'));
        clearInteractions(messagingPlatform);
        clearInteractions(notificationsRepository);

        await webService.syncTokenIfAuthenticated();

        verifyNever(
          () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
        );
        verifyNever(
          () => notificationsRepository.registerPushToken(
            token: any(named: 'token'),
            platform: any(named: 'platform'),
          ),
        );
      },
    );

    test(
      'clears the last resolved account marker when logout lookup fails',
      () async {
        final dynamic webService = createWebService(appEnv: createWebEnv());
        await webService.initialize();
        stubRequestPermission(AuthorizationStatus.authorized);
        when(
          () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
        ).thenAnswer((_) async => _validToken);
        await webService.enableWebPush();
        when(
          () => profileRepository.getMe(),
        ).thenThrow(Exception('profile unavailable'));

        await webService.clearOnLogout();

        verify(() => secureTokenStorage.deleteWebPushOptIn('user-a')).called(1);
      },
    );

    test(
      'does not resync a different account without its own opt-in',
      () async {
        when(() => profileRepository.getMe()).thenAnswer((_) async => userB);
        when(
          () => secureTokenStorage.hasWebPushOptIn('user-b'),
        ).thenAnswer((_) async => false);
        final dynamic webService = createWebService(appEnv: createWebEnv());
        await webService.initialize();
        when(
          () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
        ).thenAnswer((_) async => _validToken);

        await webService.syncTokenIfAuthenticated();

        verify(() => secureTokenStorage.hasWebPushOptIn('user-b')).called(1);
        verifyNever(
          () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
        );
      },
    );

    test(
      'continues logout cleanup when removing the opt-in marker fails',
      () async {
        final dynamic webService = createWebService(appEnv: createWebEnv());
        await webService.initialize();
        stubRequestPermission(AuthorizationStatus.authorized);
        when(
          () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
        ).thenAnswer((_) async => _validToken);
        await webService.enableWebPush();
        when(
          () => secureTokenStorage.deleteWebPushOptIn('user-a'),
        ).thenThrow(Exception('storage unavailable'));

        await expectLater(webService.clearOnLogout(), completes);

        verify(() => notificationsRepository.unregisterPushTokens()).called(1);
      },
    );

    test('disables backend tokens and clears web opt-in on logout', () async {
      final dynamic webService = createWebService(appEnv: createWebEnv());
      await webService.initialize();
      stubRequestPermission(AuthorizationStatus.authorized);
      when(
        () => messagingPlatform.getToken(vapidKey: any(named: 'vapidKey')),
      ).thenAnswer((_) async => _validToken);
      when(
        () => notificationsRepository.registerPushToken(
          token: _validToken,
          platform: any(named: 'platform'),
        ),
      ).thenAnswer((_) async {});

      await webService.enableWebPush();
      await webService.clearOnLogout();
      verify(() => notificationsRepository.unregisterPushTokens()).called(1);
      verify(() => secureTokenStorage.deleteWebPushOptIn('user-a')).called(1);
      clearInteractions(messagingPlatform);
      clearInteractions(notificationsRepository);
      await webService.syncTokenIfAuthenticated();

      verifyNever(() => messagingPlatform.getToken());
      verifyNever(
        () => notificationsRepository.registerPushToken(
          token: any(named: 'token'),
          platform: any(named: 'platform'),
        ),
      );
    });

    test('registra el token cuando el permiso es concedido', () async {
      stubRequestPermission(AuthorizationStatus.authorized);
      when(
        () => messagingPlatform.getToken(),
      ).thenAnswer((_) async => _validToken);

      await service.syncTokenIfAuthenticated();

      verify(
        () => notificationsRepository.registerPushToken(
          token: _validToken,
          platform: 'android',
        ),
      ).called(1);
    });

    test('no registra el token cuando el permiso es denegado', () async {
      stubRequestPermission(AuthorizationStatus.denied);

      await service.syncTokenIfAuthenticated();

      verifyNever(() => messagingPlatform.getToken());
      verifyNever(
        () => notificationsRepository.registerPushToken(
          token: any(named: 'token'),
          platform: any(named: 'platform'),
        ),
      );
    });

    test('registra el token cuando el permiso es provisional', () async {
      stubRequestPermission(AuthorizationStatus.provisional);
      when(
        () => messagingPlatform.getToken(),
      ).thenAnswer((_) async => _validToken);

      await service.syncTokenIfAuthenticated();

      verify(
        () => notificationsRepository.registerPushToken(
          token: _validToken,
          platform: 'android',
        ),
      ).called(1);
    });

    test('omite el registro cuando el token es vacío o corto', () async {
      stubRequestPermission(AuthorizationStatus.authorized);
      when(() => messagingPlatform.getToken()).thenAnswer((_) async => 'abc');

      await service.syncTokenIfAuthenticated();

      verify(() => messagingPlatform.getToken()).called(1);
      verifyNever(
        () => notificationsRepository.registerPushToken(
          token: any(named: 'token'),
          platform: any(named: 'platform'),
        ),
      );
    });

    test(
      'captura el error cuando el repositorio lanza una excepción',
      () async {
        stubRequestPermission(AuthorizationStatus.authorized);
        when(
          () => messagingPlatform.getToken(),
        ).thenAnswer((_) async => _validToken);
        when(
          () => notificationsRepository.registerPushToken(
            token: any(named: 'token'),
            platform: any(named: 'platform'),
          ),
        ).thenThrow(Exception('network down'));

        await service.syncTokenIfAuthenticated();

        verify(
          () => notificationsRepository.registerPushToken(
            token: _validToken,
            platform: 'android',
          ),
        ).called(1);
      },
    );
  });
}
