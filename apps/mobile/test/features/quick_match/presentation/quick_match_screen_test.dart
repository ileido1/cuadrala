import 'package:clock/clock.dart';
import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/formatting/money_conversion.dart';
import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/models/category_dto.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/models/sport_dto.dart';
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

class _MockQuickMatchRepository extends Mock implements QuickMatchRepository {}

class _MockCatalogRepository extends Mock implements CatalogRepository {}

class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

class _MockMatchesRepository extends Mock implements MatchesRepository {}

QuickMatchSearchDto _searching({bool noMatchYet = false}) => QuickMatchSearchDto(
  id: 'search-1',
  sportId: 'sport-1',
  categoryId: 'category-1',
  status: 'SEARCHING',
  noMatchYet: noMatchYet,
  slots: const ['EVENING'],
  targetDate: DateTime(2030, 6, 1),
  widenLevel: false,
  zoneKm: 5,
  includeOpenMatches: true,
  proposal: null,
);

QuickMatchSearchDto _openMatchProposal() => QuickMatchSearchDto(
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

MatchDetailDto _matchDetail() => MatchDetailDto(
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
  participants: [
    MatchParticipantDto(
      userId: 'player-1',
      displayName: 'Carlos R.',
      joinedAt: DateTime(2030),
    ),
    MatchParticipantDto(
      userId: 'player-2',
      displayName: 'Ana M.',
      joinedAt: DateTime(2030),
    ),
    MatchParticipantDto(
      userId: 'player-3',
      displayName: 'Luis P.',
      joinedAt: DateTime(2030),
    ),
  ],
  createdAt: DateTime(2030),
  updatedAt: DateTime(2030),
  pricingCurrency: 'USD',
  displayCurrency: 'USD',
);

Widget _wrap(QuickMatchCubit cubit) => MaterialApp(
  theme: AppTheme.dark(),
  home: BlocProvider<QuickMatchCubit>.value(
    value: cubit,
    child: const QuickMatchScreen(),
  ),
);


QuickMatchSearchDto _waitingGroup() => QuickMatchSearchDto(
  id: 'search-1', sportId: 'sport-1', categoryId: 'category-1',
  status: 'CONFIRMED', noMatchYet: false, slots: const ['EVENING'],
  targetDate: DateTime(2030, 6, 1), widenLevel: false, zoneKm: 5,
  includeOpenMatches: true,
  proposal: QuickMatchProposalDto(
    id: 'group-1', type: 'NEW_GROUP', status: 'CONFIRMED', matchId: null,
    playerIds: const ['player-1'], expiresAt: DateTime.now().add(const Duration(minutes: 2)),
  ),
);

QuickMatchSearchDto _expired({required String proposalType}) =>
    QuickMatchSearchDto(
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
        type: proposalType,
        status: 'EXPIRED',
        matchId: null,
        expiresAt: DateTime.now().subtract(const Duration(minutes: 1)),
      ),
    );

