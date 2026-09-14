import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_page.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/viewer_tournament_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_api.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournaments_home_screen.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';

import '../handoff_copy.dart';

class _MockTournamentsRepository extends Mock implements TournamentsRepository {}

class _MockCatalogRepository extends Mock implements CatalogRepository {}

class _MockVenuesRepository extends Mock implements VenuesRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

const _meWithCategory = UserMeDto(
  id: 'user-2',
  email: 'user2@test.local',
  name: 'Jugadora',
  subscriptionType: 'FREE',
  primaryRating: UserPrimaryRatingDto(
    categoryId: 'cat-own',
    categoryName: 'Cuarta',
    sportId: 'sport-1',
    rating: 3.5,
  ),
);

Future<void> _setupGetIt(
  _MockTournamentsRepository tournamentsRepository,
  _MockCatalogRepository catalogRepository,
  _MockVenuesRepository venuesRepository,
  _MockProfileRepository profileRepository,
) async {
  await getIt.reset();
  getIt.registerLazySingleton<TournamentsRepository>(() => tournamentsRepository);
  getIt.registerLazySingleton<CatalogRepository>(() => catalogRepository);
  getIt.registerLazySingleton<VenuesRepository>(() => venuesRepository);
  getIt.registerLazySingleton<ProfileRepository>(() => profileRepository);
}

