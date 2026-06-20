import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/notifications/data/models/notification_delivery_dto.dart';
import 'package:cuadrala_mobile/src/features/notifications/data/notifications_repository.dart';
import 'package:cuadrala_mobile/src/features/notifications/presentation/cubit/notifications_cubit.dart';
import 'package:cuadrala_mobile/src/features/notifications/presentation/cubit/notifications_state.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockNotificationsRepository extends Mock
    implements NotificationsRepository {}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

final _kNotification = NotificationDeliveryDto(
  id: 'delivery-1',
  type: NotificationType.matchSlotOpened,
  title: 'Se abrió una vacante',
  body: 'Hay una vacante disponible.',
  createdAt: DateTime(2026, 1, 1),
  readAt: null,
  deepLink: null,
);

ListNotificationsResult _resultWith(List<NotificationDeliveryDto> items) =>
    ListNotificationsResult(
      items: items,
      pageInfo: PageInfo(page: 1, limit: 20, total: items.length),
    );

void main() {
  late _MockNotificationsRepository repo;

  setUp(() {
    repo = _MockNotificationsRepository();
  });

  NotificationsCubit makeCubit() => NotificationsCubit(repository: repo);

  test('initial state is idle, no items, not mutating', () {
    final cubit = makeCubit();
    expect(cubit.state.status, NotificationsStatus.idle);
    expect(cubit.state.items, isEmpty);
    expect(cubit.state.isMutating, isFalse);
    expect(cubit.state.onlyUnread, isFalse);
  });

  // ── load() ───────────────────────────────────────────────────────────────

  blocTest<NotificationsCubit, NotificationsState>(
    'load() emits [loading, loaded] with items on happy path',
    setUp: () {
      when(() => repo.listMyNotifications(onlyUnread: false))
          .thenAnswer((_) async => _resultWith([_kNotification]));
    },
    build: makeCubit,
    act: (cubit) => cubit.load(),
    expect: () => [
      isA<NotificationsState>()
          .having((s) => s.status, 'status', NotificationsStatus.loading),
      isA<NotificationsState>()
          .having((s) => s.status, 'status', NotificationsStatus.loaded)
          .having((s) => s.items, 'items', [_kNotification]),
    ],
  );

  blocTest<NotificationsCubit, NotificationsState>(
    'load(onlyUnread: true) requests only-unread and persists the filter',
    setUp: () {
      when(() => repo.listMyNotifications(onlyUnread: true))
          .thenAnswer((_) async => _resultWith([]));
    },
    build: makeCubit,
    act: (cubit) => cubit.load(onlyUnread: true),
    expect: () => [
      isA<NotificationsState>().having((s) => s.onlyUnread, 'onlyUnread', true),
      isA<NotificationsState>().having((s) => s.onlyUnread, 'onlyUnread', true),
    ],
    verify: (_) {
      verify(() => repo.listMyNotifications(onlyUnread: true)).called(1);
    },
  );

  blocTest<NotificationsCubit, NotificationsState>(
    'load() emits error with AppFailure.message when repository throws AppFailure',
    setUp: () {
      when(() => repo.listMyNotifications(onlyUnread: false)).thenThrow(
        const AppFailure(code: 'ERR', message: 'boom'),
      );
    },
    build: makeCubit,
    act: (cubit) => cubit.load(),
    expect: () => [
      isA<NotificationsState>()
          .having((s) => s.status, 'status', NotificationsStatus.loading),
      isA<NotificationsState>()
          .having((s) => s.status, 'status', NotificationsStatus.error)
          .having((s) => s.errorMessage, 'errorMessage', 'boom'),
    ],
  );

  blocTest<NotificationsCubit, NotificationsState>(
    'load() emits fallback error message when repository throws a generic exception',
    setUp: () {
      when(() => repo.listMyNotifications(onlyUnread: false))
          .thenThrow(Exception('network down'));
    },
    build: makeCubit,
    act: (cubit) => cubit.load(),
    expect: () => [
      isA<NotificationsState>()
          .having((s) => s.status, 'status', NotificationsStatus.loading),
      isA<NotificationsState>().having(
        (s) => s.errorMessage,
        'errorMessage',
        'No pudimos cargar las notificaciones. Reintentar.',
      ),
    ],
  );

  // ── markAllAsRead() ──────────────────────────────────────────────────────

  blocTest<NotificationsCubit, NotificationsState>(
    'markAllAsRead() resets isMutating to false after a successful reload '
    '(regression: it used to stay true forever after success)',
    setUp: () {
      when(() => repo.markAllAsRead()).thenAnswer((_) async {});
      when(() => repo.listMyNotifications(onlyUnread: false))
          .thenAnswer((_) async => _resultWith([_kNotification]));
    },
    build: makeCubit,
    act: (cubit) => cubit.markAllAsRead(),
    expect: () => [
      isA<NotificationsState>().having((s) => s.isMutating, 'isMutating', true),
      isA<NotificationsState>().having((s) => s.isMutating, 'isMutating', true),
      isA<NotificationsState>()
          .having((s) => s.isMutating, 'isMutating', true)
          .having((s) => s.status, 'status', NotificationsStatus.loaded),
      isA<NotificationsState>()
          .having((s) => s.isMutating, 'isMutating', false)
          .having((s) => s.status, 'status', NotificationsStatus.loaded)
          .having((s) => s.items, 'items', [_kNotification]),
    ],
    verify: (_) {
      verify(() => repo.markAllAsRead()).called(1);
    },
  );

  blocTest<NotificationsCubit, NotificationsState>(
    'markAllAsRead() is a no-op while already mutating',
    seed: () => NotificationsState.initial().copyWith(isMutating: true),
    build: makeCubit,
    act: (cubit) => cubit.markAllAsRead(),
    expect: () => <NotificationsState>[],
    verify: (_) {
      verifyNever(() => repo.markAllAsRead());
    },
  );

  blocTest<NotificationsCubit, NotificationsState>(
    'markAllAsRead() resets isMutating to false and sets an error message on failure',
    setUp: () {
      when(() => repo.markAllAsRead()).thenThrow(Exception('boom'));
    },
    build: makeCubit,
    act: (cubit) => cubit.markAllAsRead(),
    expect: () => [
      isA<NotificationsState>().having((s) => s.isMutating, 'isMutating', true),
      isA<NotificationsState>()
          .having((s) => s.isMutating, 'isMutating', false)
          .having(
            (s) => s.errorMessage,
            'errorMessage',
            'No pudimos marcar como leídas. Reintentar.',
          ),
    ],
  );

  // ── markOneAsRead() ──────────────────────────────────────────────────────

  blocTest<NotificationsCubit, NotificationsState>(
    'markOneAsRead() marks only the matching item as read and resets isMutating',
    seed: () => NotificationsState.initial().copyWith(
      status: NotificationsStatus.loaded,
      items: [_kNotification],
    ),
    setUp: () {
      when(() => repo.markAsRead(_kNotification.id)).thenAnswer((_) async {});
    },
    build: makeCubit,
    act: (cubit) => cubit.markOneAsRead(_kNotification.id),
    expect: () => [
      isA<NotificationsState>().having((s) => s.isMutating, 'isMutating', true),
      isA<NotificationsState>()
          .having((s) => s.isMutating, 'isMutating', false)
          .having((s) => s.items.single.isUnread, 'items.single.isUnread', false),
    ],
    verify: (_) {
      verify(() => repo.markAsRead(_kNotification.id)).called(1);
    },
  );

  blocTest<NotificationsCubit, NotificationsState>(
    'markOneAsRead() is a no-op while already mutating',
    seed: () => NotificationsState.initial().copyWith(isMutating: true),
    build: makeCubit,
    act: (cubit) => cubit.markOneAsRead(_kNotification.id),
    expect: () => <NotificationsState>[],
    verify: (_) {
      verifyNever(() => repo.markAsRead(any()));
    },
  );

  blocTest<NotificationsCubit, NotificationsState>(
    'markOneAsRead() resets isMutating to false and sets an error message on failure',
    seed: () => NotificationsState.initial().copyWith(
      status: NotificationsStatus.loaded,
      items: [_kNotification],
    ),
    setUp: () {
      when(() => repo.markAsRead(_kNotification.id)).thenThrow(Exception('boom'));
    },
    build: makeCubit,
    act: (cubit) => cubit.markOneAsRead(_kNotification.id),
    expect: () => [
      isA<NotificationsState>().having((s) => s.isMutating, 'isMutating', true),
      isA<NotificationsState>()
          .having((s) => s.isMutating, 'isMutating', false)
          .having(
            (s) => s.errorMessage,
            'errorMessage',
            'No pudimos marcar como leída. Reintentar.',
          ),
    ],
  );
}
