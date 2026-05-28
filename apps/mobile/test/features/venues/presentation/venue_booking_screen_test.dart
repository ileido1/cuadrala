import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/catalog/data/models/category_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/court_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_booking_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_booking_state.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/venue_booking_screen.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockVenueBookingCubit extends MockCubit<VenueBookingState>
    implements VenueBookingCubit {}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

VenueDto _venue({String id = 'venue-1', String name = 'Club Padel Norte'}) =>
    VenueDto(
      id: id,
      name: name,
      address: 'Av. Corrientes 1234',
      latitude: -34.6,
      longitude: -58.4,
    );

CourtDto _court({
  String id = 'court-1',
  String name = 'Pista 1',
  String status = 'ACTIVE',
}) =>
    CourtDto(
      id: id,
      venueId: 'venue-1',
      name: name,
      sportType: 'PADEL',
      indoor: true,
      lighting: true,
      status: status,
      createdAt: DateTime(2024),
      pricePerHourCents: 10000,
      durationMinutes: 90,
    );

CategoryDto _category({String id = 'cat-1', String name = 'Primera'}) =>
    CategoryDto(
      id: id,
      sportId: 'sport-1',
      name: name,
      slug: 'primera',
      scheme: 'TIERED',
      sortOrder: 1,
    );

VenueBookingState _loadedState({
  bool canSubmitState = false,
  String? submittedMatchId,
}) {
  return VenueBookingState(
    venue: _venue(),
    selectedDate: DateTime(2024, 6, 1),
    loading: false,
    submitting: false,
    courts: [_court()],
    categories: [_category()],
    sportId: 'sport-1',
    selectedCategoryId: canSubmitState ? 'cat-1' : null,
    selectedCourtId: canSubmitState ? 'court-1' : null,
    selectedSlot: canSubmitState ? '2024-06-01T10:00:00.000Z' : null,
    submittedMatchId: submittedMatchId,
  );
}

// ---------------------------------------------------------------------------
// Test app wrapper
// ---------------------------------------------------------------------------

Widget _buildTestApp({
  required VenueBookingState state,
  required _MockVenueBookingCubit cubit,
  List<GoRoute> extraRoutes = const [],
}) {
  final router = GoRouter(
    initialLocation: '/booking',
    routes: [
      GoRoute(
        path: '/booking',
        builder: (context, _) => BlocProvider<VenueBookingCubit>.value(
          value: cubit,
          child: const VenueBookingScreen(),
        ),
      ),
      GoRoute(
        path: '/matches/:matchId',
        builder: (context, routeState) {
          final matchId = routeState.pathParameters['matchId'] ?? '';
          return Scaffold(
            body: Center(child: Text('Match: $matchId')),
          );
        },
      ),
      ...extraRoutes,
    ],
  );

  return MaterialApp.router(routerConfig: router);
}

void main() {
  late _MockVenueBookingCubit cubit;

  setUp(() {
    cubit = _MockVenueBookingCubit();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Loading state
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('shows CircularProgressIndicator when loading=true', (tester) async {
    when(() => cubit.state).thenReturn(
      VenueBookingState(
        venue: _venue(),
        selectedDate: DateTime(2024),
        loading: true,
      ),
    );

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    // Loading indicator visible; no courts accordion or submit button
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    // AppBar still shows venue name even while loading (by design)
    expect(find.text('Club Padel Norte'), findsOneWidget);
    // No court tiles shown yet
    expect(find.byType(ExpansionTile), findsNothing);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Venue name in AppBar
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('renders venue name in AppBar when loaded', (tester) async {
    when(() => cubit.state).thenReturn(_loadedState());
    whenListen(cubit, Stream<VenueBookingState>.empty(), initialState: _loadedState());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.text('Club Padel Norte'), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Date row visible
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('shows date row with today\'s formatted date', (tester) async {
    when(() => cubit.state).thenReturn(_loadedState());
    whenListen(cubit, Stream<VenueBookingState>.empty(), initialState: _loadedState());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    // Date row should show the selected date text
    expect(find.text('01/06/2024'), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Courts accordion rendered
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('renders ExpansionTile per active court', (tester) async {
    when(() => cubit.state).thenReturn(_loadedState());
    whenListen(cubit, Stream<VenueBookingState>.empty(), initialState: _loadedState());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.byType(ExpansionTile), findsOneWidget);
    expect(find.text('Pista 1'), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Submit button disabled when canSubmit=false
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('submit button is disabled when canSubmit=false', (tester) async {
    when(() => cubit.state).thenReturn(_loadedState(canSubmitState: false));
    whenListen(cubit, Stream<VenueBookingState>.empty(),
        initialState: _loadedState(canSubmitState: false));

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    final fab = find.byType(FloatingActionButton);
    expect(fab, findsOneWidget);

    final fabWidget = tester.widget<FloatingActionButton>(fab);
    expect(fabWidget.onPressed, isNull);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Submit button enabled when canSubmit=true
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('submit button is enabled when canSubmit=true', (tester) async {
    final state = _loadedState(canSubmitState: true);
    when(() => cubit.state).thenReturn(state);
    whenListen(cubit, Stream<VenueBookingState>.empty(), initialState: state);
    when(() => cubit.submit()).thenAnswer((_) async {});

    await tester.pumpWidget(_buildTestApp(state: state, cubit: cubit));
    await tester.pump();

    final fab = find.byType(FloatingActionButton);
    expect(fab, findsOneWidget);

    final fabWidget = tester.widget<FloatingActionButton>(fab);
    expect(fabWidget.onPressed, isNotNull);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // affectsElo Switch present
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('affectsElo Switch is present in loaded state', (tester) async {
    when(() => cubit.state).thenReturn(_loadedState());
    whenListen(cubit, Stream<VenueBookingState>.empty(), initialState: _loadedState());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.byType(Switch), findsOneWidget);
    expect(find.text('Afecta ELO'), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Gender chips present
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('gender chips are present (Masculino, Femenino, Mixto)', (tester) async {
    when(() => cubit.state).thenReturn(_loadedState());
    whenListen(cubit, Stream<VenueBookingState>.empty(), initialState: _loadedState());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.text('Masculino'), findsOneWidget);
    expect(find.text('Femenino'), findsOneWidget);
    expect(find.text('Mixto'), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Navigation on submittedMatchId
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('BlocListener navigates to match detail when submittedMatchId is set',
      (tester) async {
    final initialState = _loadedState(canSubmitState: true);
    final submittedState =
        _loadedState(canSubmitState: true, submittedMatchId: 'new-match-1');

    final controller = StreamController<VenueBookingState>.broadcast();
    when(() => cubit.state).thenReturn(initialState);
    whenListen(cubit, controller.stream, initialState: initialState);

    await tester.pumpWidget(_buildTestApp(state: initialState, cubit: cubit));
    await tester.pump();

    // Emit state with submittedMatchId
    controller.add(submittedState);
    when(() => cubit.state).thenReturn(submittedState);
    await tester.pumpAndSettle();

    // Should have navigated to match detail screen
    expect(find.text('Match: new-match-1'), findsOneWidget);

    await controller.close();
  });
}
