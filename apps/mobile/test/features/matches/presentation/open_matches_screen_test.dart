import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_api.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/open_matches_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/open_matches_state.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/open_matches_screen.dart';

class _MockMatchesApi extends Mock implements MatchesApi {}

class _MockCatalogApi extends Mock implements CatalogApi {}

OpenMatchDto _match({String id = 'match-1'}) {
  return OpenMatchDto(
    id: id,
    sportId: 'sport',
    categoryId: 'cat',
    status: 'SCHEDULED',
    scheduledAt: DateTime.now().add(const Duration(days: 1)),
    pricePerPlayerCents: 1500,
    maxParticipants: 4,
    participantCount: 2,
    openSpots: 2,
    clubName: 'Club Test',
    courtName: 'Cancha 1',
    locationLabel: null,
  );
}

final _myMatchesResponse = <String, Object?>{
  'items': [
    {
      'id': 'match-1',
      'sportId': 'sport',
      'categoryId': 'cat',
      'status': 'SCHEDULED',
      'scheduledAt': DateTime.now().add(const Duration(days: 1)).toIso8601String(),
      'pricePerPlayerCents': 1500,
      'maxParticipants': 4,
      'participantCount': 2,
      'openSpots': 2,
      'clubName': 'Club Test',
      'courtName': 'Cancha 1',
      'locationLabel': null,
    },
  ],
  'pageInfo': {'page': 1, 'limit': 50, 'total': 1},
};

OpenMatchesCubit? _lastCubit;

Future<void> _setupGetIt(
  _MockMatchesApi matchesApi,
  _MockCatalogApi catalogApi,
) async {
  await getIt.reset();
  _lastCubit = null;

  final catalogRepo = CatalogRepository(catalogApi: catalogApi);
  final matchesRepo = MatchesRepository(
    matchesApi: matchesApi,
    catalogRepository: catalogRepo,
  );

  getIt.registerLazySingleton<MatchesRepository>(() => matchesRepo);

  getIt.registerFactory<OpenMatchesCubit>(() {
    final cubit = OpenMatchesCubit(matchesRepository: matchesRepo);
    _lastCubit = cubit;
    return cubit;
  });
}

Widget _buildApp() {
  return MaterialApp(
    home: BlocProvider<OpenMatchesCubit>(
      create: (_) => getIt<OpenMatchesCubit>(),
      child: const OpenMatchesScreen(),
    ),
  );
}

void main() {
  late _MockMatchesApi matchesApi;
  late _MockCatalogApi catalogApi;

  setUp(() {
    matchesApi = _MockMatchesApi();
    catalogApi = _MockCatalogApi();

    when(
      () => matchesApi.listMyMatchesEnvelope(
        page: any(named: 'page'),
        limit: any(named: 'limit'),
      ),
    ).thenAnswer((_) async => _myMatchesResponse);
  });

  tearDown(() async {
    await getIt.reset();
    _lastCubit = null;
  });

  group('Mis partidas tab', () {
    testWidgets('shows Mis partidas header and segmented control', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      expect(find.text('Mis partidas'), findsOneWidget);
      expect(find.text('Próximas'), findsOneWidget);
      expect(find.text('Historial'), findsOneWidget);
    });

    testWidgets('renders match card from listMyMatches', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      expect(find.textContaining('Club Test'), findsOneWidget);
    });

    testWidgets('tapping Historial switches segment in cubit', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Historial'));
      await tester.pumpAndSettle();

      final cubit = _lastCubit!;
      expect((cubit.state as OpenMatchesLoaded).segment, PartidasSegment.history);
    });

    testWidgets('FAB is present', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      expect(find.byType(FloatingActionButton), findsOneWidget);
    });
  });
}
