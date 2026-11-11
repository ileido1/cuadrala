import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/cubit/home_cubit.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/cubit/home_state.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/home_screen.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/quick_match_api.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/quick_match_repository.dart';
import 'package:cuadrala_mobile/src/features/quick_match/presentation/cubit/quick_match_cubit.dart';
import 'package:cuadrala_mobile/src/features/shell/presentation/cubit/shell_cubit.dart';

import '../../../helpers/golden_harness.dart';

class _MockHomeCubit extends MockCubit<HomeState> implements HomeCubit {}

class _MockShellCubit extends MockCubit<int> implements ShellCubit {}

class _MockQuickMatchApi extends Mock implements QuickMatchApi {}

class _MockCatalogApi extends Mock implements CatalogApi {}

// Fechas fijas en 2030: lejos de "ahora", así ninguna tarjeta se marca
// "En vivo" y el golden no depende del reloj.
final _openMatches = [
  OpenMatchDto(
    id: 'open-1',
    sportId: 'sport-1',
    categoryId: 'cat-1',
    categoryName: 'Primera',
    status: 'OPEN',
    scheduledAt: DateTime(2030, 6, 1, 18),
    pricePerPlayerCents: 1500,
    maxParticipants: 4,
    participantCount: 2,
    openSpots: 2,
    clubName: 'Club Cuádrala',
    courtName: 'Cancha 1',
    surfaceType: 'Exterior',
    locationLabel: 'Las Mercedes, Caracas',
    participantPreview: const [
      ParticipantPreviewDto(userId: 'u-1', displayName: 'Ana Pérez'),
      ParticipantPreviewDto(userId: 'u-2', displayName: 'Luis Gómez'),
    ],
  ),
];

final _myMatches = [
  OpenMatchDto(
    id: 'my-1',
    sportId: 'sport-1',
    categoryId: 'cat-1',
    categoryName: 'Primera',
    status: 'SCHEDULED',
    scheduledAt: DateTime(2030, 6, 2, 20),
    pricePerPlayerCents: 2000,
    maxParticipants: 4,
    participantCount: 4,
    openSpots: 0,
    clubName: 'Club Altamira',
    courtName: 'Cancha 3',
    locationLabel: 'Altamira, Caracas',
  ),
];

//? Issue #116: home_screen.dart ya tenía tests de comportamiento pero ningún
//? golden. Cubre la home cargada con partidas (propias y abiertas) y el
//? estado vacío (sin partidas propias ni abiertas).
void main() {
  late _MockHomeCubit homeCubit;
  late _MockShellCubit shellCubit;
  late QuickMatchCubit quickMatchCubit;

  setUpAll(loadGoldenFonts);

  setUp(() async {
    await getIt.reset();
    homeCubit = _MockHomeCubit();
    shellCubit = _MockShellCubit();
    quickMatchCubit = QuickMatchCubit(
      repository: QuickMatchRepository(_MockQuickMatchApi()),
      catalogRepository: CatalogRepository(catalogApi: _MockCatalogApi()),
    );
    when(() => shellCubit.state).thenReturn(0);
    when(() => homeCubit.load()).thenAnswer((_) async {});
    getIt.registerFactory<QuickMatchCubit>(() => quickMatchCubit);
  });

  tearDown(() async {
    await homeCubit.close();
    await shellCubit.close();
    await quickMatchCubit.close();
    await getIt.reset();
  });

  Future<void> pumpHome(
    WidgetTester tester,
    Brightness brightness,
    HomeState state,
  ) async {
    when(() => homeCubit.state).thenReturn(state);
    await pumpGolden(
      tester,
      brightness: brightness,
      child: MultiBlocProvider(
        providers: [
          BlocProvider<HomeCubit>.value(value: homeCubit),
          BlocProvider<ShellCubit>.value(value: shellCubit),
        ],
        child: const HomeScreen(),
      ),
    );
    await tester.pumpAndSettle();
  }

  for (final brightness in Brightness.values) {
    testWidgets('Home — con partidas ${brightness.name}', (tester) async {
      await pumpHome(
        tester,
        brightness,
        HomeLoaded(
          greetingName: 'Carlos',
          sportId: 'sport-1',
          levelCategory: 'Primera',
          levelElo: 1240,
          openMatches: _openMatches,
          myMatches: _myMatches,
        ),
      );

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile('goldens/home_loaded_${brightness.name}.png'),
      );
    });

    testWidgets('Home — vacía ${brightness.name}', (tester) async {
      await pumpHome(
        tester,
        brightness,
        const HomeLoaded(
          greetingName: 'Carlos',
          sportId: 'sport-1',
          openMatches: [],
          myMatches: [],
        ),
      );

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile('goldens/home_empty_${brightness.name}.png'),
      );
    });
  }
}
