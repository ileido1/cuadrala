import 'dart:async';

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
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

class _MockQuickMatchRepository extends Mock implements QuickMatchRepository {}

class _MockCatalogRepository extends Mock implements CatalogRepository {}

class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

class _MockMatchesRepository extends Mock implements MatchesRepository {}

QuickMatchSearchDto _searching({bool noMatchYet = false}) =>
    QuickMatchSearchDto(
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

Widget _wrap(QuickMatchCubit cubit) {
  final router = GoRouter(
    initialLocation: '/quick-match',
    routes: [
      GoRoute(
        path: '/quick-match',
        builder: (_, _) => BlocProvider<QuickMatchCubit>.value(
          value: cubit,
          child: const QuickMatchScreen(),
        ),
      ),
      GoRoute(
        path: '/home',
        builder: (_, _) => const Scaffold(body: Text('home.stub')),
      ),
    ],
  );
  return MaterialApp.router(theme: AppTheme.dark(), routerConfig: router);
}

QuickMatchSearchDto _waitingGroup() => QuickMatchSearchDto(
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
    id: 'group-1',
    type: 'NEW_GROUP',
    status: 'CONFIRMED',
    matchId: null,
    playerIds: const ['player-1'],
    expiresAt: DateTime.now().add(const Duration(minutes: 2)),
  ),
);

//? Ready check NEW_GROUP: el grupo siempre nace con 4 jugadores (S1) y
//? `acceptedCount` cuenta solo los que aceptaron de verdad (S7).
QuickMatchSearchDto _readyCheck({
  int acceptedCount = 0,
  String status = 'PROPOSAL',
  String proposalStatus = 'PENDING',
  String? matchId,
  DateTime? expiresAt,
  List<String> playerIds = const [
    'player-1',
    'player-2',
    'player-3',
    'player-4',
  ],
}) => QuickMatchSearchDto(
  id: 'search-1',
  sportId: 'sport-1',
  categoryId: 'category-1',
  status: status,
  noMatchYet: false,
  slots: const ['EVENING'],
  targetDate: DateTime(2030, 6, 1),
  widenLevel: false,
  zoneKm: 5,
  includeOpenMatches: true,
  acceptedCount: acceptedCount,
  proposal: QuickMatchProposalDto(
    id: 'group-1',
    type: 'NEW_GROUP',
    status: proposalStatus,
    matchId: matchId,
    playerIds: playerIds,
    venueOptions: [
      QuickMatchVenueOptionDto(
        id: 'option-1',
        venueId: 'venue-1',
        venueName: 'Club Las Mercedes',
        courtId: 'court-1',
        courtName: 'Cancha 1',
        scheduledAt: DateTime(2030, 6, 1, 20),
        pricePerPlayerCents: 900,
      ),
    ],
    expiresAt: expiresAt ?? DateTime.now().add(const Duration(minutes: 2)),
  ),
);

//? S1: lobby que se llena de a uno. El miembro sigue SEARCHING y la
//? propuesta LOBBY lista a los jugadores que ya están (2–3).
QuickMatchSearchDto _lobby({
  List<String> playerIds = const ['player-1', 'player-2'],
}) => QuickMatchSearchDto(
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
  proposal: QuickMatchProposalDto(
    id: 'group-1',
    type: 'NEW_GROUP',
    status: 'LOBBY',
    matchId: null,
    playerIds: playerIds,
    expiresAt: DateTime.now().add(const Duration(minutes: 2)),
  ),
);

//? S12: invitación por disponibilidad. Se distingue del ready check por
//? `invitedByAvailability`, no por la cantidad de jugadores.
QuickMatchSearchDto _invitation({DateTime? expiresAt}) => QuickMatchSearchDto(
  id: 'search-1',
  sportId: 'sport-1',
  categoryId: 'category-1',
  status: 'PROPOSAL',
  invitedByAvailability: true,
  noMatchYet: false,
  slots: const ['EVENING'],
  targetDate: DateTime(2030, 6, 1),
  widenLevel: false,
  zoneKm: 5,
  includeOpenMatches: true,
  proposal: QuickMatchProposalDto(
    id: 'group-1',
    type: 'NEW_GROUP',
    status: 'PENDING',
    matchId: null,
    playerIds: const ['player-1', 'player-2'],
    expiresAt: expiresAt ?? DateTime.now().add(const Duration(minutes: 2)),
  ),
);

