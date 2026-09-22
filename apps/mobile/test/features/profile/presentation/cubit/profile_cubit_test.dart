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
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/viewer_tournament_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

// CatalogRepository is `final class` — can't be mocked directly.
// We mock the underlying CatalogApi and construct the real repository.
class _MockCatalogApi extends Mock implements CatalogApi {}

class _MockTournamentsRepository extends Mock
    implements TournamentsRepository {}

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

ViewerTournamentDto _viewerTournament({
  required String id,
  required DateTime? startsAt,
  required String? registrationStatus,
  String? pendingInvitationId,
  bool isOrganizer = false,
}) => ViewerTournamentDto(
  tournament: TournamentListItemDto(
    id: id,
    name: id,
    status: 'COMPLETED',
    sportName: 'Padel',
    categoryId: 'cat-1',
    categoryName: '7ma',
    startsAt: startsAt,
    registrationCount: 8,
  ),
  registrationStatus: registrationStatus,
  pendingInvitationId: pendingInvitationId,
  isOrganizer: isOrganizer,
  pendingRegistrationsCount: isOrganizer ? 0 : null,
);

final _kOrganizerOnlyTournament = _viewerTournament(
  id: 'organized-tournament',
  startsAt: DateTime.utc(2026, 4, 1),
  registrationStatus: null,
  isOrganizer: true,
);

final _kInvitationOnlyTournament = _viewerTournament(
  id: 'invitation-only-tournament',
  startsAt: DateTime.utc(2026, 5, 1),
  registrationStatus: null,
  pendingInvitationId: 'invitation-1',
);

final _kRegisteredTournament = _viewerTournament(
  id: 'registered-tournament',
  startsAt: DateTime.utc(2026, 3, 1),
  registrationStatus: 'CONFIRMED',
);

final _kPendingRegisteredTournament = _viewerTournament(
  id: 'pending-registered-tournament',
  startsAt: DateTime.utc(2026, 2, 1),
  registrationStatus: 'PENDING',
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
  when(
    () => profileRepo.getUserRatings(userId: any(named: 'userId')),
  ).thenAnswer((_) async => ratings);
  when(
    () => profileRepo.getUserRatingHistory(
      userId: any(named: 'userId'),
      limit: any(named: 'limit'),
    ),
  ).thenAnswer((_) async => []);
  when(
    () => profileRepo.getPlayerProfile(),
  ).thenAnswer((_) async => _kPlayerProfile);
  when(
    () => profileRepo.getLeaderboard(any()),
  ).thenAnswer((_) async => leaderboard);

  when(
    () => onboardingRepo.getStatus(),
  ).thenAnswer((_) async => _kOnboardingStatus);
  when(() => onboardingRepo.listSportProfiles()).thenAnswer((_) async => []);
  when(() => onboardingRepo.getLocation()).thenAnswer((_) async => null);
  when(() => onboardingRepo.listAvailability()).thenAnswer((_) async => []);

  when(
    () => catalogApi.listSportsEnvelope(),
  ).thenAnswer((_) async => {'sports': <Object?>[]});
}

