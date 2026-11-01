import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/formatting/money_conversion.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/discover_matches_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/discover_matches_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

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
}