QuickMatchSearchDto _cancelled() => QuickMatchSearchDto(
  id: 'search-1',
  sportId: 'sport-1',
  categoryId: 'category-1',
  status: 'CANCELLED',
  noMatchYet: false,
  slots: const ['EVENING'],
  targetDate: DateTime(2030, 6, 1),
  widenLevel: false,
  zoneKm: 5,
  includeOpenMatches: true,
  proposal: null,
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
    //? Una sola pantalla de espera: solo, el grupo arranca en 1 de 4.
    expect(find.text('1 de 4 jugadores'), findsOneWidget);
    expect(find.text('Revisando partidas abiertas'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Cambiar horario'), 200);
    expect(find.text('Cambiar horario'), findsOneWidget);
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

  //? S10: tras aceptar, la pantalla espera a los demás y muestra cuántos
  //? aceptaron según `acceptedCount` (antes leía `playerIds.length` con un
  //? `?? 4` por defecto y decía "jugadores confirmados" sin serlo).
  testWidgets(
    'should show the real accepted count while waiting for the others',
    (tester) async {
      when(() => repository.current()).thenAnswer(
        (_) async => _readyCheck(
          status: 'CONFIRMED',
          proposalStatus: 'CONFIRMED',
          acceptedCount: 2,
        ),
      );

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      expect(find.text('Esperando a los demás jugadores'), findsOneWidget);
      expect(find.text('2 de 4 aceptaron'), findsOneWidget);
      expect(find.textContaining('jugadores confirmados'), findsNothing);
    },
  );

  // Issue #121: antes de este fix, la única acción disponible mientras el
  // grupo se forma era "Volver al inicio" — navegación pura, no cancelaba
  // nada. El jugador quedaba sin forma de salir de su propia búsqueda.
  testWidgets(
    'offers a way to leave the queue while the group is still forming',
    (tester) async {
      when(() => repository.current()).thenAnswer((_) async => _waitingGroup());
      when(() => repository.cancel()).thenAnswer((_) async {});

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      expect(find.text('Salir de la cola'), findsOneWidget);

      await tester.tap(find.text('Salir de la cola'));
      await tester.pumpAndSettle();

      verify(() => repository.cancel()).called(1);
      // Bug reportado en vivo: cancelar SÍ llamaba al repo, pero la pantalla
      // se quedaba mostrando el flujo de quick-match (que, sin búsqueda
      // activa, cae en el formulario para crear una cola nueva) en vez de
      // volver al inicio.
      expect(find.text('home.stub'), findsOneWidget);
      expect(find.byType(BottomSheet), findsNothing);
    },
  );

  testWidgets(
    'leaving the queue while actively searching cancels and goes home',
    (tester) async {
      when(() => repository.current()).thenAnswer((_) async => _searching());
      when(() => repository.cancel()).thenAnswer((_) async {});

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Salir de la cola'));
      await tester.pumpAndSettle();

      verify(() => repository.cancel()).called(1);
      expect(find.text('home.stub'), findsOneWidget);
    },
  );

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

    //? Antes "Seguimos buscando" era otra pantalla; ahora es la misma.
    expect(find.text('Buscando jugadores'), findsOneWidget);
    expect(find.text('Seguimos buscando'), findsNothing);
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

    //? S9: la pantalla ya no abre la hoja sola; se abre con el botón.
    await tester.tap(find.byKey(const Key('quick-match.idle.start')));
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

  testWidgets(
    'shows that the slot was freed, not a generic expiry, when an open-match hold expires',
    (tester) async {
      when(
        () => repository.current(),
      ).thenAnswer((_) async => _expired(proposalType: 'OPEN_MATCH'));

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      expect(find.text('Se liberó el cupo'), findsOneWidget);
      expect(find.text('La propuesta expiró'), findsNothing);
    },
  );

  testWidgets(
    'shows the generic expiry copy when a new-group proposal expires',
    (tester) async {
      when(
        () => repository.current(),
      ).thenAnswer((_) async => _expired(proposalType: 'NEW_GROUP'));

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      expect(find.text('La propuesta expiró'), findsOneWidget);
      expect(find.text('Se liberó el cupo'), findsNothing);
    },
  );

  //? L7: quien no aceptó a tiempo ya salió de la cola. "Volver al inicio"
  //? solo navega: cancelar una búsqueda que ya terminó no tiene sentido.
  testWidgets(
    'should go home without cancelling after a ready check timed out',
    (tester) async {
      when(
        () => repository.current(),
      ).thenAnswer((_) async => _expired(proposalType: 'NEW_GROUP'));

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      expect(find.text('Volver a buscar'), findsOneWidget);
      expect(find.text('Salir de la cola'), findsNothing);
      expect(find.text('Seguir buscando'), findsNothing);

      await tester.tap(find.text('Volver al inicio'));
      await tester.pumpAndSettle();

      verifyNever(() => repository.cancel());
      expect(find.text('home.stub'), findsOneWidget);
    },
  );

  testWidgets(
    'should open the configuration to search again after a ready check timed out',
    (tester) async {
      when(
        () => repository.current(),
      ).thenAnswer((_) async => _expired(proposalType: 'NEW_GROUP'));
      when(() => catalog.listSports()).thenAnswer(
        (_) async => const [
          SportDto(id: 'padel', code: 'PADEL', name: 'Pádel'),
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

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Volver a buscar'));
      await tester.pumpAndSettle();

      expect(find.text('¿Cuándo quieres jugar?'), findsOneWidget);
      verifyNever(() => repository.cancel());
    },
  );

  //? S8: la expiración de OPEN_MATCH conserva sus acciones.
  testWidgets('should keep the open-match expiry actions', (tester) async {
    when(
      () => repository.current(),
    ).thenAnswer((_) async => _expired(proposalType: 'OPEN_MATCH'));

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Seguir buscando'), findsOneWidget);
    expect(find.text('Salir de la cola'), findsOneWidget);
    expect(find.text('Volver a buscar'), findsNothing);
  });

  testWidgets(
    'shows the Bs secondary price once exchange rates are available',
    (tester) async {
      when(
        () =>
            exchangeRates.listByCountry(countryCode: any(named: 'countryCode')),
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
    },
  );

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

  // ── S9: salir de la cola ─────────────────────────────────────────────────

  //? En la app, /quick-match se abre con push encima del inicio. Al salir,
  //? cancel() emitía Idle y la pantalla abría "¿Cuándo quieres jugar?" sola
  //? mientras navegaba al inicio: la hoja quedaba encima del inicio.
  testWidgets(
    'should land on home without opening the configuration sheet when leaving a pushed queue',
    (tester) async {
      when(() => repository.current()).thenAnswer((_) async => _searching());
      when(() => repository.cancel()).thenAnswer((_) async {});
      when(() => catalog.listSports()).thenAnswer(
        (_) async => const [
          SportDto(id: 'padel', code: 'PADEL', name: 'Pádel'),
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
      final router = GoRouter(
        initialLocation: '/home',
        routes: [
          GoRoute(
            path: '/home',
            builder: (_, _) => const Scaffold(body: Text('home.stub')),
          ),
          GoRoute(
            path: '/quick-match',
            builder: (_, _) => BlocProvider<QuickMatchCubit>.value(
              value: cubit,
              child: const QuickMatchScreen(),
            ),
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        MaterialApp.router(theme: AppTheme.dark(), routerConfig: router),
      );
      unawaited(router.push('/quick-match'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Salir de la cola'));
      await tester.pumpAndSettle();

      expect(find.text('home.stub'), findsOneWidget);
      expect(find.text('¿Cuándo quieres jugar?'), findsNothing);
      expect(find.byType(BottomSheet), findsNothing);
    },
  );

  testWidgets(
    'should show a start button instead of opening the sheet when there is no search',
    (tester) async {
      when(() => repository.current()).thenAnswer((_) async => null);

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      expect(find.byType(BottomSheet), findsNothing);
      expect(find.byKey(const Key('quick-match.idle.start')), findsOneWidget);
    },
  );

  // ── S10: ready check NEW_GROUP ───────────────────────────────────────────

  testWidgets(
    'should show the ready check with the real accepted count and no venue picker',
    (tester) async {
      when(
        () => repository.current(),
      ).thenAnswer((_) async => _readyCheck(acceptedCount: 1));

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      expect(find.text('¡Partida encontrada!'), findsOneWidget);
      expect(find.text('1 de 4 aceptaron'), findsOneWidget);
      expect(find.text('Aceptar'), findsOneWidget);
      expect(find.text('Rechazar'), findsOneWidget);
      expect(find.text('¡Encontramos jugadores!'), findsNothing);
      expect(find.textContaining('quieren jugar'), findsNothing);
      expect(find.text('Elegí sede y horario'), findsNothing);
      expect(find.text('Club Las Mercedes'), findsNothing);
    },
  );

  testWidgets('should count down to the ready check deadline', (tester) async {
    var now = DateTime(2030, 6, 1, 18);
    await withClock(Clock(() => now), () async {
      when(() => repository.current()).thenAnswer(
        (_) async =>
            _readyCheck(expiresAt: now.add(const Duration(minutes: 2))),
      );

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();
      expect(find.textContaining('2:00'), findsOneWidget);

      now = now.add(const Duration(seconds: 30));
      await tester.pump(const Duration(seconds: 1));

      expect(find.textContaining('1:30'), findsOneWidget);
    });
  });

  testWidgets('should accept without a venue and then wait for the others', (
    tester,
  ) async {
    when(
      () => repository.current(),
    ).thenAnswer((_) async => _readyCheck(acceptedCount: 1));
    when(() => repository.confirmProposal()).thenAnswer(
      (_) async => _readyCheck(
        status: 'CONFIRMED',
        proposalStatus: 'CONFIRMED',
        acceptedCount: 2,
      ),
    );

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Aceptar'));
    await tester.pumpAndSettle();

    verify(() => repository.confirmProposal()).called(1);
    expect(find.text('Esperando a los demás jugadores'), findsOneWidget);
    expect(find.text('2 de 4 aceptaron'), findsOneWidget);
  });

  //? S5/L7: rechazar saca al jugador de la cola (búsqueda CANCELLED). La
  //? pantalla lo dice y ofrece volver a buscar o volver al inicio, sin
  //? volver a cancelar una búsqueda que ya terminó.
  testWidgets('should offer to search again or go home after declining', (
    tester,
  ) async {
    when(() => repository.current()).thenAnswer((_) async => _readyCheck());
    when(
      () => repository.dismissProposal(),
    ).thenAnswer((_) async => _cancelled());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Rechazar'));
    await tester.pumpAndSettle();

    verify(() => repository.dismissProposal()).called(1);
    expect(find.text('Rechazaste la partida'), findsOneWidget);
    expect(find.text('Volver a buscar'), findsOneWidget);
    expect(find.byType(BottomSheet), findsNothing);

    await tester.tap(find.text('Volver al inicio'));
    await tester.pumpAndSettle();

    verifyNever(() => repository.cancel());
    expect(find.text('home.stub'), findsOneWidget);
  });

  //? L7: si alguien no acepta, el grupo no se disuelve: se busca un
  //? reemplazo y quien aceptó sigue esperando, con el conteo real.
  testWidgets(
    'should say a replacement is being searched while the group has an open slot',
    (tester) async {
      String? matchId;
      when(() => repository.current()).thenAnswer(
        (_) async => matchId == null
            ? _readyCheck(
                status: 'CONFIRMED',
                proposalStatus: 'CONFIRMED',
                acceptedCount: 2,
                playerIds: const ['player-1', 'player-2', 'player-3'],
              )
            : _readyCheck(
                status: 'CONFIRMED',
                proposalStatus: 'CONFIRMED',
                acceptedCount: 4,
                matchId: matchId,
              ),
      );

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      expect(find.text('Buscando un jugador más'), findsOneWidget);
      expect(find.text('2 de 4 aceptaron'), findsOneWidget);
      expect(find.text('Tiempo para que acepten'), findsNothing);

      matchId = 'match-9';
      await tester.pump(const Duration(seconds: 3));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('quick-match.open-match')), findsOneWidget);
    },
  );

  testWidgets('should show the match once the group is complete', (
    tester,
  ) async {
    when(() => repository.current()).thenAnswer(
      (_) async => _readyCheck(
        status: 'CONFIRMED',
        proposalStatus: 'CONFIRMED',
        acceptedCount: 4,
        matchId: 'match-9',
      ),
    );

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('quick-match.open-match')), findsOneWidget);
    expect(find.text('Salir de la cola'), findsNothing);
  });

  // ── S11: polling sin push ────────────────────────────────────────────────

  testWidgets('should refresh the ready check while it stays open', (
    tester,
  ) async {
    var accepted = 1;
    when(
      () => repository.current(),
    ).thenAnswer((_) async => _readyCheck(acceptedCount: accepted));

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();
    expect(find.text('1 de 4 aceptaron'), findsOneWidget);

    accepted = 3;
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();

    expect(find.text('3 de 4 aceptaron'), findsOneWidget);
  });

  testWidgets(
    'should show the match when polling finds it while waiting for the others',
    (tester) async {
      String? matchId;
      when(() => repository.current()).thenAnswer(
        (_) async => _readyCheck(
          status: 'CONFIRMED',
          proposalStatus: 'CONFIRMED',
          acceptedCount: matchId == null ? 2 : 4,
          matchId: matchId,
        ),
      );

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();
      expect(find.text('Esperando a los demás jugadores'), findsOneWidget);

      matchId = 'match-9';
      await tester.pump(const Duration(seconds: 3));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('quick-match.open-match')), findsOneWidget);
    },
  );

  testWidgets('cancels the ready-check polling when the screen is removed', (
    tester,
  ) async {
    when(() => repository.current()).thenAnswer((_) async => _readyCheck());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    await tester.pumpWidget(const SizedBox());
    await tester.pumpAndSettle();
  });

  // ── S8: OPEN_MATCH sin cambios ───────────────────────────────────────────

  testWidgets('should confirm an open-match slot with its own button', (
    tester,
  ) async {
    when(
      () => repository.current(),
    ).thenAnswer((_) async => _openMatchProposal());
    when(
      () => matches.getMatchDetail('match-1'),
    ).thenAnswer((_) async => _matchDetail());
    when(() => repository.confirmProposal()).thenAnswer(
      (_) async => QuickMatchSearchDto(
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
          expiresAt: DateTime.now().add(const Duration(minutes: 2)),
        ),
      ),
    );

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirmar cupo'));
    await tester.pumpAndSettle();

    verify(() => repository.confirmProposal()).called(1);
    expect(find.text('¡Cupo confirmado!'), findsOneWidget);
  });

  // ── S1: lobby ────────────────────────────────────────────────────────────

  testWidgets('should show the lobby with how many players joined', (
    tester,
  ) async {
    when(() => repository.current()).thenAnswer((_) async => _lobby());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Grupo armándose'), findsOneWidget);
    expect(find.text('2 de 4 jugadores'), findsOneWidget);
    expect(find.text('Salir de la cola'), findsOneWidget);
    expect(find.text('Buscando jugadores'), findsNothing);
    //? Mismo diseño que la búsqueda en solitario (antes era otra pantalla),
    //? sin opciones que sacarían al jugador del grupo.
    expect(find.text('Revisando partidas abiertas'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Ver partidas abiertas'), 200);
    expect(find.text('Ver partidas abiertas'), findsOneWidget);
    expect(find.text('Cambiar horario'), findsNothing);
    expect(find.text('Editar preferencias'), findsNothing);
  });

  testWidgets('should show new lobby members by polling', (tester) async {
    var players = const ['player-1', 'player-2'];
    when(
      () => repository.current(),
    ).thenAnswer((_) async => _lobby(playerIds: players));

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    players = const ['player-1', 'player-2', 'player-3'];
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();

    expect(find.text('3 de 4 jugadores'), findsOneWidget);
  });

  testWidgets('should leave the lobby and land on home', (tester) async {
    when(() => repository.current()).thenAnswer((_) async => _lobby());
    when(() => repository.cancel()).thenAnswer((_) async {});

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Salir de la cola'));
    await tester.pumpAndSettle();

    verify(() => repository.cancel()).called(1);
    expect(find.text('home.stub'), findsOneWidget);
    expect(find.byType(BottomSheet), findsNothing);
  });

  // ── S12: invitación por disponibilidad ───────────────────────────────────

  testWidgets(
    'should show an availability invitation without ready-check copy',
    (tester) async {
      var now = DateTime(2030, 6, 1, 18);
      await withClock(Clock(() => now), () async {
        when(() => repository.current()).thenAnswer(
          (_) async =>
              _invitation(expiresAt: now.add(const Duration(minutes: 2))),
        );

        await tester.pumpWidget(_wrap(cubit));
        await tester.pumpAndSettle();

        expect(
          find.text('Hay un grupo armándose a tu horario'),
          findsOneWidget,
        );
        expect(find.text('2 de 4 jugadores'), findsOneWidget);
        expect(find.textContaining('2:00'), findsOneWidget);
        expect(find.text('Sumarme'), findsOneWidget);
        expect(find.text('No, gracias'), findsOneWidget);
        expect(find.text('¡Partida encontrada!'), findsNothing);
        expect(find.text('Aceptar'), findsNothing);

        now = now.add(const Duration(seconds: 30));
        await tester.pump(const Duration(seconds: 1));
        expect(find.textContaining('1:30'), findsOneWidget);
      });
    },
  );

  //? Un miembro del ready check cuyo grupo perdió a alguien sigue PENDING con
  //? 3 jugadores: no es una invitación y no debe ver "Sumarme".
  testWidgets(
    'should show the ready check, not an invitation, when a group lost a member',
    (tester) async {
      when(() => repository.current()).thenAnswer(
        (_) async => _readyCheck(
          playerIds: const ['player-1', 'player-2', 'player-3'],
        ),
      );

      await tester.pumpWidget(_wrap(cubit));
      await tester.pumpAndSettle();

      expect(find.text('¡Partida encontrada!'), findsOneWidget);
      expect(find.text('Sumarme'), findsNothing);
    },
  );

  testWidgets('should join the lobby when accepting an invitation', (
    tester,
  ) async {
    when(() => repository.current()).thenAnswer((_) async => _invitation());
    when(
      () => repository.confirmProposal(),
    ).thenAnswer((_) async => _lobby(playerIds: const ['a', 'b', 'c']));

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sumarme'));
    await tester.pumpAndSettle();

    verify(() => repository.confirmProposal()).called(1);
    expect(find.text('Grupo armándose'), findsOneWidget);
    expect(find.text('3 de 4 jugadores'), findsOneWidget);
  });

  testWidgets('should offer to search again after declining an invitation', (
    tester,
  ) async {
    when(() => repository.current()).thenAnswer((_) async => _invitation());
    when(
      () => repository.dismissProposal(),
    ).thenAnswer((_) async => _cancelled());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();
    await tester.tap(find.text('No, gracias'));
    await tester.pumpAndSettle();

    verify(() => repository.dismissProposal()).called(1);
    expect(find.text('Volver a buscar'), findsOneWidget);
    expect(find.text('Volver al inicio'), findsOneWidget);
  });
}
