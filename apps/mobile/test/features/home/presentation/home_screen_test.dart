import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/cubit/home_cubit.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/cubit/home_state.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/home_screen.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/quick_match/presentation/cubit/quick_match_cubit.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/models/quick_match_search_dto.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/quick_match_api.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/quick_match_repository.dart';
import 'package:cuadrala_mobile/src/features/shell/presentation/cubit/shell_cubit.dart';
import 'package:cuadrala_mobile/src/shared/widgets/empty_state.dart';
import 'package:cuadrala_mobile/src/shared/widgets/skeleton_list.dart';
import 'package:cuadrala_mobile/src/shared/widgets/surface_tag.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockHomeCubit extends MockCubit<HomeState> implements HomeCubit {}

class _MockShellCubit extends MockCubit<int> implements ShellCubit {}

class _MockQuickMatchApi extends Mock implements QuickMatchApi {}

class _MockQuickMatchRepository extends Mock implements QuickMatchRepository {}

class _MockCatalogApi extends Mock implements CatalogApi {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

OpenMatchDto _makeOpenMatch({
  String id = 'match-1',
  String status = 'OPEN',
  DateTime? scheduledAt,
  String? surfaceType,
}) {
  return OpenMatchDto(
    id: id,
    sportId: 'sport-1',
    categoryId: 'cat-1',
    categoryName: 'Primera',
    status: status,
    scheduledAt: scheduledAt ?? DateTime(2030, 6, 1, 18, 0),
    pricePerPlayerCents: 1500,
    maxParticipants: 4,
    participantCount: 2,
    openSpots: 2,
    clubName: 'Club Test',
    courtName: 'Cancha 1',
    surfaceType: surfaceType,
    locationLabel: 'Buenos Aires',
  );
}

HomeLoaded _loadedState({
  List<OpenMatchDto> openMatches = const [],
  List<OpenMatchDto> myMatches = const [],
  bool myMatchesLoadFailed = false,
}) {
  return HomeLoaded(
    greetingName: 'Carlos',
    sportId: 'sport-1',
    openMatches: openMatches,
    myMatches: myMatches,
    myMatchesLoadFailed: myMatchesLoadFailed,
  );
}

Widget _wrap({required HomeCubit homeCubit, ShellCubit? shellCubit}) {
  final sc = shellCubit ?? _MockShellCubit();
  if (shellCubit == null) {
    when(() => (sc as _MockShellCubit).state).thenReturn(0);
  }
  return MaterialApp(
    theme: AppTheme.light(),
    darkTheme: AppTheme.dark(),
    themeMode: ThemeMode.light,
    home: MultiBlocProvider(
      providers: [
        BlocProvider<HomeCubit>.value(value: homeCubit),
        BlocProvider<ShellCubit>.value(value: sc),
      ],
      child: const HomeScreen(),
    ),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  late _MockHomeCubit homeCubit;
  late _MockShellCubit shellCubit;
  late QuickMatchCubit quickMatchCubit;
  late _MockCatalogApi catalogApi;

  setUp(() {
    homeCubit = _MockHomeCubit();
    shellCubit = _MockShellCubit();
    catalogApi = _MockCatalogApi();
    quickMatchCubit = QuickMatchCubit(
      repository: QuickMatchRepository(_MockQuickMatchApi()),
      catalogRepository: CatalogRepository(catalogApi: catalogApi),
    );
    when(() => shellCubit.state).thenReturn(0);
    when(() => catalogApi.listSportsEnvelope()).thenAnswer(
      (_) async => {
        'sports': [
          {'id': 'sport-1', 'code': 'PADEL', 'name': 'Pádel'},
        ],
      },
    );
    when(
      () => catalogApi.listCategoriesEnvelope(sportId: 'sport-1'),
    ).thenAnswer(
      (_) async => {
        'categories': [
          {
            'id': 'cat-1',
            'sportId': 'sport-1',
            'name': '7ma',
            'slug': '7ma',
            'scheme': 'ORDINAL',
            'sortOrder': 1,
          },
        ],
      },
    );
    getIt.registerFactory<QuickMatchCubit>(() => quickMatchCubit);
    // load() is called by initState — stub it so it doesn't throw
    when(() => homeCubit.load()).thenAnswer((_) async {});
  });

  tearDown(() {
    homeCubit.close();
    shellCubit.close();
    quickMatchCubit.close();
    getIt.unregister<QuickMatchCubit>();
  });

  // ── 1. Skeleton loading state ─────────────────────────────────────────────

  group('HomeLoading / HomeInitial shows skeleton', () {
    testWidgets(
      'HomeLoading renders SkeletonList, not CircularProgressIndicator',
      (tester) async {
        when(() => homeCubit.state).thenReturn(const HomeLoading());

        await tester.pumpWidget(
          _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
        );

        expect(find.byType(SkeletonList), findsOneWidget);
        expect(find.byType(CircularProgressIndicator), findsNothing);
      },
    );

    testWidgets(
      'HomeInitial renders SkeletonList, not CircularProgressIndicator',
      (tester) async {
        when(() => homeCubit.state).thenReturn(const HomeInitial());

        await tester.pumpWidget(
          _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
        );

        expect(find.byType(SkeletonList), findsOneWidget);
        expect(find.byType(CircularProgressIndicator), findsNothing);
      },
    );
  });

  // ── 2. HomeFailure — scaffold + retry button ───────────────────────────────

  group('HomeFailure', () {
    testWidgets('shows Scaffold with AppBar titled "Inicio" and retry button', (
      tester,
    ) async {
      when(
        () => homeCubit.state,
      ).thenReturn(const HomeFailure(message: 'Error de red'));

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );

      expect(find.text('Inicio'), findsOneWidget);
      expect(find.text('Error de red'), findsOneWidget);
      expect(find.text('Reintentar'), findsOneWidget);
    });

    testWidgets('retry button calls HomeCubit.load()', (tester) async {
      when(
        () => homeCubit.state,
      ).thenReturn(const HomeFailure(message: 'Error de red'));

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );

      await tester.tap(find.text('Reintentar'));
      await tester.pump();

      verify(() => homeCubit.load()).called(greaterThan(0));
    });
  });