void main() {
  late _MockQuickMatchRepository repository;
  late _MockCatalogRepository catalog;
  late _MockMatchesRepository matches;
  late _MockExchangeRatesRepository exchangeRates;
  late QuickMatchCubit cubit;

  setUp(() {
    repository = _MockQuickMatchRepository();
    catalog = _MockCatalogRepository();
    matches = _MockMatchesRepository();
    exchangeRates = _MockExchangeRatesRepository();
    cubit = QuickMatchCubit(repository: repository, catalogRepository: catalog);
    getIt.registerSingleton<MatchesRepository>(matches);
    getIt.registerSingleton<ExchangeRatesRepository>(exchangeRates);
    when(
      () => exchangeRates.listByCountry(countryCode: any(named: 'countryCode')),
    ).thenAnswer((_) async => const []);
  });

  tearDown(() {
    cubit.close();
    getIt.unregister<MatchesRepository>();
    getIt.unregister<ExchangeRatesRepository>();
  });

  testWidgets('renders the active queue handoff hierarchy while searching', (
    tester,
  ) async {
    when(() => repository.current()).thenAnswer((_) async => _searching());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Búsqueda activa'), findsOneWidget);
    expect(find.text('Buscando jugadores'), findsOneWidget);
    expect(find.text('Revisando partidas abiertas'), findsOneWidget);
    expect(find.text('Editar preferencias'), findsOneWidget);
    expect(find.text('Salir de la cola'), findsOneWidget);
  });

  testWidgets('should label the search as Hoy when its target date is today', (
    tester,
  ) async {
    //? La pantalla lee la hora vía `clock`, así que el test puede fijarla.
    await withClock(Clock.fixed(DateTime(2030, 6, 1, 10)), () async {
      when(() => repository.current()).thenAnswer((_) async => _searching());

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      expect(find.textContaining('Hoy · noche'), findsOneWidget);
    });
  });

  testWidgets('shows that an incremental group keeps filling after joining', (tester) async {
    when(() => repository.current()).thenAnswer((_) async => _waitingGroup());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Estamos formando el grupo'), findsOneWidget);
    expect(find.textContaining('1 de 4 jugadores confirmados'), findsOneWidget);
  });

  // Issue #121: antes de este fix, la única acción disponible mientras el
  // grupo se forma era "Volver al inicio" — navegación pura, no cancelaba
  // nada. El jugador quedaba sin forma de salir de su propia búsqueda.
  testWidgets('offers a way to leave the queue while the group is still forming', (
    tester,
  ) async {
    when(() => repository.current()).thenAnswer((_) async => _waitingGroup());
    when(() => repository.cancel()).thenAnswer((_) async {});

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Salir de la cola'), findsOneWidget);

    await tester.tap(find.text('Salir de la cola'));
    await tester.pumpAndSettle();

    verify(() => repository.cancel()).called(1);
  });

  testWidgets('renders an open-match proposal with its explicit cup action', (
    tester,
  ) async {
    when(
      () => repository.current(),
    ).thenAnswer((_) async => _openMatchProposal());
    when(
      () => matches.getMatchDetail('match-1'),
    ).thenAnswer((_) async => _matchDetail());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Partida abierta con cupo'), findsOneWidget);
    expect(find.text('¡Partida encontrada!'), findsOneWidget);
    expect(find.text('Club Cuádrala · Cancha 2'), findsOneWidget);
    expect(find.text('US\$ 9.00 p/p'), findsOneWidget);
    expect(find.text('Confirmar cupo'), findsOneWidget);
    expect(find.text('Seguir buscando'), findsOneWidget);
  });

  testWidgets('refreshes the waiting screen periodically while it stays open', (
    tester,
  ) async {
    var callCount = 0;
    when(() => repository.current()).thenAnswer((_) async {
      callCount++;
      return callCount == 1 ? _searching() : _searching(noMatchYet: true);
    });

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Buscando jugadores'), findsOneWidget);
    expect(callCount, 1);

    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();

    expect(find.text('Seguimos buscando'), findsOneWidget);
    expect(callCount, greaterThanOrEqualTo(2));
  });

  testWidgets('cancels the polling timer when the waiting screen is removed', (
    tester,
  ) async {
    when(() => repository.current()).thenAnswer((_) async => _searching());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    // If the periodic timer isn't cancelled on dispose, flutter_test fails
    // this test with "A Timer is still pending" once it finishes.
    await tester.pumpWidget(const SizedBox());
    await tester.pumpAndSettle();
  });

  testWidgets('lets the player choose a sport and submits its category', (
    tester,
  ) async {
    when(() => repository.current()).thenAnswer((_) async => null);
    when(() => catalog.listSports()).thenAnswer(
      (_) async => const [
        SportDto(id: 'padel', code: 'PADEL', name: 'Pádel'),
        SportDto(id: 'tennis', code: 'TENNIS', name: 'Tenis'),
      ],
    );
    when(() => catalog.listCategories(sportId: 'padel')).thenAnswer(
      (_) async => const [
        CategoryDto(
          id: 'padel-7',
          sportId: 'padel',
          name: '7ma',
          slug: '7ma',
          scheme: 'ORDINAL',
          sortOrder: 1,
        ),
      ],
    );
    when(() => catalog.listCategories(sportId: 'tennis')).thenAnswer(
      (_) async => const [
        CategoryDto(
          id: 'tennis-6',
          sportId: 'tennis',
          name: '6ta',
          slug: '6ta',
          scheme: 'ORDINAL',
          sortOrder: 1,
        ),
      ],
    );
    when(() => repository.start(any())).thenAnswer((_) async => _searching());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Jugá hoy sin armar grupo'), findsNothing);
    expect(find.text('¿Cuándo quieres jugar?'), findsOneWidget);
    await tester.tap(find.text('Tenis'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('quick-match.configure.submit')));
    await tester.pumpAndSettle();

    final captured =
        verify(() => repository.start(captureAny())).captured.single
            as Map<String, Object?>;
    expect(captured['sportId'], 'tennis');
    expect(captured['categoryId'], 'tennis-6');
  });

  testWidgets('shows that the slot was freed, not a generic expiry, when an open-match hold expires', (
    tester,
  ) async {
    when(
      () => repository.current(),
    ).thenAnswer((_) async => _expired(proposalType: 'OPEN_MATCH'));

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Se liberó el cupo'), findsOneWidget);
    expect(find.text('La propuesta expiró'), findsNothing);
  });

  testWidgets('shows the generic expiry copy when a new-group proposal expires', (
    tester,
  ) async {
    when(
      () => repository.current(),
    ).thenAnswer((_) async => _expired(proposalType: 'NEW_GROUP'));

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('La propuesta expiró'), findsOneWidget);
    expect(find.text('Se liberó el cupo'), findsNothing);
  });

  testWidgets('shows the Bs secondary price once exchange rates are available', (
    tester,
  ) async {
    when(
      () => exchangeRates.listByCountry(countryCode: any(named: 'countryCode')),
    ).thenAnswer(
      (_) async => const [ExchangeRateRow(currency: 'USD', rateToBs: 50)],
    );
    when(
      () => repository.current(),
    ).thenAnswer((_) async => _openMatchProposal());
    when(
      () => matches.getMatchDetail('match-1'),
    ).thenAnswer((_) async => _matchDetail());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('US\$ 9.00 p/p'), findsOneWidget);
    expect(find.textContaining('Bs. 450.00'), findsOneWidget);
  });

  testWidgets('shows the shared ErrorState with a retry action on failure', (
    tester,
  ) async {
    when(
      () => repository.current(),
    ).thenAnswer((_) async => throw Exception('boom'));

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('No pudimos cargar tu búsqueda.'), findsOneWidget);
    expect(find.text('Reintentar'), findsOneWidget);
  });
}
