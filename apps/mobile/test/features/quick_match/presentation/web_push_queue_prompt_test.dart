import 'package:cuadrala_mobile/src/core/push/push_token_sync_service.dart';
import 'package:cuadrala_mobile/src/features/quick_match/presentation/widgets/web_push_queue_prompt.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockPushTokenSyncService extends Mock implements PushTokenSyncService {}

void main() {
  late _MockPushTokenSyncService service;

  setUp(() {
    service = _MockPushTokenSyncService();
    when(() => service.isWebPushAvailable).thenReturn(true);
    when(() => service.isWebPushEnabled()).thenAnswer((_) async => false);
  });

  Future<void> pump(
    WidgetTester tester, {
    bool isWeb = true,
    bool isIos = false,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: WebPushQueuePrompt(
            service: service,
            isWeb: isWeb,
            isIos: isIos,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  //? En web el push no se activa solo: sin este aviso el jugador esperaba una
  //? notificación que nunca iba a llegar.
  testWidgets('should offer to enable notifications when web push is off', (
    tester,
  ) async {
    await pump(tester);

    expect(find.text('Activar notificaciones'), findsOneWidget);
  });

  testWidgets('should hide the prompt once notifications are enabled', (
    tester,
  ) async {
    when(
      () => service.enableWebPush(),
    ).thenAnswer((_) async => PushEnrollmentResult.enabled);
    await pump(tester);

    await tester.tap(find.text('Activar notificaciones'));
    await tester.pumpAndSettle();

    verify(() => service.enableWebPush()).called(1);
    expect(find.text('Activar notificaciones'), findsNothing);
  });

  testWidgets('should explain how to allow them when the browser denies it', (
    tester,
  ) async {
    when(
      () => service.enableWebPush(),
    ).thenAnswer((_) async => PushEnrollmentResult.permissionDenied);
    await pump(tester);

    await tester.tap(find.text('Activar notificaciones'));
    await tester.pumpAndSettle();

    expect(
      find.textContaining('configuración del navegador'),
      findsOneWidget,
    );
  });

  testWidgets('should show nothing when notifications are already enabled', (
    tester,
  ) async {
    when(() => service.isWebPushEnabled()).thenAnswer((_) async => true);
    await pump(tester);

    expect(find.byType(Card), findsNothing);
    expect(find.text('Activar notificaciones'), findsNothing);
  });

  //? iPhone: el push web solo existe con la app agregada a la pantalla de
  //? inicio desde Safari; en Chrome o en Safari como página no se puede.
  testWidgets('should explain the home screen install on iPhone', (
    tester,
  ) async {
    when(() => service.isWebPushAvailable).thenReturn(false);
    await pump(tester, isIos: true);

    expect(find.textContaining('pantalla de inicio'), findsOneWidget);
    expect(find.text('Activar notificaciones'), findsNothing);
  });

  testWidgets('should show nothing outside the web app', (tester) async {
    await pump(tester, isWeb: false);

    expect(find.text('Activar notificaciones'), findsNothing);
    expect(find.textContaining('pantalla de inicio'), findsNothing);
  });
}