  // ── 3. Mis partidas section ───────────────────────────────────────────────

  group('HomeLoaded — Mis partidas section', () {
    testWidgets('shows "Mis partidas" heading when myMatches is non-empty', (
      tester,
    ) async {
      when(
        () => homeCubit.state,
      ).thenReturn(_loadedState(myMatches: [_makeOpenMatch(id: 'my-1')]));

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('Mis partidas'), findsOneWidget);
    });

    testWidgets('shows compact CTA when myMatches is empty', (tester) async {
      when(() => homeCubit.state).thenReturn(_loadedState(myMatches: []));

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('No tenés partidas'), findsOneWidget);
    });

    testWidgets(
      'shows failure text instead of empty CTA when myMatchesLoadFailed is true',
      (tester) async {
        when(() => homeCubit.state).thenReturn(
          _loadedState(myMatches: [], myMatchesLoadFailed: true),
        );

        await tester.pumpWidget(
          _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
        );
        await tester.pumpAndSettle();

        expect(
          find.textContaining('No pudimos cargar tus partidas'),
          findsOneWidget,
        );
        expect(find.textContaining('No tenés partidas'), findsNothing);
      },
    );

    testWidgets('shows at most 2 items from myMatches', (tester) async {
      when(() => homeCubit.state).thenReturn(
        _loadedState(
          myMatches: [
            _makeOpenMatch(id: 'my-1'),
            _makeOpenMatch(id: 'my-2'),
            _makeOpenMatch(id: 'my-3'),
          ],
        ),
      );

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      // The section title should appear once
      expect(find.text('Mis partidas'), findsOneWidget);
      // "Ver todas" link should appear
      expect(find.text('Ver todas'), findsWidgets);
    });
  });

  // ── 4. Open matches — EmptyState ──────────────────────────────────────────

  group('HomeLoaded — open matches section', () {
    testWidgets('shows EmptyState widget when openMatches is empty', (
      tester,
    ) async {
      when(() => homeCubit.state).thenReturn(_loadedState(openMatches: []));

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.byType(EmptyState), findsOneWidget);
    });

    testWidgets('does NOT show EmptyState when openMatches is non-empty', (
      tester,
    ) async {
      when(
        () => homeCubit.state,
      ).thenReturn(_loadedState(openMatches: [_makeOpenMatch()]));

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.byType(EmptyState), findsNothing);
    });

    // Issue #126: el badge de superficie del handoff nunca llegaba a la
    // tarjeta — el dato no se pasaba de OpenMatchDto al MatchCard compartido.
    testWidgets('shows the surface tag when the match has one', (
      tester,
    ) async {
      when(() => homeCubit.state).thenReturn(
        _loadedState(
          openMatches: [_makeOpenMatch(surfaceType: 'Exterior')],
        ),
      );

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('Exterior'), findsOneWidget);
    });

    testWidgets('shows no surface tag when the match has none', (
      tester,
    ) async {
      when(
        () => homeCubit.state,
      ).thenReturn(_loadedState(openMatches: [_makeOpenMatch()]));

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.byType(SurfaceTag), findsNothing);
    });
  });

  // ── 5. Home handoff hero ──────────────────────────────────────────────────

  group('Home handoff hero', () {
    testWidgets('shows the recommended Quick Match hierarchy', (tester) async {
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('¿Jugamos hoy?'), findsOneWidget);
      expect(
        find.text('Encontramos jugadores según tu horario y nivel.'),
        findsOneWidget,
      );
      expect(find.text('Encontrar partida'), findsOneWidget);
      expect(find.text('Crear partida'), findsOneWidget);
      expect(find.text('Explorar partidas'), findsWidgets);
      expect(find.text('En vivo'), findsNothing);
    });
  });

  // ── 5b. Home section heading (issue #125) ─────────────────────────────────
  //
  // The handoff renders "Actividad cerca de ti" as the screen's main heading
  // right after the app header and before the matchmaking hero card. The
  // real screen had no heading widget there at all.
  group('Home section heading (#125)', () {
    testWidgets('shows "Actividad cerca de ti" heading when HomeLoaded', (
      tester,
    ) async {
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('Actividad cerca de ti'), findsOneWidget);
    });
  });

  // ── 5c. Hero card icon tile (issue #127) ──────────────────────────────────
  //
  // The handoff shows a 46x46 accent-colored icon tile with a bolt icon next
  // to the "¿Jugamos hoy?" title/subtitle. The real _HeroCard had no icon
  // tile there — only the "Encontrar partida" button used AppIcons.bolt.
  group('Hero card icon tile (#127)', () {
    testWidgets(
      'shows a bolt icon tile next to the "¿Jugamos hoy?" title',
      (tester) async {
        when(() => homeCubit.state).thenReturn(_loadedState());

        await tester.pumpWidget(
          _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
        );
        await tester.pumpAndSettle();

        // One bolt icon lives in the new title-adjacent tile, the other in
        // the "Encontrar partida" primary button (no active search yet).
        expect(find.byIcon(AppIcons.bolt), findsNWidgets(2));

        final tileFinder = find.ancestor(
          of: find.byIcon(AppIcons.bolt).first,
          matching: find.byWidgetPredicate(
            (widget) =>
                widget is Container &&
                widget.decoration is BoxDecoration &&
                (widget.decoration as BoxDecoration).borderRadius ==
                    BorderRadius.circular(13),
          ),
        );
        expect(tileFinder, findsOneWidget);
      },
    );
  });

  // ── 6. CTA hierarchy ──────────────────────────────────────────────────────

  group('CTA hierarchy fix', () {
    testWidgets(
      'opens the Quick Match configuration sheet from Encontrar partida',
      (tester) async {
        when(() => homeCubit.state).thenReturn(_loadedState());

        await tester.pumpWidget(
          _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
        );
        await tester.pumpAndSettle();

        await tester.tap(find.text('Encontrar partida'));
        await tester.pumpAndSettle();

        expect(find.text('¿Cuándo quieres jugar?'), findsOneWidget);
        expect(find.text('Hoy'), findsOneWidget);
        expect(find.text('Mañana'), findsWidgets);
        expect(find.text('Elegir fecha'), findsOneWidget);
        expect(find.text('Entrar a la cola'), findsOneWidget);
      },
    );

    testWidgets('"Encontrar partida" primary button is present', (
      tester,
    ) async {
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('Encontrar partida'), findsOneWidget);
    });

    testWidgets('"Crear partida" secondary button is present', (tester) async {
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('Crear partida'), findsOneWidget);
    });

    testWidgets('"Nuevo Torneo" CTA is absent', (tester) async {
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('Nuevo Torneo'), findsNothing);
    });
  });

  // ── 7. Handoff title ──────────────────────────────────────────────────────

  group('Handoff title', () {
    testWidgets('replaces "Actividad en Cuádrala" with the Quick Match hero', (
      tester,
    ) async {
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('Actividad en Cuádrala'), findsNothing);
      expect(find.text('¿Jugamos hoy?'), findsOneWidget);
    });
  });

  // ── 8. Quick Match home banner — CONFIRMED visibility (issue #122) ────────
  //
  // `status == 'CONFIRMED'` means two different things: "I confirmed my own
  // slot, the group is still forming" (no match yet) and "the group is
  // complete, a match was created". The banner used to hide both the same
  // way, so a player who confirmed their slot lost the only way back into
  // the group-forming screen. It should only disappear once a match exists.
  group('Quick Match home banner — CONFIRMED visibility (#122)', () {
    late _MockQuickMatchRepository quickMatchRepository;

    QuickMatchSearchDto confirmedSearch({String? matchId}) =>
        QuickMatchSearchDto(
          id: 'search-1',
          sportId: 'sport-1',
          categoryId: 'category-1',
          status: 'CONFIRMED',
          noMatchYet: matchId == null,
          slots: const ['EVENING'],
          targetDate: DateTime(2030, 6, 1),
          widenLevel: false,
          zoneKm: 5,
          includeOpenMatches: true,
          proposal: QuickMatchProposalDto(
            id: 'group-1',
            type: 'NEW_GROUP',
            status: 'CONFIRMED',
            matchId: matchId,
            playerIds: const ['player-1'],
            expiresAt: DateTime.now().add(const Duration(minutes: 2)),
          ),
        );

    setUp(() {
      quickMatchRepository = _MockQuickMatchRepository();
      when(() => quickMatchRepository.changes)
          .thenAnswer((_) => const Stream<void>.empty());
      getIt.registerSingleton<QuickMatchRepository>(quickMatchRepository);
    });

    tearDown(() => getIt.unregister<QuickMatchRepository>());

    testWidgets(
      'keeps showing the active-search callout while the group is still forming',
      (tester) async {
        when(() => quickMatchRepository.current())
            .thenAnswer((_) async => confirmedSearch());
        when(() => homeCubit.state).thenReturn(_loadedState());

        await tester.pumpWidget(
          _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
        );
        await tester.pumpAndSettle();

        expect(find.text('Tu búsqueda está activa'), findsOneWidget);
      },
    );

    testWidgets(
      'hides the callout once the group is complete and a match exists',
      (tester) async {
        when(() => quickMatchRepository.current())
            .thenAnswer((_) async => confirmedSearch(matchId: 'match-1'));
        when(() => homeCubit.state).thenReturn(_loadedState());

        await tester.pumpWidget(
          _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
        );
        await tester.pumpAndSettle();

        expect(find.text('Tu búsqueda está activa'), findsNothing);
        expect(find.text('Encontrar partida'), findsOneWidget);
      },
    );

    //? Bug: al salir de la cola y volver con go(home), el inicio seguía
    //? montado y mostraba la búsqueda vieja como "activa" indefinidamente.
    testWidgets(
      'should hide the callout when the search changes after leaving the queue',
      (tester) async {
        final changes = StreamController<void>.broadcast();
        addTearDown(changes.close);
        when(() => quickMatchRepository.changes)
            .thenAnswer((_) => changes.stream);
        when(() => quickMatchRepository.current())
            .thenAnswer((_) async => confirmedSearch());
        when(() => homeCubit.state).thenReturn(_loadedState());

        await tester.pumpWidget(
          _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
        );
        await tester.pumpAndSettle();
        expect(find.text('Tu búsqueda está activa'), findsOneWidget);

        when(() => quickMatchRepository.current())
            .thenAnswer((_) async => null);
        changes.add(null);
        await tester.pumpAndSettle();

        expect(find.text('Tu búsqueda está activa'), findsNothing);
      },
    );
  });

  // ── 9. Quick Match home banner — ready check sin push (S11) ───────────────
  //
  // En la PC no llegaba la notificación para aceptar: el banner solo se
  // actualizaba al cambiar la búsqueda desde este mismo dispositivo. Ahora
  // consulta periódicamente mientras hay una búsqueda activa.
  group('Quick Match home banner — polling (S11)', () {
    late _MockQuickMatchRepository quickMatchRepository;

    QuickMatchSearchDto search({
      required String status,
      String? proposalType,
      String proposalStatus = 'PENDING',
      List<String> playerIds = const ['p1', 'p2', 'p3', 'p4'],
      bool invitedByAvailability = false,
    }) => QuickMatchSearchDto(
      id: 'search-1',
      sportId: 'sport-1',
      categoryId: 'category-1',
      status: status,
      invitedByAvailability: invitedByAvailability,
      noMatchYet: false,
      slots: const ['EVENING'],
      targetDate: DateTime(2030, 6, 1),
      widenLevel: false,
      zoneKm: 5,
      includeOpenMatches: true,
      proposal: proposalType == null
          ? null
          : QuickMatchProposalDto(
              id: 'group-1',
              type: proposalType,
              status: proposalStatus,
              matchId: null,
              playerIds: playerIds,
              expiresAt: DateTime.now().add(const Duration(minutes: 2)),
            ),
    );

    //? S1: el lobby muestra cuántos jugadores ya están.
    testWidgets('should show the lobby size in the banner', (tester) async {
      when(() => quickMatchRepository.current()).thenAnswer(
        (_) async => search(
          status: 'SEARCHING',
          proposalType: 'NEW_GROUP',
          proposalStatus: 'LOBBY',
          playerIds: const ['p1', 'p2'],
        ),
      );
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('Grupo armándose (2 de 4)'), findsOneWidget);
      expect(find.text('Tu búsqueda está activa'), findsNothing);
    });

    //? S12: una invitación no es un ready check: no dice "Partida encontrada".
    testWidgets('should show an availability invitation in the banner', (
      tester,
    ) async {
      when(() => quickMatchRepository.current()).thenAnswer(
        (_) async => search(
          status: 'PROPOSAL',
          proposalType: 'NEW_GROUP',
          playerIds: const ['p1', 'p2'],
          invitedByAvailability: true,
        ),
      );
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('Te invitaron a un grupo'), findsOneWidget);
      expect(find.text('¡Partida encontrada!'), findsNothing);
    });

    //? Ready check con un lugar libre (alguien no aceptó): sigue siendo
    //? "Partida encontrada", no una invitación.
    testWidgets(
      'should keep the ready-check banner when the group lost a member',
      (tester) async {
        when(() => quickMatchRepository.current()).thenAnswer(
          (_) async => search(
            status: 'PROPOSAL',
            proposalType: 'NEW_GROUP',
            playerIds: const ['p1', 'p2', 'p3'],
          ),
        );
        when(() => homeCubit.state).thenReturn(_loadedState());

        await tester.pumpWidget(
          _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
        );
        await tester.pumpAndSettle();

        expect(find.text('¡Partida encontrada!'), findsOneWidget);
        expect(find.text('Te invitaron a un grupo'), findsNothing);
      },
    );

    setUp(() {
      quickMatchRepository = _MockQuickMatchRepository();
      when(
        () => quickMatchRepository.changes,
      ).thenAnswer((_) => const Stream<void>.empty());
      getIt.registerSingleton<QuickMatchRepository>(quickMatchRepository);
    });

    tearDown(() => getIt.unregister<QuickMatchRepository>());

    testWidgets('should show a found match when a ready check is pending', (
      tester,
    ) async {
      when(() => quickMatchRepository.current()).thenAnswer(
        (_) async => search(status: 'PROPOSAL', proposalType: 'NEW_GROUP'),
      );
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('¡Partida encontrada!'), findsOneWidget);
    });

    testWidgets('should pick up a ready check by polling an active search', (
      tester,
    ) async {
      var found = false;
      when(() => quickMatchRepository.current()).thenAnswer(
        (_) async => found
            ? search(status: 'PROPOSAL', proposalType: 'NEW_GROUP')
            : search(status: 'SEARCHING'),
      );
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();
      expect(find.text('Tu búsqueda está activa'), findsOneWidget);

      found = true;
      await tester.pump(const Duration(seconds: 15));
      await tester.pumpAndSettle();

      expect(find.text('¡Partida encontrada!'), findsOneWidget);
    });

    testWidgets('should not poll when there is no active search', (
      tester,
    ) async {
      when(() => quickMatchRepository.current()).thenAnswer((_) async => null);
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 30));
      await tester.pumpAndSettle();

      verify(() => quickMatchRepository.current()).called(1);
    });

    //? S5: EXPIRED significa que el jugador ya salió de la cola.
    testWidgets('should not show an expired search as active', (tester) async {
      when(() => quickMatchRepository.current()).thenAnswer(
        (_) async => search(
          status: 'EXPIRED',
          proposalType: 'NEW_GROUP',
          proposalStatus: 'EXPIRED',
        ),
      );
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(
        _wrap(homeCubit: homeCubit, shellCubit: shellCubit),
      );
      await tester.pumpAndSettle();

      expect(find.text('Tu búsqueda está activa'), findsNothing);
      expect(find.text('Encontrar partida'), findsOneWidget);
    });
  });
}
