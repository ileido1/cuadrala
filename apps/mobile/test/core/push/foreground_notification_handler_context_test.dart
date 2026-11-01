// ignore_for_file: invalid_use_of_protected_member
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_core_platform_interface/firebase_core_platform_interface.dart'
    show FirebaseAppPlatform, FirebasePlatform;
import 'package:firebase_messaging_platform_interface/firebase_messaging_platform_interface.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

import 'package:cuadrala_mobile/src/core/push/foreground_notification_handler.dart';
import 'package:cuadrala_mobile/src/router/routes.dart';

class MockFirebaseMessagingPlatform extends Mock
    with MockPlatformInterfaceMixin
    implements FirebaseMessagingPlatform {}

class MockFirebasePlatform extends Mock
    with MockPlatformInterfaceMixin
    implements FirebasePlatform {}

class FakeFirebaseApp extends Fake implements FirebaseApp {}

//? Issue #100: `ForegroundNotificationHandler` is positioned ABOVE
//? `MaterialApp.router` in `app.dart` (wraps it as its child), but it calls
//? `GoRouter.of(context)`/`Overlay.of(context)` with that same, outer
//? context — an InheritedWidget lookup only walks toward ancestors, so it
//? cannot resolve either, which are provided *inside* `MaterialApp.router`.
//? This test mirrors `app.dart`'s exact nesting, unlike
//? `foreground_notification_handler_test.dart` (which only tests the pure
//? `resolveNotificationNavigation` function, never the widget itself).
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    registerFallbackValue(FakeFirebaseApp());
    final messagingPlatform = MockFirebaseMessagingPlatform();
    final firebasePlatform = MockFirebasePlatform();
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
    when(
      () => messagingPlatform.delegateFor(app: any(named: 'app')),
    ).thenReturn(messagingPlatform);
    when(
      () => messagingPlatform.setInitialValues(
        isAutoInitEnabled: any(named: 'isAutoInitEnabled'),
      ),
    ).thenReturn(messagingPlatform);
  });

  GoRouter buildTestRouter() => GoRouter(
    initialLocation: Routes.home,
    routes: [
      GoRoute(
        path: Routes.home,
        builder: (_, _) => const Scaffold(body: Text('HOME SCREEN')),
      ),
      GoRoute(
        path: Routes.quickMatch,
        builder: (_, _) => const Scaffold(body: Text('QUICK MATCH SCREEN')),
      ),
    ],
  );

  //? Mismo anidamiento que `app.dart`: ForegroundNotificationHandler por
  //? fuera de MaterialApp.router, recibiendo la instancia de GoRouter directo
  //? (issue #100 — ya no depende de GoRouter.of(context)/Overlay.of(context)).
  Widget buildAppLikeTree(GoRouter router) => ForegroundNotificationHandler(
    router: router,
    child: MaterialApp.router(
      routerConfig: router,
      builder: (context, child) => child ?? const SizedBox.shrink(),
    ),
  );

  testWidgets(
    'shows the banner and navigates to the destination screen when a foreground notification is tapped, with the handler wired exactly as app.dart wires it',
    (tester) async {
      await tester.pumpWidget(buildAppLikeTree(buildTestRouter()));
      await tester.pumpAndSettle();

      FirebaseMessagingPlatform.onMessage.add(
        RemoteMessage(data: const {'eventType': 'QUICK_MATCH_PROPOSAL'}),
      );
      await tester.pump();
      await tester.pump();

      expect(find.text('Encontramos una partida'), findsOneWidget);

      await tester.tap(find.text('Encontramos una partida'));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.text('QUICK MATCH SCREEN'), findsOneWidget);

      //? Desmonta el árbol en un frame controlado antes de que termine el
      //? test — evita que el framework dispare dispose() en medio de su
      //? propio desmontaje final.
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
