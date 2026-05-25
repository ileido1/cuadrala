import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/leaderboard_entry_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/player_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_rating_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_stats_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_cubit.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_state.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

// CatalogRepository is `final class` — can't be mocked directly.
// We mock the underlying CatalogApi and construct the real repository.
class _MockCatalogApi extends Mock implements CatalogApi {}

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

const _kLeaderboardEntry = LeaderboardEntryDto(
  rank: 1,
  userId: 'other-id',
  displayName: 'Alice',
  rating: 1600.0,
);

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

void _stubHappyPath({
  required _MockProfileRepository profileRepo,
  required _MockOnboardingRepository onboardingRepo,
  required _MockCatalogApi catalogApi,
  List<UserRatingDto> ratings = const [],
  List<LeaderboardEntryDto> leaderboard = const [],
}) {
  when(() => profileRepo.getMe()).thenAnswer((_) async => _kMe);
  when(() => profileRepo.getUserStats(any())).thenAnswer((_) async => _kStats);
  when(() => profileRepo.getUserRatings(userId: any(named: 'userId')))
      .thenAnswer((_) async => ratings);
  when(
    () => profileRepo.getUserRatingHistory(
      userId: any(named: 'userId'),
      limit: any(named: 'limit'),
    ),
  ).thenAnswer((_) async => []);
  when(() => profileRepo.getPlayerProfile()).thenAnswer((_) async => _kPlayerProfile);
  when(() => profileRepo.getLeaderboard(any()))
      .thenAnswer((_) async => leaderboard);

  when(() => onboardingRepo.getStatus()).thenAnswer((_) async => _kOnboardingStatus);
  when(() => onboardingRepo.listSportProfiles()).thenAnswer((_) async => []);
  when(() => onboardingRepo.getLocation()).thenAnswer((_) async => null);
  when(() => onboardingRepo.listAvailability()).thenAnswer((_) async => []);

  when(() => catalogApi.listSportsEnvelope()).thenAnswer((_) async => {'sports': <Object?>[]});
}

ProfileCubit _makeCubit({
  required _MockProfileRepository profileRepo,
  required _MockOnboardingRepository onboardingRepo,
  required _MockCatalogApi catalogApi,
}) =>
    ProfileCubit(
      profileRepository: profileRepo,
      onboardingRepository: onboardingRepo,
      catalogRepository: CatalogRepository(catalogApi: catalogApi),
    );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  late _MockProfileRepository profileRepo;
  late _MockOnboardingRepository onboardingRepo;
  late _MockCatalogApi catalogApi;

  setUp(() {
    profileRepo = _MockProfileRepository();
    onboardingRepo = _MockOnboardingRepository();
    catalogApi = _MockCatalogApi();
  });

  // ── Happy path — non-empty ratings, leaderboard fetched ──────────────────

  blocTest<ProfileCubit, ProfileState>(
    'emits [ProfileLoading, ProfileLoaded] on happy path; leaderboard fetched when ratings non-empty',
    build: () {
      _stubHappyPath(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
        ratings: [_kRatingWithCategory],
        leaderboard: [_kLeaderboardEntry],
      );
      return _makeCubit(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      const ProfileLoading(),
      isA<ProfileLoaded>().having(
        (s) => s.leaderboard,
        'leaderboard',
        [_kLeaderboardEntry],
      ),
    ],
    verify: (_) {
      verify(() => profileRepo.getLeaderboard('cat-1')).called(1);
    },
  );

  // ── Empty ratings — leaderboard not fetched ───────────────────────────────

  blocTest<ProfileCubit, ProfileState>(
    'emits [ProfileLoading, ProfileLoaded] with empty leaderboard when ratings is empty',
    build: () {
      _stubHappyPath(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
        ratings: [],
      );
      return _makeCubit(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      const ProfileLoading(),
      isA<ProfileLoaded>().having(
        (s) => s.leaderboard,
        'leaderboard',
        isEmpty,
      ),
    ],
    verify: (_) {
      verifyNever(() => profileRepo.getLeaderboard(any()));
    },
  );

  // ── Leaderboard throws — degraded success ─────────────────────────────────

  blocTest<ProfileCubit, ProfileState>(
    'emits ProfileLoaded (not ProfileFailure) when leaderboard throws; leaderboard is empty',
    build: () {
      _stubHappyPath(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
        ratings: [_kRatingWithCategory],
      );
      when(() => profileRepo.getLeaderboard(any()))
          .thenThrow(Exception('network error'));
      return _makeCubit(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      const ProfileLoading(),
      isA<ProfileLoaded>().having(
        (s) => s.leaderboard,
        'leaderboard',
        isEmpty,
      ),
    ],
  );

  // ── Outer failure — AppFailure ────────────────────────────────────────────

  blocTest<ProfileCubit, ProfileState>(
    'emits [ProfileLoading, ProfileFailure] with AppFailure.message when getMe throws AppFailure',
    build: () {
      when(() => profileRepo.getMe()).thenThrow(
        const AppFailure(code: 'ERR', message: 'boom'),
      );
      return _makeCubit(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      const ProfileLoading(),
      const ProfileFailure(message: 'boom'),
    ],
  );

  // ── Outer failure — generic Exception ────────────────────────────────────

  blocTest<ProfileCubit, ProfileState>(
    'emits [ProfileLoading, ProfileFailure] with fallback message when getMe throws generic Exception',
    build: () {
      when(() => profileRepo.getMe()).thenThrow(Exception('generic'));
      return _makeCubit(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      const ProfileLoading(),
      const ProfileFailure(message: 'No se pudo cargar el perfil.'),
    ],
  );
}
