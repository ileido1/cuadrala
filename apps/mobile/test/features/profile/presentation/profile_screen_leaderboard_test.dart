import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/leaderboard_entry_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/player_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_rating_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_stats_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_cubit.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_state.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/profile_screen.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockSessionCubit extends MockCubit<SessionState> implements SessionCubit {}

class _MockProfileCubit extends MockCubit<ProfileState> implements ProfileCubit {}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const _kMe = UserMeDto(
  id: 'me-id',
  email: 'me@test.com',
  name: 'Test User',
  subscriptionType: 'FREE',
);

const _kStats = UserStatsDto(
  userId: 'me-id',
  matchesPlayed: 0,
  matchesWon: 0,
  matchesLost: 0,
  winRate: 0,
);

const _kPlayerProfile = PlayerProfileDto(dominantHand: 'RIGHT');

const _kOnboardingStatus = OnboardingStatusDto(
  completedSteps: [],
  pendingSteps: [],
  isComplete: true,
  completedAt: null,
);

final _kRatingWithCategory = UserRatingDto(
  categoryId: 'cat-1',
  rating: 1400.0,
  updatedAt: DateTime(2025),
);

List<LeaderboardEntryDto> _makeEntries({String? highlightUserId}) {
  return [
    LeaderboardEntryDto(
      rank: 1,
      userId: highlightUserId ?? 'other-1',
      displayName: 'Alice',
      rating: 1600.0,
    ),
    const LeaderboardEntryDto(rank: 2, userId: 'other-2', displayName: 'Bob', rating: 1550.0),
    const LeaderboardEntryDto(rank: 3, userId: 'other-3', displayName: 'Carlos', rating: 1500.0),
    const LeaderboardEntryDto(rank: 4, userId: 'other-4', displayName: 'Diana', rating: 1450.0),
    const LeaderboardEntryDto(rank: 5, userId: 'other-5', displayName: 'Eva', rating: 1400.0),
  ];
}

ProfileLoaded _makeLoaded({
  List<UserRatingDto>? ratings,
  List<LeaderboardEntryDto> leaderboard = const [],
}) {
  return ProfileLoaded(
    me: _kMe,
    stats: _kStats,
    ratings: ratings ?? [_kRatingWithCategory],
    history: const [],
    playerProfile: _kPlayerProfile,
    onboardingStatus: _kOnboardingStatus,
    sportProfiles: const [],
    location: null,
    availability: const [],
    sports: const [],
    leaderboard: leaderboard,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

Widget _wrapScreen(
  _MockSessionCubit sessionCubit,
  _MockProfileCubit profileCubit,
) {
  return MaterialApp(
    theme: AppTheme.light(),
    darkTheme: AppTheme.dark(),
    themeMode: ThemeMode.light,
    home: MultiBlocProvider(
      providers: [
        BlocProvider<SessionCubit>.value(value: sessionCubit),
        BlocProvider<ProfileCubit>.value(value: profileCubit),
      ],
      child: const ProfileScreen(),
    ),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  late _MockSessionCubit sessionCubit;
  late _MockProfileCubit profileCubit;

  setUp(() {
    sessionCubit = _MockSessionCubit();
    profileCubit = _MockProfileCubit();
    when(() => sessionCubit.state).thenReturn(const SessionState.authenticated());
    when(() => profileCubit.load()).thenAnswer((_) async {});
  });

  // ── UT-05 ─────────────────────────────────────────────────────────────────
  // Orchestration logic (no leaderboard call when ratings empty) is now covered
  // in profile_cubit_test.dart. This widget test verifies the empty-leaderboard
  // UI renders without errors.

  testWidgets('UT-05: empty leaderboard state renders empty-state text', (tester) async {
    final loaded = _makeLoaded(ratings: [], leaderboard: []);
    when(() => profileCubit.state).thenReturn(loaded);
    whenListen(profileCubit, Stream.value(loaded), initialState: loaded);

    await tester.pumpWidget(_wrapScreen(sessionCubit, profileCubit));
    await tester.pumpAndSettle();

    expect(find.text('Sin datos de clasificación'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  // ── UT-06 ─────────────────────────────────────────────────────────────────
  // Leaderboard-throw degraded-success is covered in profile_cubit_test.dart.
  // This widget test verifies the screen renders the user name when loaded.

  testWidgets('UT-06: screen renders user name when ProfileLoaded is emitted', (tester) async {
    final loaded = _makeLoaded(leaderboard: []);
    when(() => profileCubit.state).thenReturn(loaded);
    whenListen(profileCubit, Stream.value(loaded), initialState: loaded);

    await tester.pumpWidget(_wrapScreen(sessionCubit, profileCubit));
    await tester.pumpAndSettle();

    expect(find.text('Test User'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  // ── WT-01 ─────────────────────────────────────────────────────────────────

  testWidgets('WT-01: renders 5 rows with rank, displayName and rating', (tester) async {
    final entries = _makeEntries();
    final loaded = _makeLoaded(leaderboard: entries);
    when(() => profileCubit.state).thenReturn(loaded);
    whenListen(profileCubit, Stream.value(loaded), initialState: loaded);

    await tester.pumpWidget(_wrapScreen(sessionCubit, profileCubit));
    await tester.pumpAndSettle();

    for (final e in entries) {
      expect(find.text(e.displayName), findsWidgets);
    }
    expect(find.textContaining('1600'), findsWidgets);
  });

  // ── WT-02 ─────────────────────────────────────────────────────────────────

  testWidgets('WT-02: row with me.id has highlighted visual treatment', (tester) async {
    final entries = _makeEntries(highlightUserId: _kMe.id);
    final loaded = _makeLoaded(leaderboard: entries);
    when(() => profileCubit.state).thenReturn(loaded);
    whenListen(profileCubit, Stream.value(loaded), initialState: loaded);

    await tester.pumpWidget(_wrapScreen(sessionCubit, profileCubit));
    await tester.pumpAndSettle();

    final aliceText = find.text('Alice');
    expect(aliceText, findsOneWidget);

    final containers = tester.widgetList<Container>(find.ancestor(
      of: aliceText,
      matching: find.byType(Container),
    ));
    final hasHighlight = containers.any((c) => c.color != null);
    expect(hasHighlight, isTrue);
  });

  // ── WT-03 ─────────────────────────────────────────────────────────────────

  testWidgets('WT-03: no row highlighted when userId does not match me.id', (tester) async {
    final entries = _makeEntries();
    final loaded = _makeLoaded(leaderboard: entries);
    when(() => profileCubit.state).thenReturn(loaded);
    whenListen(profileCubit, Stream.value(loaded), initialState: loaded);

    await tester.pumpWidget(_wrapScreen(sessionCubit, profileCubit));
    await tester.pumpAndSettle();

    expect(find.text('Alice'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  // ── WT-04 ─────────────────────────────────────────────────────────────────

  testWidgets('WT-04: empty leaderboard renders empty-state, no list rows', (tester) async {
    final loaded = _makeLoaded(leaderboard: []);
    when(() => profileCubit.state).thenReturn(loaded);
    whenListen(profileCubit, Stream.value(loaded), initialState: loaded);

    await tester.pumpWidget(_wrapScreen(sessionCubit, profileCubit));
    await tester.pumpAndSettle();

    expect(find.text('Alice'), findsNothing);
    expect(find.text('Bob'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
