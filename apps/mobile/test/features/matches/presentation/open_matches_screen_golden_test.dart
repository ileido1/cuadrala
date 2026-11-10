import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_api.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/open_matches_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/open_matches_screen.dart';

import '../goldens/matches_golden.dart';

class _MockMatchesApi extends Mock implements MatchesApi {}

class _MockCatalogApi extends Mock implements CatalogApi {}

final _myMatchesResponse = <String, Object?>{
  'items': [
    {
      'id': 'match-1',
      'sportId': 'sport',
      'categoryId': 'cat',
      'status': 'SCHEDULED',
      'scheduledAt': DateTime(2030, 6, 1, 20).toIso8601String(),
      'pricePerPlayerCents': 1500,
      'maxParticipants': 4,
      'participantCount': 2,
      'openSpots': 2,
      'clubName': 'Club Cuádrala',
      'courtName': 'Cancha 1',
      'locationLabel': 'Las Mercedes, Caracas',
    },
  ],
  'pageInfo': {'page': 1, 'limit': 50, 'total': 1},
};

//? Issue #116: open_matches_screen.dart (tab "Mis partidas") ya tenía tests
//? de comportamiento pero ningún golden. Cubre la vista "Próximas" con una
//? partida cargada.
void main() {
  late _MockMatchesApi matchesApi;
  late _MockCatalogApi catalogApi;

  setUpAll(loadMatchesGoldenFonts);

  setUp(() async {
    await getIt.reset();
    matchesApi = _MockMatchesApi();
    catalogApi = _MockCatalogApi();

    when(
      () => matchesApi.listMyMatchesEnvelope(
        page: any(named: 'page'),
        limit: any(named: 'limit'),
      ),
    ).thenAnswer((_) async => _myMatchesResponse);

    final catalogRepo = CatalogRepository(catalogApi: catalogApi);
    final matchesRepo = MatchesRepository(
      matchesApi: matchesApi,
      catalogRepository: catalogRepo,
    );
    getIt.registerLazySingleton<MatchesRepository>(() => matchesRepo);
    getIt.registerFactory<OpenMatchesCubit>(
      () => OpenMatchesCubit(matchesRepository: matchesRepo),
    );
  });

  tearDown(() async {
    await getIt.reset();
  });

  for (final brightness in Brightness.values) {
    testWidgets('Mis partidas — Próximas ${brightness.name}', (tester) async {
      await pumpMatchesGolden(
        tester,
        brightness: brightness,
        child: BlocProvider<OpenMatchesCubit>(
          create: (_) => getIt<OpenMatchesCubit>(),
          child: const OpenMatchesScreen(),
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(matchesGoldenKey),
        matchesGoldenFile('goldens/open_matches_upcoming_${brightness.name}.png'),
      );
    });
  }
}