void main() {
  late _MockTournamentsRepository tournamentsRepository;
  late _MockCatalogRepository catalogRepository;
  late _MockVenuesRepository venuesRepository;
  late _MockProfileRepository profileRepository;

  setUp(() async {
    tournamentsRepository = _MockTournamentsRepository();
    catalogRepository = _MockCatalogRepository();
    venuesRepository = _MockVenuesRepository();
    profileRepository = _MockProfileRepository();

    when(
      () => tournamentsRepository.listTournaments(
        page: any(named: 'page'),
        limit: any(named: 'limit'),
        filters: any(named: 'filters'),
      ),
    ).thenAnswer(
      (_) async => const TournamentListPage(items: [], page: 1, limit: 20, total: 0),
    );
    when(() => catalogRepository.listSports()).thenAnswer((_) async => []);
    when(
      () => catalogRepository.listCategories(sportId: any(named: 'sportId')),
    ).thenAnswer((_) async => []);
    when(
      () => venuesRepository.listVenues(page: any(named: 'page'), limit: any(named: 'limit')),
    ).thenAnswer((_) async => []);
    when(() => profileRepository.getMe()).thenAnswer(
      (_) async => const UserMeDto(
        id: 'user-1',
        email: 'user@test.local',
        name: 'Jugador',
        subscriptionType: 'FREE',
      ),
    );
    when(() => tournamentsRepository.listMyTournaments())
        .thenAnswer((_) async => const []);

    await _setupGetIt(tournamentsRepository, catalogRepository, venuesRepository, profileRepository);
  });

  tearDown(() async => getIt.reset());

  testWidgets('should not show a "Más filtros" affordance', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: TournamentsHomeScreen()));
    await tester.pumpAndSettle();

    expect(find.byTooltip('Más filtros'), findsNothing);
  });

  group('Mi categoría chip (M3c-2)', () {
    testWidgets(
      'renders "Mi categoría {N}" selected by default when the viewer has a category',
      (tester) async {
        when(() => profileRepository.getMe()).thenAnswer((_) async => _meWithCategory);

        await tester.pumpWidget(const MaterialApp(home: TournamentsHomeScreen()));
        await tester.pumpAndSettle();

        expect(find.text(miCategoriaLabel('Cuarta')), findsOneWidget);
      },
    );

    testWidgets(
      'hides the chip when the viewer has no category',
      (tester) async {
        // setUp() ya deja profileRepository.getMe() sin primaryRating.
        await tester.pumpWidget(const MaterialApp(home: TournamentsHomeScreen()));
        await tester.pumpAndSettle();

        expect(find.textContaining('Mi categoría'), findsNothing);
      },
    );

    testWidgets(
      'toggling the chip clears and re-applies the category filter through applyFilters',
      (tester) async {
        when(() => profileRepository.getMe()).thenAnswer((_) async => _meWithCategory);

        await tester.pumpWidget(const MaterialApp(home: TournamentsHomeScreen()));
        await tester.pumpAndSettle();

        verify(
          () => tournamentsRepository.listTournaments(
            page: any(named: 'page'),
            limit: any(named: 'limit'),
            filters: any(
              named: 'filters',
              that: predicate<TournamentListFilters?>(
                (f) => f?.categoryId == 'cat-own',
              ),
            ),
          ),
        ).called(1);

        await tester.tap(find.text(miCategoriaLabel('Cuarta')));
        await tester.pumpAndSettle();

        verify(
          () => tournamentsRepository.listTournaments(
            page: any(named: 'page'),
            limit: any(named: 'limit'),
            filters: any(
              named: 'filters',
              that: predicate<TournamentListFilters?>(
                (f) => f?.categoryId == null,
              ),
            ),
          ),
        ).called(1);

        await tester.tap(find.text(miCategoriaLabel('Cuarta')));
        await tester.pumpAndSettle();

        verify(
          () => tournamentsRepository.listTournaments(
            page: any(named: 'page'),
            limit: any(named: 'limit'),
            filters: any(
              named: 'filters',
              that: predicate<TournamentListFilters?>(
                (f) => f?.categoryId == 'cat-own',
              ),
            ),
          ),
        ).called(1);
      },
    );
  });

  group('Mis torneos (M4a)', () {
    const viewerTournamentA = ViewerTournamentDto(
      tournament: TournamentListItemDto(
        id: 't-1',
        name: 'Copa Cuádrala',
        status: 'OPEN',
        sportName: 'Padel',
        categoryName: '7ma',
        categoryId: 'cat-1',
        startsAt: null,
        registrationCount: 8,
      ),
      registrationStatus: 'CONFIRMED',
      pendingInvitationId: null,
      isOrganizer: false,
      pendingRegistrationsCount: null,
    );
    const viewerTournamentB = ViewerTournamentDto(
      tournament: TournamentListItemDto(
        id: 't-2',
        name: 'Nocturno Chacao',
        status: 'OPEN',
        sportName: 'Padel',
        categoryName: '5ta',
        categoryId: 'cat-2',
        startsAt: null,
        registrationCount: 4,
      ),
      registrationStatus: 'PENDING',
      pendingInvitationId: null,
      isOrganizer: false,
      pendingRegistrationsCount: null,
    );

    testWidgets(
      'renders both tournaments the viewer is registered in, with real data instead of a hardcoded empty list',
      (tester) async {
        when(() => tournamentsRepository.listMyTournaments())
            .thenAnswer((_) async => [viewerTournamentA, viewerTournamentB]);

        await tester.pumpWidget(const MaterialApp(home: TournamentsHomeScreen()));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Mis torneos'));
        await tester.pumpAndSettle();

        expect(find.text('Copa Cuádrala'), findsOneWidget);
        expect(find.text('Nocturno Chacao'), findsOneWidget);
        expect(find.text(viewerRegistrationStatusLabel('CONFIRMED')), findsOneWidget);
        expect(find.text(viewerRegistrationStatusLabel('PENDING')), findsOneWidget);
      },
    );

    testWidgets(
      'shows the "Mis torneos" empty state when the viewer has none',
      (tester) async {
        await tester.pumpWidget(const MaterialApp(home: TournamentsHomeScreen()));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Mis torneos'));
        await tester.pumpAndSettle();

        expect(find.text('Todavía no te anotaste a ninguno'), findsOneWidget);
      },
    );
  });

  //? M4b-1 agregó `pendingInvitationId`/`isOrganizer` a `TournamentListItemTile`
  //? pero dejó la pantalla sin tocar a propósito (ver apply-progress); esta es
  //? la pieza de wiring que M4b-2 cierra: sin esto, esos parámetros del tile
  //? son código muerto desde la perspectiva de la app corriendo.
  group('M4b-2 — invitation/organizer wiring', () {
    const invitedTournament = ViewerTournamentDto(
      tournament: TournamentListItemDto(
        id: 't-3',
        name: 'Liga Base Aérea',
        status: 'OPEN',
        sportName: 'Padel',
        categoryName: '7ma',
        categoryId: 'cat-1',
        startsAt: null,
        registrationCount: 6,
        venueName: 'Base Aérea Padel',
      ),
      registrationStatus: null,
      pendingInvitationId: 'invitation-1',
      isOrganizer: false,
      pendingRegistrationsCount: null,
    );
    const organizedTournament = ViewerTournamentDto(
      tournament: TournamentListItemDto(
        id: 't-4',
        name: 'Interclubes Caracas',
        status: 'OPEN',
        sportName: 'Padel',
        categoryName: '6ta',
        categoryId: 'cat-1',
        startsAt: null,
        registrationCount: 16,
      ),
      registrationStatus: null,
      pendingInvitationId: null,
      isOrganizer: true,
      pendingRegistrationsCount: 4,
    );

    testWidgets(
      'renders the invitation banner on a "Mis torneos" card with a pending invitation',
      (tester) async {
        when(() => tournamentsRepository.listMyTournaments())
            .thenAnswer((_) async => [invitedTournament]);

        await tester.pumpWidget(const MaterialApp(home: TournamentsHomeScreen()));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Mis torneos'));
        await tester.pumpAndSettle();

        expect(
          find.text(invitationBannerTitle('Base Aérea Padel')),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'renders the organizer row on a "Mis torneos" card the viewer organizes',
      (tester) async {
        when(() => tournamentsRepository.listMyTournaments())
            .thenAnswer((_) async => [organizedTournament]);

        await tester.pumpWidget(const MaterialApp(home: TournamentsHomeScreen()));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Mis torneos'));
        await tester.pumpAndSettle();

        expect(
          find.text(organizerRowTitle('Interclubes Caracas')),
          findsOneWidget,
        );
      },
    );
  });
}
