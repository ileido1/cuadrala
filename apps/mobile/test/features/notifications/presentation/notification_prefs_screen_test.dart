import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/push/push_token_sync_service.dart';
import 'package:cuadrala_mobile/src/features/notifications/data/notifications_repository.dart';
import 'package:cuadrala_mobile/src/features/notifications/presentation/notification_prefs_screen.dart';

class _MockNotificationsRepository extends Mock
    implements NotificationsRepository {}

class _MockPushTokenSyncService extends Mock implements PushTokenSyncService {}

void main() {
  final getIt = GetIt.instance;
  late _MockNotificationsRepository repository;
  late _MockPushTokenSyncService pushService;

  setUp(() async {
    await getIt.reset();
    repository = _MockNotificationsRepository();
    pushService = _MockPushTokenSyncService();
    getIt.registerSingleton<NotificationsRepository>(repository);
    getIt.registerSingleton<PushTokenSyncService>(pushService);

    when(() => repository.listMySubscriptions()).thenAnswer((_) async => []);
    when(
      () => repository.upsertSubscription(
        enabled: any(named: 'enabled'),
        enabledTypes: any(named: 'enabledTypes'),
      ),
    ).thenThrow(UnimplementedError());
    final dynamic dynamicPushService = pushService;
    when(() => dynamicPushService.isWebPushAvailable).thenReturn(true);
    when(
      () => dynamicPushService.isWebPushEnabled(),
    ).thenAnswer((_) async => false);
  });

  tearDown(() async {
    await getIt.reset();
  });

  Future<void> pumpScreen(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: NotificationPrefsScreen()));
    await tester.pumpAndSettle();
  }

  testWidgets('shows an independent browser-push control when available', (
    tester,
  ) async {
    await pumpScreen(tester);

    expect(find.byKey(const Key('web-push-toggle')), findsOneWidget);
    expect(find.text('Cupos disponibles'), findsOneWidget);
  });

  testWidgets('restores the persisted browser-push status', (tester) async {
    final dynamic dynamicPushService = pushService;
    when(
      () => dynamicPushService.isWebPushEnabled(),
    ).thenAnswer((_) async => true);

    await pumpScreen(tester);

    expect(
      tester
          .widget<SwitchListTile>(find.byKey(const Key('web-push-toggle')))
          .value,
      isTrue,
    );
  });

  testWidgets('changing an event preference does not enroll browser push', (
    tester,
  ) async {
    await pumpScreen(tester);
    final typeToggle = find.byKey(
      const Key('notification-type-MATCH_SLOT_OPENED'),
    );
    await tester.ensureVisible(typeToggle);
    tester.widget<Switch>(typeToggle).onChanged!(false);
    await tester.pumpAndSettle();

    final dynamic dynamicPushService = pushService;
    verifyNever(() => dynamicPushService.enableWebPush());
  });
}
