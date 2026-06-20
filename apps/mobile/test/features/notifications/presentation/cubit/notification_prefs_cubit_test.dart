import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/notifications/data/models/notification_subscription_dto.dart';
import 'package:cuadrala_mobile/src/features/notifications/data/notifications_repository.dart';
import 'package:cuadrala_mobile/src/features/notifications/presentation/cubit/notification_prefs_cubit.dart';
import 'package:cuadrala_mobile/src/features/notifications/presentation/cubit/notification_prefs_state.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockNotificationsRepository extends Mock
    implements NotificationsRepository {}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

final _kSubscription = NotificationSubscriptionDto(
  id: 'sub-1',
  userId: 'user-1',
  enabled: true,
  enabledTypes: const {'MATCH_SLOT_OPENED': true, 'CHAT_MESSAGE': false},
  createdAt: DateTime(2026, 1, 1),
  updatedAt: DateTime(2026, 1, 1),
);

void main() {
  late _MockNotificationsRepository repo;

  setUp(() {
    repo = _MockNotificationsRepository();
  });

  NotificationPrefsCubit makeCubit() =>
      NotificationPrefsCubit(repository: repo);

  test('initial state is NotificationPrefsInitial', () {
    expect(makeCubit().state, const NotificationPrefsInitial());
  });

  // ── load() ───────────────────────────────────────────────────────────────

  blocTest<NotificationPrefsCubit, NotificationPrefsState>(
    'load() emits [Loading, Loaded] on happy path',
    setUp: () {
      when(() => repo.listMySubscriptions())
          .thenAnswer((_) async => [_kSubscription]);
    },
    build: makeCubit,
    act: (cubit) => cubit.load(),
    expect: () => [
      const NotificationPrefsLoading(),
      NotificationPrefsLoaded(subscriptions: [_kSubscription]),
    ],
  );

  blocTest<NotificationPrefsCubit, NotificationPrefsState>(
    'load() emits Failure with AppFailure.message when repository throws AppFailure',
    setUp: () {
      when(() => repo.listMySubscriptions())
          .thenThrow(const AppFailure(code: 'ERR', message: 'boom'));
    },
    build: makeCubit,
    act: (cubit) => cubit.load(),
    expect: () => [
      const NotificationPrefsLoading(),
      const NotificationPrefsFailure(message: 'boom'),
    ],
  );

  blocTest<NotificationPrefsCubit, NotificationPrefsState>(
    'load() emits fallback Failure message on a generic exception',
    setUp: () {
      when(() => repo.listMySubscriptions()).thenThrow(Exception('network'));
    },
    build: makeCubit,
    act: (cubit) => cubit.load(),
    expect: () => [
      const NotificationPrefsLoading(),
      const NotificationPrefsFailure(
        message: 'No se pudieron cargar las preferencias.',
      ),
    ],
  );

  // ── toggleType() ─────────────────────────────────────────────────────────

  blocTest<NotificationPrefsCubit, NotificationPrefsState>(
    'toggleType() saves and refreshes subscriptions on happy path',
    seed: () => NotificationPrefsLoaded(subscriptions: [_kSubscription]),
    setUp: () {
      when(() => repo.upsertSubscription(
            enabled: true,
            enabledTypes: any(named: 'enabledTypes'),
          )).thenAnswer((_) async => _kSubscription);
      when(() => repo.listMySubscriptions())
          .thenAnswer((_) async => [_kSubscription]);
    },
    build: makeCubit,
    act: (cubit) => cubit.toggleType('CHAT_MESSAGE', true),
    expect: () => [
      isA<NotificationPrefsLoaded>().having((s) => s.saving, 'saving', true),
      isA<NotificationPrefsLoaded>()
          .having((s) => s.saving, 'saving', false)
          .having((s) => s.saveError, 'saveError', isNull)
          .having((s) => s.subscriptions, 'subscriptions', [_kSubscription]),
    ],
    verify: (_) {
      verify(() => repo.upsertSubscription(
            enabled: true,
            enabledTypes: {'MATCH_SLOT_OPENED': true, 'CHAT_MESSAGE': true},
          )).called(1);
    },
  );

  blocTest<NotificationPrefsCubit, NotificationPrefsState>(
    'toggleType() is a no-op when state is not Loaded',
    seed: () => const NotificationPrefsLoading(),
    build: makeCubit,
    act: (cubit) => cubit.toggleType('CHAT_MESSAGE', true),
    expect: () => <NotificationPrefsState>[],
    verify: (_) {
      verifyNever(() => repo.upsertSubscription(
            enabled: any(named: 'enabled'),
            enabledTypes: any(named: 'enabledTypes'),
          ));
    },
  );

  blocTest<NotificationPrefsCubit, NotificationPrefsState>(
    'toggleType() is a no-op while already saving',
    seed: () =>
        NotificationPrefsLoaded(subscriptions: [_kSubscription], saving: true),
    build: makeCubit,
    act: (cubit) => cubit.toggleType('CHAT_MESSAGE', true),
    expect: () => <NotificationPrefsState>[],
    verify: (_) {
      verifyNever(() => repo.upsertSubscription(
            enabled: any(named: 'enabled'),
            enabledTypes: any(named: 'enabledTypes'),
          ));
    },
  );

  blocTest<NotificationPrefsCubit, NotificationPrefsState>(
    'toggleType() keeps the previous subscriptions and sets saveError with '
    'AppFailure.message on failure',
    seed: () => NotificationPrefsLoaded(subscriptions: [_kSubscription]),
    setUp: () {
      when(() => repo.upsertSubscription(
            enabled: true,
            enabledTypes: any(named: 'enabledTypes'),
          )).thenThrow(const AppFailure(code: 'ERR', message: 'boom'));
    },
    build: makeCubit,
    act: (cubit) => cubit.toggleType('CHAT_MESSAGE', true),
    expect: () => [
      isA<NotificationPrefsLoaded>().having((s) => s.saving, 'saving', true),
      isA<NotificationPrefsLoaded>()
          .having((s) => s.saving, 'saving', false)
          .having((s) => s.saveError, 'saveError', 'boom')
          .having((s) => s.subscriptions, 'subscriptions', [_kSubscription]),
    ],
  );

  blocTest<NotificationPrefsCubit, NotificationPrefsState>(
    'toggleType() sets a fallback saveError on a generic exception',
    seed: () => NotificationPrefsLoaded(subscriptions: [_kSubscription]),
    setUp: () {
      when(() => repo.upsertSubscription(
            enabled: true,
            enabledTypes: any(named: 'enabledTypes'),
          )).thenThrow(Exception('network'));
    },
    build: makeCubit,
    act: (cubit) => cubit.toggleType('CHAT_MESSAGE', true),
    expect: () => [
      isA<NotificationPrefsLoaded>().having((s) => s.saving, 'saving', true),
      isA<NotificationPrefsLoaded>().having(
        (s) => s.saveError,
        'saveError',
        'No se pudo guardar la preferencia.',
      ),
    ],
  );
}
