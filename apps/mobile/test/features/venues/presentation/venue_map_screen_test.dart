import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_state.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/venue_map_screen.dart';

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

class _MockVenueMapCubit extends MockCubit<VenueMapState>
    implements VenueMapCubit {}


// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

VenueDto _venue({
  String id = 'v1',
  String name = 'Club Norte',
  String address = 'Av. Corrientes 1234',
  double lat = -34.6,
  double lng = -58.4,
  double? distanceKm,
}) =>
    VenueDto(
      id: id,
      name: name,
      address: address,
      latitude: lat,
      longitude: lng,
      distanceKm: distanceKm,
    );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Wraps the widget under test with GoRouter and BlocProvider so that
/// [context.push], [context.read<VenueMapCubit>()] work correctly.
Widget _buildTestApp({
  required VenueMapState state,
  required _MockVenueMapCubit cubit,
}) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, routeState) => BlocProvider<VenueMapCubit>.value(
          value: cubit,
          child: const VenueMapScreen(),
        ),
      ),
      GoRoute(
        path: '/venues/:venueId/create-match',
        builder: (context, routeState) =>
            const Scaffold(body: Text('Booking')),
      ),
    ],
  );

  return MaterialApp.router(routerConfig: router);
}

void main() {
  late _MockVenueMapCubit cubit;

  setUp(() {
    cubit = _MockVenueMapCubit();
    when(() => cubit.load()).thenAnswer((_) async {});
    when(() => cubit.search(any())).thenReturn(null);
    when(() => cubit.selectVenue(any())).thenReturn(null);
    when(() => cubit.selectVenue(null)).thenReturn(null);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. loading → shows CircularProgressIndicator, no FlutterMap
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('status=loading → shows CircularProgressIndicator, no FlutterMap',
      (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(status: VenueMapStatus.loading),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.byType(FlutterMap), findsNothing);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. failure → shows error text + Reintentar button
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('status=failure → shows error text + Reintentar button',
      (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(
        status: VenueMapStatus.failure,
        error: 'Sin conexión.',
      ),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.text('Sin conexión.'), findsOneWidget);
    expect(find.text('Reintentar'), findsOneWidget);
    expect(find.byType(FlutterMap), findsNothing);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. failure, tapping Reintentar → calls cubit.load()
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('status=failure, tapping Reintentar → calls cubit.load()',
      (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(
        status: VenueMapStatus.failure,
        error: 'Sin conexión.',
      ),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    await tester.tap(find.text('Reintentar'));
    verify(() => cubit.load()).called(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. loaded, venues=[] → FlutterMap present, no markers
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('status=loaded, venues=[] → FlutterMap widget present',
      (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(
        status: VenueMapStatus.loaded,
        venues: [],
        filtered: [],
      ),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.byType(FlutterMap), findsOneWidget);
    expect(find.byType(MarkerLayer), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. loaded with venues → MarkerLayer present
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('status=loaded with venues → MarkerLayer present', (tester) async {
    final venues = [_venue(id: 'v1'), _venue(id: 'v2', name: 'Club Sur')];
    when(() => cubit.state).thenReturn(
      VenueMapState(
        status: VenueMapStatus.loaded,
        venues: venues,
        filtered: venues,
      ),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.byType(FlutterMap), findsOneWidget);
    expect(find.byType(MarkerLayer), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. floating search TextField is present when status=loaded
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('status=loaded → floating search TextField is present',
      (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(status: VenueMapStatus.loaded),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.byType(TextField), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. typing in search TextField → calls cubit.search(query)
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('typing in search TextField → calls cubit.search(query)',
      (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(status: VenueMapStatus.loaded),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    await tester.enterText(find.byType(TextField), 'Norte');
    verify(() => cubit.search('Norte')).called(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. selectedVenue=null → mini sheet not present
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('selectedVenue=null → mini sheet not visible', (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(
        status: VenueMapStatus.loaded,
        selectedVenue: null,
      ),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.text('Reservar'), findsNothing);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9. selectedVenue=venue → mini sheet visible with venue name
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('selectedVenue=venue → mini sheet visible with venue name',
      (tester) async {
    final venue = _venue(id: 'v1', name: 'Club Norte');
    when(() => cubit.state).thenReturn(
      VenueMapState(
        status: VenueMapStatus.loaded,
        venues: [venue],
        filtered: [venue],
        selectedVenue: venue,
      ),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.text('Club Norte'), findsWidgets);
    expect(find.text('Reservar'), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 10. tapping Reservar → navigates to venueCreateMatch route
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('tapping Reservar in mini sheet → navigates to booking route',
      (tester) async {
    final venue = _venue(id: 'v1', name: 'Club Norte');
    when(() => cubit.state).thenReturn(
      VenueMapState(
        status: VenueMapStatus.loaded,
        venues: [venue],
        filtered: [venue],
        selectedVenue: venue,
      ),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    await tester.tap(find.text('Reservar'));
    await tester.pumpAndSettle();

    expect(find.text('Booking'), findsOneWidget);
  });
}
