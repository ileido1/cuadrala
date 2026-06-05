import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/cubit/home_cubit.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/cubit/home_state.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/home_screen.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/shell/presentation/cubit/shell_cubit.dart';
import 'package:cuadrala_mobile/src/shared/widgets/empty_state.dart';
import 'package:cuadrala_mobile/src/shared/widgets/skeleton_list.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockHomeCubit extends MockCubit<HomeState> implements HomeCubit {}

class _MockShellCubit extends MockCubit<int> implements ShellCubit {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

OpenMatchDto _makeOpenMatch({
  String id = 'match-1',
  String status = 'OPEN',
  DateTime? scheduledAt,
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
    locationLabel: 'Buenos Aires',
  );
}

/// Creates a match that starts within 30 minutes from `now`.
OpenMatchDto _makeLiveMatch({String id = 'live-1', String status = 'SCHEDULED'}) {
  return _makeOpenMatch(
    id: id,
    status: status,
    scheduledAt: DateTime.now().add(const Duration(minutes: 10)),
  );
}

/// Creates a match scheduled far in the future (not live).
OpenMatchDto _makeFutureMatch({String id = 'future-1'}) {
  return _makeOpenMatch(
    id: id,
    status: 'SCHEDULED',
    scheduledAt: DateTime.now().add(const Duration(hours: 3)),
  );
}

HomeLoaded _loadedState({
  List<OpenMatchDto> openMatches = const [],
  List<OpenMatchDto> myMatches = const [],
}) {
  return HomeLoaded(
    greetingName: 'Carlos',
    sportId: 'sport-1',
    openMatches: openMatches,
    myMatches: myMatches,
  );
}

Widget _wrap({
  required HomeCubit homeCubit,
  ShellCubit? shellCubit,
}) {
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

  setUp(() {
    homeCubit = _MockHomeCubit();
    shellCubit = _MockShellCubit();
    when(() => shellCubit.state).thenReturn(0);
    // load() is called by initState — stub it so it doesn't throw
    when(() => homeCubit.load()).thenAnswer((_) async {});
  });

  tearDown(() {
    homeCubit.close();
    shellCubit.close();
  });

  // ── 1. Skeleton loading state ─────────────────────────────────────────────

  group('HomeLoading / HomeInitial shows skeleton', () {
    testWidgets('HomeLoading renders SkeletonList, not CircularProgressIndicator', (tester) async {
      when(() => homeCubit.state).thenReturn(const HomeLoading());

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));

      expect(find.byType(SkeletonList), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });

    testWidgets('HomeInitial renders SkeletonList, not CircularProgressIndicator', (tester) async {
      when(() => homeCubit.state).thenReturn(const HomeInitial());

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));

      expect(find.byType(SkeletonList), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });
  });

  // ── 2. HomeFailure — scaffold + retry button ───────────────────────────────

  group('HomeFailure', () {
    testWidgets('shows Scaffold with AppBar titled "Inicio" and retry button', (tester) async {
      when(() => homeCubit.state).thenReturn(
        const HomeFailure(message: 'Error de red'),
      );

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));

      expect(find.text('Inicio'), findsOneWidget);
      expect(find.text('Error de red'), findsOneWidget);
      expect(find.text('Reintentar'), findsOneWidget);
    });

    testWidgets('retry button calls HomeCubit.load()', (tester) async {
      when(() => homeCubit.state).thenReturn(
        const HomeFailure(message: 'Error de red'),
      );

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));

      await tester.tap(find.text('Reintentar'));
      await tester.pump();

      verify(() => homeCubit.load()).called(greaterThan(0));
    });
  });

  // ── 3. Mis partidas section ───────────────────────────────────────────────

  group('HomeLoaded — Mis partidas section', () {
    testWidgets('shows "Mis partidas" heading when myMatches is non-empty', (tester) async {
      when(() => homeCubit.state).thenReturn(
        _loadedState(myMatches: [_makeOpenMatch(id: 'my-1')]),
      );

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));
      await tester.pumpAndSettle();

      expect(find.text('Mis partidas'), findsOneWidget);
    });

    testWidgets('shows compact CTA when myMatches is empty', (tester) async {
      when(() => homeCubit.state).thenReturn(
        _loadedState(myMatches: []),
      );

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));
      await tester.pumpAndSettle();

      expect(find.textContaining('No tenés partidas'), findsOneWidget);
    });

    testWidgets('shows at most 2 items from myMatches', (tester) async {
      when(() => homeCubit.state).thenReturn(
        _loadedState(myMatches: [
          _makeOpenMatch(id: 'my-1'),
          _makeOpenMatch(id: 'my-2'),
          _makeOpenMatch(id: 'my-3'),
        ]),
      );

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));
      await tester.pumpAndSettle();

      // The section title should appear once
      expect(find.text('Mis partidas'), findsOneWidget);
      // "Ver todas" link should appear
      expect(find.text('Ver todas'), findsWidgets);
    });
  });

  // ── 4. Open matches — EmptyState ──────────────────────────────────────────

  group('HomeLoaded — open matches section', () {
    testWidgets('shows EmptyState widget when openMatches is empty', (tester) async {
      when(() => homeCubit.state).thenReturn(
        _loadedState(openMatches: []),
      );

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));
      await tester.pumpAndSettle();

      expect(find.byType(EmptyState), findsOneWidget);
    });

    testWidgets('does NOT show EmptyState when openMatches is non-empty', (tester) async {
      when(() => homeCubit.state).thenReturn(
        _loadedState(openMatches: [_makeOpenMatch()]),
      );

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));
      await tester.pumpAndSettle();

      expect(find.byType(EmptyState), findsNothing);
    });
  });

  // ── 5. Hero card CTAs ─────────────────────────────────────────────────────

  group('Hero card CTAs', () {
    testWidgets('hero shows Buscar and Crear buttons', (tester) async {
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));
      await tester.pumpAndSettle();

      expect(find.text('Buscar'), findsOneWidget);
      expect(find.text('Crear'), findsOneWidget);
      expect(find.text('En vivo'), findsNothing);
    });
  });

  // ── 6. CTA hierarchy ──────────────────────────────────────────────────────

  group('CTA hierarchy fix', () {
    testWidgets('"Buscar" primary button is present', (tester) async {
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));
      await tester.pumpAndSettle();

      expect(find.text('Buscar'), findsOneWidget);
    });

    testWidgets('"Crear" secondary button is present', (tester) async {
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));
      await tester.pumpAndSettle();

      expect(find.text('Crear'), findsOneWidget);
    });

    testWidgets('"Nuevo Torneo" CTA is absent', (tester) async {
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));
      await tester.pumpAndSettle();

      expect(find.text('Nuevo Torneo'), findsNothing);
    });
  });

  // ── 7. Subtitle copy fix ─────────────────────────────────────────────────

  group('subtitle copy', () {
    testWidgets('"Tu resumen" is replaced by "Actividad cerca de ti"', (tester) async {
      when(() => homeCubit.state).thenReturn(_loadedState());

      await tester.pumpWidget(_wrap(homeCubit: homeCubit, shellCubit: shellCubit));
      await tester.pumpAndSettle();

      expect(find.text('Tu resumen'), findsNothing);
      expect(find.text('Actividad cerca de ti'), findsAtLeastNWidgets(1));
    });
  });
}
