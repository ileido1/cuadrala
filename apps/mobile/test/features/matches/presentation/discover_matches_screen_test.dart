import 'package:bloc_test/bloc_test.dart';
import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/formatting/money_conversion.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/discover_matches_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/discover_matches_screen.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/create_match_panel.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/shared/widgets/empty_state.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

class _MockVenueMapCubit extends MockCubit<VenueMapState>
    implements VenueMapCubit {}

OpenMatchDto _openMatch() {
  return OpenMatchDto(
    id: 'match-1',
    sportId: 'sport-1',
    categoryId: 'cat-1',
    status: 'SCHEDULED',
    scheduledAt: DateTime.now().add(const Duration(days: 1)),
    pricePerPlayerCents: 1000,
    maxParticipants: 4,
    participantCount: 2,
    openSpots: 2,
    clubName: 'Club Test',
    courtName: 'Cancha 1',
    locationLabel: 'Dirección',
    displayCurrency: 'USD',
  );
}

Widget _wrap(DiscoverMatchesCubit cubit) {
  return MaterialApp(
    home: BlocProvider<DiscoverMatchesCubit>.value(
      value: cubit,
      child: const DiscoverMatchesScreen(),
    ),
  );
}

void main() {
  late _MockMatchesRepository matchesRepository;
  late _MockExchangeRatesRepository exchangeRatesRepository;
  late DiscoverMatchesCubit cubit;

  setUp(() {
    matchesRepository = _MockMatchesRepository();
    exchangeRatesRepository = _MockExchangeRatesRepository();
    cubit = DiscoverMatchesCubit(matchesRepository: matchesRepository);

    getIt.registerSingleton<MatchesRepository>(matchesRepository);
    getIt.registerSingleton<ExchangeRatesRepository>(exchangeRatesRepository);

    when(() => matchesRepository.resolveDefaultSportId())
        .thenAnswer((_) async => 'sport-1');
    when(
      () => matchesRepository.listOpenMatches(
        sportId: any(named: 'sportId'),
        page: any(named: 'page'),
        limit: any(named: 'limit'),
        gender: any(named: 'gender'),
        venueId: any(named: 'venueId'),
      ),
    ).thenAnswer(
      (_) async => OpenMatchesPage(
        items: [_openMatch()],
        page: 1,
        limit: 20,
        total: 1,
      ),
    );
  });

  tearDown(() {
    cubit.close();
    getIt.unregister<MatchesRepository>();
    getIt.unregister<ExchangeRatesRepository>();
  });

  testWidgets(
    'shows the Bs secondary price in the join-match bottom sheet once exchange rates are available',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      when(
        () => exchangeRatesRepository.listByCountry(
          countryCode: any(named: 'countryCode'),
        ),
      ).thenAnswer(
        (_) async => const [ExchangeRateRow(currency: 'USD', rateToBs: 50)],
      );

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Unirse'));
      await tester.pumpAndSettle();

      expect(find.text('Bs. 500.00'), findsOneWidget);
    },
  );

  testWidgets(
    'shows only the primary price when exchange rates are unavailable',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      when(
        () => exchangeRatesRepository.listByCountry(
          countryCode: any(named: 'countryCode'),
        ),
      ).thenAnswer((_) async => const []);

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Unirse'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Bs.'), findsNothing);
    },
  );

  group('empty state', () {
    late _MockVenueMapCubit venueMapCubit;

    setUp(() {
      venueMapCubit = _MockVenueMapCubit();
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

      // Sin resultados: la cubit no tiene partidas que mostrar.
      when(
        () => matchesRepository.listOpenMatches(
          sportId: any(named: 'sportId'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
          gender: any(named: 'gender'),
          venueId: any(named: 'venueId'),
        ),
      ).thenAnswer(
        (_) async => const OpenMatchesPage(
          items: [],
          page: 1,
          limit: 20,
          total: 0,
        ),
      );
      when(
        () => exchangeRatesRepository.listByCountry(
          countryCode: any(named: 'countryCode'),
        ),
      ).thenAnswer((_) async => const []);
    });

    tearDown(() {
      getIt.unregister<VenueMapCubit>();
    });

    testWidgets(
      'shows the shared EmptyState widget with guidance copy and a "Crear partida" CTA',
      (tester) async {
        tester.view.physicalSize = const Size(800, 1400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(_wrap(cubit));
        await tester.pumpAndSettle();

        expect(find.byType(EmptyState), findsOneWidget);
        expect(find.text('Nada con esos filtros'), findsOneWidget);
        expect(
          find.text('Prueba otro día o crea tu propia partida.'),
          findsOneWidget,
        );
        expect(find.text('Crear partida'), findsOneWidget);
      },
    );

    testWidgets(
      'tapping the "Crear partida" CTA opens the match-creation panel',
      (tester) async {
        tester.view.physicalSize = const Size(800, 1400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(_wrap(cubit));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Crear partida'));
        await tester.pumpAndSettle();

        expect(find.byType(CreateMatchPanel), findsOneWidget);
      },
    );
  });
}
