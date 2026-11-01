import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/formatting/money_conversion.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/models/quick_match_search_dto.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/quick_match_repository.dart';
import 'package:cuadrala_mobile/src/features/quick_match/presentation/cubit/quick_match_cubit.dart';
import 'package:cuadrala_mobile/src/features/quick_match/presentation/quick_match_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import '../goldens/quick_match_golden.dart';

class _MockQuickMatchRepository extends Mock implements QuickMatchRepository {}

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockCatalogRepository extends Mock implements CatalogRepository {}

class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

//? Issue #90-97 audit (visual pass): quick_match_screen.dart had zero golden
//? coverage (unlike tournaments/, which has 60+ light/dark PNGs). Covers the
//? states a player actually sees: searching, open-match proposal, confirmed
//? and expired.
void main() {
  late _MockQuickMatchRepository repository;
  late _MockMatchesRepository matches;
  late _MockExchangeRatesRepository exchangeRates;

  setUpAll(loadQuickMatchGoldenFonts);

  setUp(() {
    repository = _MockQuickMatchRepository();
    matches = _MockMatchesRepository();
    exchangeRates = _MockExchangeRatesRepository();
    getIt.registerSingleton<MatchesRepository>(matches);
    getIt.registerSingleton<ExchangeRatesRepository>(exchangeRates);
    when(
      () => exchangeRates.listByCountry(countryCode: any(named: 'countryCode')),
    ).thenAnswer(
      (_) async => const [ExchangeRateRow(currency: 'USD', rateToBs: 50)],
    );
  });

  tearDown(() {
    getIt.unregister<MatchesRepository>();
    getIt.unregister<ExchangeRatesRepository>();
  });

  QuickMatchSearchDto searching() => QuickMatchSearchDto(
    id: 'search-1',
    sportId: 'sport-1',
    categoryId: 'category-1',
    status: 'SEARCHING',
    noMatchYet: false,
    slots: const ['EVENING'],
    targetDate: DateTime(2030, 6, 1),
    widenLevel: false,
    zoneKm: 5,
    includeOpenMatches: true,
    proposal: null,
  );

  QuickMatchSearchDto openMatchProposal() => QuickMatchSearchDto(
    id: 'search-1',
    sportId: 'sport-1',
    categoryId: 'category-1',
    status: 'PROPOSAL',
    noMatchYet: false,
    slots: const ['EVENING'],
    targetDate: DateTime(2030, 6, 1),
    widenLevel: false,
    zoneKm: 5,
    includeOpenMatches: true,
    proposal: QuickMatchProposalDto(
      id: 'proposal-1',
      type: 'OPEN_MATCH',
      status: 'PENDING',
      matchId: 'match-1',
      expiresAt: DateTime.now().add(const Duration(minutes: 2)),
    ),
  );

  QuickMatchSearchDto confirmed() => QuickMatchSearchDto(
    id: 'search-1',
    sportId: 'sport-1',
    categoryId: 'category-1',
    status: 'CONFIRMED',
    noMatchYet: false,
    slots: const ['EVENING'],
    targetDate: DateTime(2030, 6, 1),
    widenLevel: false,
    zoneKm: 5,
    includeOpenMatches: true,
    proposal: QuickMatchProposalDto(
      id: 'proposal-1',
      type: 'OPEN_MATCH',
      status: 'CONFIRMED',
      matchId: 'match-1',
      playerIds: const ['player-1', 'player-2', 'player-3', 'player-4'],
      expiresAt: DateTime.now().add(const Duration(minutes: 2)),
    ),
  );

  QuickMatchSearchDto expired() => QuickMatchSearchDto(
    id: 'search-1',
    sportId: 'sport-1',
    categoryId: 'category-1',
    status: 'EXPIRED',
    noMatchYet: true,
    slots: const ['EVENING'],
    targetDate: DateTime(2030, 6, 1),
    widenLevel: false,
    zoneKm: 5,
    includeOpenMatches: true,
    proposal: QuickMatchProposalDto(
      id: 'proposal-1',
      type: 'NEW_GROUP',
      status: 'EXPIRED',
      matchId: null,
      expiresAt: DateTime.now().subtract(const Duration(minutes: 1)),
    ),
  );

  MatchDetailDto matchDetail() => MatchDetailDto(
    id: 'match-1',
    sportId: 'sport-1',
    categoryId: 'category-1',
    categoryName: '7ma',
    type: 'OPEN',
    status: 'SCHEDULED',
    scheduledAt: DateTime(2030, 6, 1, 20),
    pricePerPlayerCents: 900,
    maxParticipants: 4,
    participantCount: 3,
    openSpots: 1,
    courtId: 'court-1',
    venueId: 'venue-1',
    clubName: 'Club Cuádrala',
    courtName: 'Cancha 2',
    locationLabel: 'Las Mercedes, Caracas',
    tournamentId: null,
    participants: const [],
    createdAt: DateTime(2030),
    updatedAt: DateTime(2030),
    pricingCurrency: 'USD',
    displayCurrency: 'USD',
  );

  Future<void> pumpScreen(
    WidgetTester tester, {
    required QuickMatchSearchDto? search,
    required Brightness brightness,
  }) async {
    when(() => repository.current()).thenAnswer((_) async => search);
    when(
      () => matches.getMatchDetail(any()),
    ).thenAnswer((_) async => matchDetail());
    final cubit = QuickMatchCubit(
      repository: repository,
      catalogRepository: _MockCatalogRepository(),
    );
    addTearDown(cubit.close);
    await pumpQuickMatchGolden(
      tester,
      brightness: brightness,
      child: BlocProvider<QuickMatchCubit>.value(
        value: cubit,
        child: const QuickMatchScreen(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
  }

  for (final brightness in Brightness.values) {
    testWidgets('searching ${brightness.name}', (tester) async {
      await pumpScreen(tester, search: searching(), brightness: brightness);
      await expectLater(
        find.byKey(quickMatchGoldenKey),
        matchesGoldenFile('goldens/searching_${brightness.name}.png'),
      );
    });

    testWidgets('open-match proposal ${brightness.name}', (tester) async {
      await pumpScreen(
        tester,
        search: openMatchProposal(),
        brightness: brightness,
      );
      await expectLater(
        find.byKey(quickMatchGoldenKey),
        matchesGoldenFile('goldens/proposal_open_match_${brightness.name}.png'),
      );
    });

    testWidgets('confirmed ${brightness.name}', (tester) async {
      await pumpScreen(tester, search: confirmed(), brightness: brightness);
      await expectLater(
        find.byKey(quickMatchGoldenKey),
        matchesGoldenFile('goldens/confirmed_${brightness.name}.png'),
      );
    });

    testWidgets('expired ${brightness.name}', (tester) async {
      await pumpScreen(tester, search: expired(), brightness: brightness);
      await expectLater(
        find.byKey(quickMatchGoldenKey),
        matchesGoldenFile('goldens/expired_${brightness.name}.png'),
      );
    });
  }
}
