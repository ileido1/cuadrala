import 'package:bloc_test/bloc_test.dart';
import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/formatting/money_conversion.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/discover_matches_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/discover_matches_screen.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import '../goldens/matches_golden.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

class _MockVenueMapCubit extends MockCubit<VenueMapState>
    implements VenueMapCubit {}

//? Issue #116: discover_matches_screen.dart ya tenía tests de comportamiento
//? pero ningún golden. Cubre las dos fotos que un jugador realmente ve al
//? abrir "Descubrir": lista con partidas abiertas y el estado vacío.
void main() {
  late _MockMatchesRepository matchesRepository;
  late _MockExchangeRatesRepository exchangeRatesRepository;
  late _MockVenueMapCubit venueMapCubit;

  setUpAll(loadMatchesGoldenFonts);

  OpenMatchDto openMatch() => OpenMatchDto(
        id: 'match-1',
        sportId: 'sport-1',
        categoryId: 'cat-1',
        status: 'SCHEDULED',
        scheduledAt: DateTime(2030, 6, 1, 20),
        pricePerPlayerCents: 1000,
        maxParticipants: 4,
        participantCount: 2,
        openSpots: 2,
        clubName: 'Club Cuádrala',
        courtName: 'Cancha 1',
        locationLabel: 'Las Mercedes, Caracas',
        displayCurrency: 'USD',
      );

  setUp(() {
    matchesRepository = _MockMatchesRepository();
    exchangeRatesRepository = _MockExchangeRatesRepository();
    venueMapCubit = _MockVenueMapCubit();

    getIt.registerSingleton<MatchesRepository>(matchesRepository);
    getIt.registerSingleton<ExchangeRatesRepository>(exchangeRatesRepository);
    getIt.registerFactory<VenueMapCubit>(() => venueMapCubit);

    when(() => venueMapCubit.state).thenReturn(const VenueMapState());
    whenListen(venueMapCubit, const Stream<VenueMapState>.empty());
    when(() => venueMapCubit.search(any())).thenReturn(null);
    when(() => venueMapCubit.selectVenue(any())).thenReturn(null);
    when(
      () => venueMapCubit.load(
        radiusKm: any(named: 'radiusKm'),
        sportType: any(named: 'sportType'),
      ),
    ).thenAnswer((_) async {});

    when(() => matchesRepository.resolveDefaultSportId())
        .thenAnswer((_) async => 'sport-1');
    when(
      () => exchangeRatesRepository.listByCountry(
        countryCode: any(named: 'countryCode'),
      ),
    ).thenAnswer(
      (_) async => const [ExchangeRateRow(currency: 'USD', rateToBs: 50)],
    );
  });

  tearDown(() {
    getIt.unregister<MatchesRepository>();
    getIt.unregister<ExchangeRatesRepository>();
    getIt.unregister<VenueMapCubit>();
  });

  Future<void> pumpScreen(
    WidgetTester tester, {
    required OpenMatchesPage page,
    required Brightness brightness,
  }) async {
    when(
      () => matchesRepository.listOpenMatches(
        sportId: any(named: 'sportId'),
        page: any(named: 'page'),
        limit: any(named: 'limit'),
        gender: any(named: 'gender'),
        venueId: any(named: 'venueId'),
      ),
    ).thenAnswer((_) async => page);

    final cubit = DiscoverMatchesCubit(matchesRepository: matchesRepository);
    addTearDown(cubit.close);
    await pumpMatchesGolden(
      tester,
      brightness: brightness,
      child: BlocProvider<DiscoverMatchesCubit>.value(
        value: cubit,
        child: DiscoverMatchesScreen(now: DateTime(2030, 6, 1)),
      ),
    );
    await tester.pumpAndSettle();
  }

  for (final brightness in Brightness.values) {
    testWidgets('con partidas abiertas ${brightness.name}', (tester) async {
      await pumpScreen(
        tester,
        page: OpenMatchesPage(items: [openMatch()], page: 1, limit: 20, total: 1),
        brightness: brightness,
      );
      await expectLater(
        find.byKey(matchesGoldenKey),
        matchesGoldenFile('goldens/discover_matches_list_${brightness.name}.png'),
      );
    });

    testWidgets('estado vacío ${brightness.name}', (tester) async {
      await pumpScreen(
        tester,
        page: const OpenMatchesPage(items: [], page: 1, limit: 20, total: 0),
        brightness: brightness,
      );
      await expectLater(
        find.byKey(matchesGoldenKey),
        matchesGoldenFile('goldens/discover_matches_empty_${brightness.name}.png'),
      );
    });
  }
}
