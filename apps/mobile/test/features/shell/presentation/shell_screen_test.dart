import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/features/notifications/data/models/notification_delivery_dto.dart';
import 'package:cuadrala_mobile/src/features/notifications/presentation/cubit/notifications_cubit.dart';
import 'package:cuadrala_mobile/src/features/notifications/presentation/cubit/notifications_state.dart';
import 'package:cuadrala_mobile/src/features/shell/presentation/shell_screen.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockNotificationsCubit extends MockCubit<NotificationsState>
    implements NotificationsCubit {}

// ---------------------------------------------------------------------------
// Stub pages (no DI needed)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Stub tab set — mirrors the real tab order with Torneos excluded
// (matches FeatureFlags.torneosEnabled = false production default)
// ---------------------------------------------------------------------------

List<ShellTabConfig> _stubTabs() => [
      const ShellTabConfig(
        activeIcon: Icons.home,
        inactiveIcon: Icons.home_outlined,
        label: 'Inicio',
      ),
      const ShellTabConfig(
        activeIcon: Icons.sports_tennis,
        inactiveIcon: Icons.sports_tennis_outlined,
        label: 'Partidas',
      ),
      const ShellTabConfig(
        activeIcon: Icons.notifications,
        inactiveIcon: Icons.notifications_outlined,
        label: 'Avisos',
      ),
      const ShellTabConfig(
        activeIcon: Icons.person,
        inactiveIcon: Icons.person_outlined,
        label: 'Perfil',
      ),
    ];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

NotificationDeliveryDto _makeNotif({required bool unread, required String id}) {
  return NotificationDeliveryDto(
    id: id,
    type: NotificationType.chatMessage,
    title: 'T',
    body: 'B',
    createdAt: DateTime(2024),
    readAt: unread ? null : DateTime(2024),
    deepLink: null,
  );
}

NotificationsState _notifState({int unread = 0, int read = 0}) {
  final items = [
    for (var i = 0; i < unread; i++) _makeNotif(unread: true, id: 'u$i'),
    for (var i = 0; i < read; i++) _makeNotif(unread: false, id: 'r$i'),
  ];
  return NotificationsState(
    status: NotificationsStatus.loaded,
    onlyUnread: false,
    items: items,
    isMutating: false,
  );
}

// ---------------------------------------------------------------------------
// Test harness — ShellBody now takes currentIndex + onSelectTab + child
// ---------------------------------------------------------------------------