ProfileCubit _makeCubit({
  required _MockProfileRepository profileRepo,
  required _MockOnboardingRepository onboardingRepo,
  required _MockCatalogApi catalogApi,
  TournamentsRepository? tournamentsRepository,
}) => ProfileCubit(
  profileRepository: profileRepo,
  onboardingRepository: onboardingRepo,
  catalogRepository: CatalogRepository(catalogApi: catalogApi),
  tournamentsRepository: tournamentsRepository,
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  late _MockProfileRepository profileRepo;
  late _MockOnboardingRepository onboardingRepo;
  late _MockCatalogApi catalogApi;
  late _MockTournamentsRepository tournamentsRepo;

  setUp(() {
    profileRepo = _MockProfileRepository();
    onboardingRepo = _MockOnboardingRepository();
    catalogApi = _MockCatalogApi();
    tournamentsRepo = _MockTournamentsRepository();
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
      isA<ProfileLoaded>().having((s) => s.leaderboard, 'leaderboard', [
        _kLeaderboardEntry,
      ]),
    ],
    verify: (_) {
      verify(() => profileRepo.getLeaderboard('cat-1')).called(1);
    },
  );

  blocTest<ProfileCubit, ProfileState>(
    'should exclude organizer-only tournaments when loading profile history',
    build: () {
      _stubHappyPath(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
      );
      when(
        () => tournamentsRepo.listMyTournaments(),
      ).thenAnswer((_) async => [_kOrganizerOnlyTournament]);
      return _makeCubit(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
        tournamentsRepository: tournamentsRepo,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      const ProfileLoading(),
      isA<ProfileLoaded>().having(
        (state) => state.myTournaments,
        'myTournaments',
        isEmpty,
      ),
    ],
  );

  blocTest<ProfileCubit, ProfileState>(
    'should exclude invitation-only tournaments from profile history',
    build: () {
      _stubHappyPath(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
      );
      when(
        () => tournamentsRepo.listMyTournaments(),
      ).thenAnswer((_) async => [_kInvitationOnlyTournament]);
      return _makeCubit(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
        tournamentsRepository: tournamentsRepo,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      const ProfileLoading(),
      isA<ProfileLoaded>().having(
        (state) => state.myTournaments,
        'myTournaments',
        isEmpty,
      ),
    ],
  );

  blocTest<ProfileCubit, ProfileState>(
    'should include PENDING player registrations in profile history',
    build: () {
      _stubHappyPath(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
      );
      when(() => tournamentsRepo.listMyTournaments()).thenAnswer(
        (_) async => [_kPendingRegisteredTournament, _kRegisteredTournament],
      );
      return _makeCubit(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
        tournamentsRepository: tournamentsRepo,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      const ProfileLoading(),
      isA<ProfileLoaded>().having(
        (state) => state.myTournaments,
        'myTournaments',
        [_kRegisteredTournament, _kPendingRegisteredTournament],
      ),
    ],
  );

  blocTest<ProfileCubit, ProfileState>(
    'should sort registered tournaments by startsAt descending',
    build: () {
      _stubHappyPath(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
      );
      final oldest = _viewerTournament(
        id: 'oldest',
        startsAt: DateTime.utc(2026, 1, 1),
        registrationStatus: 'CONFIRMED',
      );
      final newest = _viewerTournament(
        id: 'newest',
        startsAt: DateTime.utc(2026, 3, 1),
        registrationStatus: 'CONFIRMED',
      );
      final middle = _viewerTournament(
        id: 'middle',
        startsAt: DateTime.utc(2026, 2, 1),
        registrationStatus: 'PENDING',
      );
      when(
        () => tournamentsRepo.listMyTournaments(),
      ).thenAnswer((_) async => [oldest, newest, middle]);
      return _makeCubit(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
        tournamentsRepository: tournamentsRepo,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      const ProfileLoading(),
      isA<ProfileLoaded>().having(
        (state) => state.myTournaments
            .map((item) => item.tournament.id)
            .toList(growable: false),
        'ordered tournament ids',
        ['newest', 'middle', 'oldest'],
      ),
    ],
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
      isA<ProfileLoaded>().having((s) => s.leaderboard, 'leaderboard', isEmpty),
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
      when(
        () => profileRepo.getLeaderboard(any()),
      ).thenThrow(Exception('network error'));
      return _makeCubit(
        profileRepo: profileRepo,
        onboardingRepo: onboardingRepo,
        catalogApi: catalogApi,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      const ProfileLoading(),
      isA<ProfileLoaded>().having((s) => s.leaderboard, 'leaderboard', isEmpty),
    ],
  );

  // ── Outer failure — AppFailure ────────────────────────────────────────────

  blocTest<ProfileCubit, ProfileState>(
    'emits [ProfileLoading, ProfileFailure] with AppFailure.message when getMe throws AppFailure',
    build: () {
      when(
        () => profileRepo.getMe(),
      ).thenThrow(const AppFailure(code: 'ERR', message: 'boom'));
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
