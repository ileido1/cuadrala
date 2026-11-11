import 'dart:io';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/storage/saved_zones_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_state.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/venue_map_screen.dart';

import '../../../helpers/golden_harness.dart';

class _MockVenueMapCubit extends MockCubit<VenueMapState>
    implements VenueMapCubit {}

const _venues = [
  VenueDto(
    id: 'v1',
    name: 'Club Cuádrala',
    address: 'Av. Principal de Las Mercedes, Caracas',
    latitude: 10.48,
    longitude: -66.86,
    distanceKm: 2.4,
    averageRating: 4.6,
    sports: ['PADEL', 'TENNIS'],
  ),
  VenueDto(
    id: 'v2',
    name: 'Club Sur',
    address: 'Calle 5, El Hatillo',
    latitude: 10.43,
    longitude: -66.83,
    sports: ['PADEL'],
  ),
];

final _zones = [
  SavedZone(
    id: 'z1',
    name: 'Casa',
    latitude: 10.48,
    longitude: -66.86,
    radiusKm: 5,
    updatedAt: DateTime(2030, 6, 1),
  ),
];

//? Issue #116: venue_map_screen.dart ya tenía tests de comportamiento pero
//? ningún golden. El mapa real (FlutterMap + tiles OSM) no descarga tiles en
//? tests, así que el fondo sale vacío; el golden fija lo que sí es nuestro:
//? buscador, filtros de deporte, zonas, el pin y la ficha de la sede
//? seleccionada.
void main() {
  late _MockVenueMapCubit cubit;
  late Directory cacheDir;
  const pathProvider = MethodChannel('plugins.flutter.io/path_provider');

  setUpAll(() async {
    await loadGoldenFonts();
    //? La caché de tiles de flutter_map pide getApplicationCacheDirectory al
    //? crearse; sin plugin en tests eso lanza MissingPluginException. Se
    //? apunta a un directorio temporal fuera del repo.
    cacheDir = Directory.systemTemp.createTempSync('venue_map_golden_');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(pathProvider, (_) async => cacheDir.path);
  });

  tearDownAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(pathProvider, null);
    if (cacheDir.existsSync()) cacheDir.deleteSync(recursive: true);
  });

  setUp(() {
    cubit = _MockVenueMapCubit();
    when(() => cubit.load()).thenAnswer((_) async {});
    when(() => cubit.state).thenReturn(
      VenueMapState(
        status: VenueMapStatus.loaded,
        venues: _venues,
        filtered: _venues,
        userLat: 10.48,
        userLng: -66.86,
        savedZones: _zones,
        sportType: 'PADEL',
        selectedVenue: _venues.first,
      ),
    );
    whenListen(cubit, const Stream<VenueMapState>.empty());
  });

  for (final brightness in Brightness.values) {
    testWidgets('mapa con sede seleccionada ${brightness.name}',
        (tester) async {
      await pumpGolden(
        tester,
        brightness: brightness,
        child: BlocProvider<VenueMapCubit>.value(
          value: cubit,
          child: const VenueMapScreen(),
        ),
      );
      await tester.pump(const Duration(milliseconds: 500));

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/venue_map_screen_selected_${brightness.name}.png',
        ),
      );
    });
  }
}