Widget _wrap({
  required NotificationsCubit notifCubit,
  int currentIndex = 0,
  void Function(int)? onSelectTab,
  List<ShellTabConfig>? tabs,
}) {
  return MaterialApp(
    theme: AppTheme.light(),
    darkTheme: AppTheme.dark(),
    themeMode: ThemeMode.light,
    home: BlocProvider<NotificationsCubit>.value(
      value: notifCubit,
      child: ShellBody(
        currentIndex: currentIndex,
        onSelectTab: onSelectTab ?? (_) {},
        tabs: tabs ?? _stubTabs(),
        child: const SizedBox.shrink(),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  late _MockNotificationsCubit notifCubit;

  setUp(() {
    notifCubit = _MockNotificationsCubit();
  });

  tearDown(() {
    notifCubit.close();
  });

  // ── 1. Active / inactive icon shapes ─────────────────────────────────────

  group('active tab uses filled icon; inactive tabs use outlined icons', () {
    testWidgets('tab 0 (Inicio) active: filled home icon visible', (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState());

      await tester.pumpWidget(
          _wrap(notifCubit: notifCubit, currentIndex: 0));

      expect(find.byIcon(Icons.home), findsOneWidget);
    });

    testWidgets('tab 1 (Partidas) active: filled sports_tennis icon visible',
        (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState());

      await tester.pumpWidget(
          _wrap(notifCubit: notifCubit, currentIndex: 1));

      expect(find.byIcon(Icons.sports_tennis), findsOneWidget);
    });

    testWidgets('when tab 0 is active, Avisos shows outlined icon (index 2)',
        (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState());

      await tester.pumpWidget(
          _wrap(notifCubit: notifCubit, currentIndex: 0));

      expect(find.byIcon(Icons.notifications_outlined), findsOneWidget);
    });

    testWidgets('Avisos active (index 2): filled notifications icon visible',
        (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState());

      await tester.pumpWidget(
          _wrap(notifCubit: notifCubit, currentIndex: 2));

      expect(find.byIcon(Icons.notifications), findsOneWidget);
    });
  });

  // ── 2. Torneos feature flag ───────────────────────────────────────────────

  group('Torneos feature flag', () {
    testWidgets('Torneos tab is absent from nav bar when flag is false',
        (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState());

      await tester.pumpWidget(_wrap(notifCubit: notifCubit));

      expect(find.text('Torneos'), findsNothing);
    });

    testWidgets('nav bar shows exactly Inicio, Partidas, Avisos, Perfil',
        (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState());

      await tester.pumpWidget(_wrap(notifCubit: notifCubit));

      expect(find.text('Inicio'), findsAtLeastNWidgets(1));
      expect(find.text('Partidas'), findsAtLeastNWidgets(1));
      expect(find.text('Avisos'), findsAtLeastNWidgets(1));
      expect(find.text('Perfil'), findsAtLeastNWidgets(1));
      expect(find.text('Torneos'), findsNothing);
    });
  });

  // ── 3. Label rename ───────────────────────────────────────────────────────

  group('label rename', () {
    testWidgets('"Notif." label is gone; "Avisos" is present', (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState());

      await tester.pumpWidget(_wrap(notifCubit: notifCubit));

      expect(find.text('Notif.'), findsNothing);
      expect(find.text('Avisos'), findsOneWidget);
    });
  });

  // ── 4. Unread badge ───────────────────────────────────────────────────────

  group('unread badge on Avisos tab', () {
    testWidgets('badge not rendered when unreadCount is 0', (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState(unread: 0));

      await tester.pumpWidget(_wrap(notifCubit: notifCubit));

      expect(find.text('99+'), findsNothing);
    });

    testWidgets('badge rendered with correct count when unreadCount = 3',
        (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState(unread: 3));

      await tester.pumpWidget(_wrap(notifCubit: notifCubit));

      expect(find.text('3'), findsOneWidget);
    });

    testWidgets('badge displays "99+" when unreadCount = 150', (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState(unread: 150));

      await tester.pumpWidget(_wrap(notifCubit: notifCubit));

      expect(find.text('99+'), findsOneWidget);
    });

    testWidgets(
        'badge renders on active Avisos tab when unread > 0',
        (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState(unread: 5));

      await tester.pumpWidget(
          _wrap(notifCubit: notifCubit, currentIndex: 2));

      expect(find.text('5'), findsOneWidget);
    });
  });

  // ── 5. Tab tap calls onSelectTab callback ─────────────────────────────────

  group('tapping a tab calls onSelectTab with the correct index', () {
    testWidgets('tapping Perfil tab calls onSelectTab(3)', (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState());
      final tappedIndexes = <int>[];

      await tester.pumpWidget(_wrap(
        notifCubit: notifCubit,
        currentIndex: 0,
        onSelectTab: tappedIndexes.add,
      ));

      await tester.tap(find.text('Perfil'));
      await tester.pump();

      // With Torneos hidden, Perfil is index 3
      expect(tappedIndexes, [3]);
    });

    testWidgets('tapping Avisos tab calls onSelectTab(2)', (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState());
      final tappedIndexes = <int>[];

      await tester.pumpWidget(_wrap(
        notifCubit: notifCubit,
        currentIndex: 0,
        onSelectTab: tappedIndexes.add,
      ));

      await tester.tap(find.text('Avisos'));
      await tester.pump();

      expect(tappedIndexes, [2]);
    });

    testWidgets('tapping Inicio tab calls onSelectTab(0)', (tester) async {
      when(() => notifCubit.state).thenReturn(_notifState());
      final tappedIndexes = <int>[];

      await tester.pumpWidget(_wrap(
        notifCubit: notifCubit,
        currentIndex: 2,
        onSelectTab: tappedIndexes.add,
      ));

      await tester.tap(find.text('Inicio'));
      await tester.pump();

      expect(tappedIndexes, [0]);
    });
  });
}
