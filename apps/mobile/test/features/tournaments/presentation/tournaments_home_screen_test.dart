import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_page.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournaments_home_screen.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';

class _MockTournamentsRepository extends Mock implements TournamentsRepository {}

class _MockCatalogRepository extends Mock implements CatalogRepository {}

class _MockVenuesRepository extends Mock implements VenuesRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

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

    await _setupGetIt(tournamentsRepository, catalogRepository, venuesRepository, profileRepository);
  });

  tearDown(() async => getIt.reset());

  testWidgets('should not show a "Más filtros" affordance', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: TournamentsHomeScreen()));
    await tester.pumpAndSettle();

    expect(find.byTooltip('Más filtros'), findsNothing);
  });
}
