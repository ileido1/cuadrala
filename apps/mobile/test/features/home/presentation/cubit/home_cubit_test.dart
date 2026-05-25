import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/cubit/home_cubit.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/cubit/home_state.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockMatchesRepository extends Mock implements MatchesRepository {}

// ---------------------------------------------------------------------------
// Fakes / stubs
// ---------------------------------------------------------------------------

UserMeDto _stubProfile({String name = 'Carlos López'}) => UserMeDto(
      id: 'user-1',
      name: name,
      email: 'carlos@test.com',
      subscriptionType: 'FREE',
    );

OpenMatchDto _openMatch(String id) => OpenMatchDto(
      id: id,
      sportId: 'sport-1',
      categoryId: 'cat-1',
      categoryName: 'Primera',
      status: 'OPEN',
      scheduledAt: DateTime(2030, 6, 1, 18, 0),
      pricePerPlayerCents: 1500,
      maxParticipants: 4,
      participantCount: 2,
      openSpots: 2,
      clubName: 'Club',
      courtName: 'Cancha 1',
      locationLabel: 'BA',
    );

OpenMatchesPage _emptyPage() => const OpenMatchesPage(
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    );

OpenMatchesPage _pageWith(List<OpenMatchDto> items) => OpenMatchesPage(
      items: items,
      page: 1,
      limit: 20,
      total: items.length,
    );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  late _MockProfileRepository profileRepo;
  late _MockMatchesRepository matchesRepo;

  setUp(() {
    profileRepo = _MockProfileRepository();
    matchesRepo = _MockMatchesRepository();
  });

  HomeCubit makeCubit() => HomeCubit(
        profileRepository: profileRepo,
        matchesRepository: matchesRepo,
      );

  // ── 1. Happy path: both calls succeed ────────────────────────────────────

  blocTest<HomeCubit, HomeState>(
    'load() emits [HomeLoading, HomeLoaded] when both API calls succeed',
    build: () {
      when(() => profileRepo.getMe()).thenAnswer((_) async => _stubProfile());
      when(() => matchesRepo.resolveDefaultSportId()).thenAnswer((_) async => 'sport-1');
      when(
        () => matchesRepo.listOpenMatches(
          sportId: any(named: 'sportId'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        ),
      ).thenAnswer((_) async => _pageWith([_openMatch('open-1')]));
      when(
        () => matchesRepo.listMyMatchesSV(page: any(named: 'page'), limit: any(named: 'limit')),
      ).thenAnswer((_) async => _pageWith([_openMatch('my-1')]));
      return makeCubit();
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      isA<HomeLoading>(),
      isA<HomeLoaded>()
          .having((s) => s.openMatches.length, 'openMatches.length', 1)
          .having((s) => s.myMatches.length, 'myMatches.length', 1),
    ],
  );

  // ── 2. Partial failure: myMatches throws, openMatches succeeds ────────────

  blocTest<HomeCubit, HomeState>(
    'load() emits HomeLoaded with empty myMatches when listMyMatchesSV throws',
    build: () {
      when(() => profileRepo.getMe()).thenAnswer((_) async => _stubProfile());
      when(() => matchesRepo.resolveDefaultSportId()).thenAnswer((_) async => 'sport-1');
      when(
        () => matchesRepo.listOpenMatches(
          sportId: any(named: 'sportId'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        ),
      ).thenAnswer((_) async => _pageWith([_openMatch('open-1')]));
      when(
        () => matchesRepo.listMyMatchesSV(page: any(named: 'page'), limit: any(named: 'limit')),
      ).thenThrow(const AppFailure(code: 'NETWORK', message: 'timeout'));
      return makeCubit();
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      isA<HomeLoading>(),
      isA<HomeLoaded>()
          .having((s) => s.openMatches.length, 'openMatches.length', 1)
          .having((s) => s.myMatches, 'myMatches', isEmpty),
    ],
  );

  // ── 3. Total failure: profile throws → HomeFailure ───────────────────────

  blocTest<HomeCubit, HomeState>(
    'load() emits HomeFailure when profile call throws',
    build: () {
      when(() => profileRepo.getMe()).thenThrow(
        const AppFailure(code: 'AUTH', message: 'No autorizado'),
      );
      when(() => matchesRepo.resolveDefaultSportId()).thenAnswer((_) async => 'sport-1');
      when(
        () => matchesRepo.listOpenMatches(
          sportId: any(named: 'sportId'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        ),
      ).thenAnswer((_) async => _emptyPage());
      when(
        () => matchesRepo.listMyMatchesSV(page: any(named: 'page'), limit: any(named: 'limit')),
      ).thenAnswer((_) async => _emptyPage());
      return makeCubit();
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      isA<HomeLoading>(),
      isA<HomeFailure>().having((s) => s.message, 'message', 'No autorizado'),
    ],
  );

  // ── 4. First name extraction ─────────────────────────────────────────────

  blocTest<HomeCubit, HomeState>(
    'load() extracts first name from full name',
    build: () {
      when(() => profileRepo.getMe()).thenAnswer((_) async => _stubProfile(name: 'María Inés García'));
      when(() => matchesRepo.resolveDefaultSportId()).thenAnswer((_) async => 'sport-1');
      when(
        () => matchesRepo.listOpenMatches(
          sportId: any(named: 'sportId'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
        ),
      ).thenAnswer((_) async => _emptyPage());
      when(
        () => matchesRepo.listMyMatchesSV(page: any(named: 'page'), limit: any(named: 'limit')),
      ).thenAnswer((_) async => _emptyPage());
      return makeCubit();
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      isA<HomeLoading>(),
      isA<HomeLoaded>().having((s) => s.greetingName, 'greetingName', 'María'),
    ],
  );
}
