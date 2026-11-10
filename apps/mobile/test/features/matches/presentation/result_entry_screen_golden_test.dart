import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_api.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/result_entry_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/result_entry_state.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/result_entry_screen.dart';

import '../goldens/matches_golden.dart';

class _MockMatchesApi extends Mock implements MatchesApi {}

class _MockCatalogApi extends Mock implements CatalogApi {}

final _now = DateTime.utc(2030, 6, 1, 12);

final _matchJson = <String, Object?>{
  'id': 'match-1',
  'sportId': 'sport-padel',
  'categoryId': 'cat-1',
  'type': 'REGULAR',
  'status': 'FINISHED',
  'scheduledAt': _now.toIso8601String(),
  'pricePerPlayerCents': 0,
  'maxParticipants': 4,
  'participantCount': 4,
  'openSpots': 0,
  'courtId': null,
  'clubName': 'Club Test',
  'courtName': 'Cancha 1',
  'locationLabel': 'Dirección',
  'tournamentId': null,
  'participants': [
    {'userId': 'u1', 'displayName': 'Ana Pérez', 'joinedAt': _now.toIso8601String()},
    {'userId': 'u2', 'displayName': 'Bruno López', 'joinedAt': _now.toIso8601String()},
    {'userId': 'u3', 'displayName': 'Carlos Díaz', 'joinedAt': _now.toIso8601String()},
    {'userId': 'u4', 'displayName': 'Diana Ruiz', 'joinedAt': _now.toIso8601String()},
  ],
  'createdAt': _now.toIso8601String(),
  'updatedAt': _now.toIso8601String(),
};

final _padelSportsJson = <String, Object?>{
  'sports': [
    {'id': 'sport-padel', 'code': 'PADEL', 'name': 'Pádel'},
  ],
};

ResultEntryCubit? _lastCubit;

Future<void> _setupGetIt(_MockMatchesApi matchesApi, _MockCatalogApi catalogApi) async {
  await getIt.reset();
  _lastCubit = null;

  final catalogRepo = CatalogRepository(catalogApi: catalogApi);
  final matchesRepo = MatchesRepository(matchesApi: matchesApi, catalogRepository: catalogRepo);

  getIt.registerFactoryParam<ResultEntryCubit, String, void>(
    (matchId, _) {
      final cubit = ResultEntryCubit(
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
        matchId: matchId,
      );
      _lastCubit = cubit;
      return cubit;
    },
  );
}

//? Issue #116: result_entry_screen.dart ya tenía tests de comportamiento
//? pero ningún golden. Cubre el paso 0 (asignación de cancha) con los 4
//? jugadores ya ubicados — la foto central del flujo de carga de resultado.
void main() {
  late _MockMatchesApi matchesApi;
  late _MockCatalogApi catalogApi;

  setUpAll(loadMatchesGoldenFonts);

  setUp(() {
    matchesApi = _MockMatchesApi();
    catalogApi = _MockCatalogApi();

    when(() => matchesApi.getMatchEnvelope(matchId: any(named: 'matchId')))
        .thenAnswer((_) async => _matchJson);
    when(() => catalogApi.listSportsEnvelope())
        .thenAnswer((_) async => _padelSportsJson);
  });

  tearDown(() async {
    await getIt.reset();
    _lastCubit = null;
  });

  for (final brightness in Brightness.values) {
    testWidgets('asignación de cancha, 4 jugadores ${brightness.name}', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await pumpMatchesGolden(
        tester,
        brightness: brightness,
        child: const ResultEntryScreen(matchId: 'match-1'),
      );
      await tester.pumpAndSettle();

      final cubit = _lastCubit!;
      cubit.assignToPosition(CourtPosition.teamADrive, 'u1');
      cubit.assignToPosition(CourtPosition.teamAReves, 'u2');
      cubit.assignToPosition(CourtPosition.teamBDrive, 'u3');
      cubit.assignToPosition(CourtPosition.teamBReves, 'u4');
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(matchesGoldenKey),
        matchesGoldenFile('goldens/result_entry_court_assign_${brightness.name}.png'),
      );
    });
  }
}
