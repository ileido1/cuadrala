import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_marker_cluster/flutter_map_marker_cluster.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/storage/saved_zones_repository.dart';
import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
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
  double? averageRating,
  List<String> sports = const [],
}) =>
    VenueDto(
      id: id,
      name: name,
      address: address,
      latitude: lat,
      longitude: lng,
      distanceKm: distanceKm,
      averageRating: averageRating,
      sports: sports,
    );

SavedZone _zone({
  String id = 'z1',
  String name = 'Casa',
  int radiusKm = 5,
}) =>
    SavedZone(
      id: id,
      name: name,
      latitude: -34.6,
      longitude: -58.4,
      radiusKm: radiusKm,
      updatedAt: DateTime(2024, 1, 1),
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
      GoRoute(
        path: '/descubrir/:venueId',
        builder: (context, routeState) {
          final venueId = routeState.pathParameters['venueId'] ?? '';
          return Scaffold(body: Text('Detail:$venueId'));
        },
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
    when(() => cubit.recenterToCurrentLocation()).thenAnswer((_) async {});
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

    // initState ya llama load() una vez; el botón Reintentar lo llama de nuevo.
    await tester.tap(find.text('Reintentar'));
    verify(() => cubit.load()).called(2);
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
    expect(find.byType(MarkerClusterLayerWidget), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. loaded with venues → MarkerClusterLayerWidget present
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('status=loaded with venues → MarkerClusterLayerWidget present',
      (tester) async {
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
    expect(find.byType(MarkerClusterLayerWidget), findsOneWidget);
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
  // 7b. sport filter chips (Phase 3)
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('status=loaded → sport filter chips (Todos, Pádel, Tenis) present',
      (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(status: VenueMapStatus.loaded),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    expect(find.text('Todos'), findsOneWidget);
    expect(find.text('Pádel'), findsOneWidget);
    expect(find.text('Tenis'), findsOneWidget);
  });

  testWidgets('tapping Pádel chip → calls cubit.load(sportType: PADEL)',
      (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(status: VenueMapStatus.loaded),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());
    when(() => cubit.load(sportType: 'PADEL')).thenAnswer((_) async {});

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    await tester.tap(find.text('Pádel'));
    verify(() => cubit.load(sportType: 'PADEL')).called(1);
  });

  testWidgets('tapping Tenis chip → calls cubit.load(sportType: TENNIS)',
      (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(status: VenueMapStatus.loaded),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());
    when(() => cubit.load(sportType: 'TENNIS')).thenAnswer((_) async {});

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    await tester.tap(find.text('Tenis'));
    verify(() => cubit.load(sportType: 'TENNIS')).called(1);
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

    expect(find.text('Ver detalles'), findsNothing);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9. selectedVenue=venue → mini sheet visible with venue name + Ver detalles
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('selectedVenue=venue → mini sheet visible with name + Ver detalles',
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
    expect(find.text('Ver detalles'), findsOneWidget);
    expect(find.text('Reservar'), findsNothing);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9b. mini sheet shows sport icons + rating + distance
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('mini sheet shows sport icons, rating and distance',
      (tester) async {
    final venue = _venue(
      id: 'v1',
      name: 'Club Norte',
      distanceKm: 3.2,
      averageRating: 4.7,
      sports: ['PADEL', 'TENNIS'],
    );
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

    expect(find.text('3.2 km'), findsOneWidget);
    expect(find.text('4.7'), findsOneWidget);
    expect(find.byIcon(AppIcons.racquetSport), findsOneWidget);
    expect(find.byIcon(AppIcons.tennisBall), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 10. tapping Ver detalles → navigates to venue detail route
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('tapping Ver detalles in mini sheet → navigates to detail route',
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

    await tester.tap(find.text('Ver detalles'));
    await tester.pumpAndSettle();

    expect(find.text('Detail:v1'), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 11. GPS floating button → calls recenterToCurrentLocation
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('status=loaded → GPS button present', (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(status: VenueMapStatus.loaded),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    // AppIcons.myLocation también lo usa el chip "Mi ubicación" (línea 286);
    // se desambigua acotando al FloatingActionButton de recentrado GPS.
    expect(
      find.widgetWithIcon(FloatingActionButton, AppIcons.myLocation),
      findsOneWidget,
    );
  });

  testWidgets('tapping GPS button → calls cubit.recenterToCurrentLocation()',
      (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(status: VenueMapStatus.loaded),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    await tester.tap(find.byType(FloatingActionButton));
    verify(() => cubit.recenterToCurrentLocation()).called(1);
  });

  //? Issue #116: con una sede elegida, la mini hoja (~265px) tapaba el botón
  //? GPS fijo a 160px del borde; el toque caía en la hoja y no recentraba.
  testWidgets(
      'should keep the GPS button tappable above the mini sheet when a venue '
      'is selected', (tester) async {
    //? Hoja completa (deportes, distancia y rating), la más alta posible.
    final venue = _venue(
      id: 'v1',
      name: 'Club Norte',
      distanceKm: 3.2,
      averageRating: 4.7,
      sports: ['PADEL', 'TENNIS'],
    );
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

    await tester.tap(find.byType(FloatingActionButton), warnIfMissed: false);
    verify(() => cubit.recenterToCurrentLocation()).called(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 12. mini sheet close button has a tooltip (#113)
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets('mini sheet close IconButton has tooltip "Cerrar"',
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

    final closeButton = tester.widget<IconButton>(
      find.ancestor(
        of: find.byIcon(AppIcons.close),
        matching: find.byType(IconButton),
      ),
    );
    expect(closeButton.tooltip, 'Cerrar');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 13. zone chips use AppIcons constants (#112)
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets(
      'zone chips bar: current-location, saved-zone and add icons use AppIcons',
      (tester) async {
    when(() => cubit.state).thenReturn(
      VenueMapState(
        status: VenueMapStatus.loaded,
        savedZones: [_zone()],
      ),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    // selectedZone == null → chip "Mi ubicación" shows AppIcons.myLocation
    // (también lo usa el FAB de GPS, por eso findsWidgets en vez de uno solo).
    expect(find.byIcon(AppIcons.myLocation), findsWidgets);
    expect(find.widgetWithIcon(ActionChip, AppIcons.myLocation), findsOneWidget);
    // Saved zone chip, not selected → AppIcons.pin.
    expect(find.byIcon(AppIcons.pin), findsOneWidget);
    // "Zona" add action chip → AppIcons.add.
    expect(find.byIcon(AppIcons.add), findsOneWidget);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 14. zones bottom sheet: empty state icon + close tooltip (#112/#113)
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets(
      'tapping "Zona" opens zones sheet: empty-state icon is AppIcons.pinOutline, '
      'close button has tooltip "Cerrar"', (tester) async {
    when(() => cubit.state).thenReturn(
      const VenueMapState(status: VenueMapStatus.loaded, savedZones: []),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    await tester.tap(find.text('Zona'));
    await tester.pumpAndSettle();

    expect(find.text('No hay zonas guardadas'), findsOneWidget);
    expect(find.byIcon(AppIcons.pinOutline), findsOneWidget);

    final closeButton = tester.widget<IconButton>(
      find.ancestor(
        of: find.byIcon(AppIcons.close),
        matching: find.byType(IconButton),
      ),
    );
    expect(closeButton.tooltip, 'Cerrar');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 15. zones bottom sheet with a zone: delete button tooltip (#112/#113)
  // ──────────────────────────────────────────────────────────────────────────

  testWidgets(
      'zones sheet with a saved zone shows it with AppIcons.pin and a delete '
      'button with tooltip "Eliminar zona"', (tester) async {
    when(() => cubit.state).thenReturn(
      VenueMapState(status: VenueMapStatus.loaded, savedZones: [_zone()]),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());
    when(() => cubit.deleteZone(any())).thenAnswer((_) async {});

    await tester.pumpWidget(_buildTestApp(state: cubit.state, cubit: cubit));
    await tester.pump();

    await tester.tap(find.text('Zona'));
    await tester.pumpAndSettle();

    // AppIcons.pin aparece tanto en el chip de la zona (detrás del sheet)
    // como en el ListTile dentro del sheet de zonas guardadas.
    expect(find.byIcon(AppIcons.pin), findsWidgets);
    expect(find.widgetWithIcon(ListTile, AppIcons.pin), findsOneWidget);

    final deleteButton = tester.widget<IconButton>(
      find.ancestor(
        of: find.byIcon(AppIcons.delete),
        matching: find.byType(IconButton),
      ),
    );
    expect(deleteButton.tooltip, 'Eliminar zona');
  });
}
