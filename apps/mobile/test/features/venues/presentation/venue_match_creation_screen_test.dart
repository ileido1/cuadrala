import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_api.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/venue_match_creation_screen.dart';

class _MockCatalogApi extends Mock implements CatalogApi {}

class _MockMatchesApi extends Mock implements MatchesApi {}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

final _sportsJson = <String, Object?>{
  'sports': [
    {'id': 'sport-1', 'code': 'PADEL', 'name': 'Pádel'},
  ],
};

final _categoriesJson = <String, Object?>{
  'categories': [
    {
      'id': 'cat-1',
      'sportId': 'sport-1',
      'name': 'Cuarta',
      'slug': 'cuarta',
      'scheme': 'POINTS',
      'sortOrder': 1,
    },
    {
      'id': 'cat-2',
      'sportId': 'sport-1',
      'name': 'Tercera',
      'slug': 'tercera',
      'scheme': 'POINTS',
      'sortOrder': 2,
    },
  ],
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

Widget _buildScreen({
  required MatchesRepository matchesRepo,
  required CatalogRepository catalogRepo,
  String venueId = 'v1',
  String? courtId = 'c1',
  String? scheduledAt = '2026-06-01T10:00:00.000Z',
}) {
  return MaterialApp(
    home: VenueMatchCreationScreen(
      venueId: venueId,
      courtId: courtId,
      scheduledAt: scheduledAt,
      matchesRepository: matchesRepo,
      catalogRepository: catalogRepo,
    ),
  );
}

void main() {
  late _MockCatalogApi catalogApi;
  late _MockMatchesApi matchesApi;
  late MatchesRepository matchesRepo;
  late CatalogRepository catalogRepo;

  setUp(() {
    catalogApi = _MockCatalogApi();
    matchesApi = _MockMatchesApi();

    catalogRepo = CatalogRepository(catalogApi: catalogApi);
    matchesRepo = MatchesRepository(
      matchesApi: matchesApi,
      catalogRepository: catalogRepo,
    );

    when(() => catalogApi.listSportsEnvelope())
        .thenAnswer((_) async => _sportsJson);
    when(() => catalogApi.listCategoriesEnvelope(sportId: any(named: 'sportId')))
        .thenAnswer((_) async => _categoriesJson);
  });

  group('VenueMatchCreationScreen', () {
    testWidgets('renders gender filter chips (Masculino/Femenino/Mixto)',
        (tester) async {
      await tester.pumpWidget(
        _buildScreen(matchesRepo: matchesRepo, catalogRepo: catalogRepo),
      );
      await tester.pumpAndSettle();

      expect(find.text('Masculino'), findsOneWidget);
      expect(find.text('Femenino'), findsOneWidget);
      expect(find.text('Mixto'), findsOneWidget);
    });

    testWidgets('renders affectsElo switch', (tester) async {
      await tester.pumpWidget(
        _buildScreen(matchesRepo: matchesRepo, catalogRepo: catalogRepo),
      );
      await tester.pumpAndSettle();

      expect(find.byType(Switch), findsOneWidget);
    });

    testWidgets('renders paymentStatus chips (Debo pagar/Ya pagué/Pendiente)',
        (tester) async {
      await tester.pumpWidget(
        _buildScreen(matchesRepo: matchesRepo, catalogRepo: catalogRepo),
      );
      await tester.pumpAndSettle();

      expect(find.text('Debo pagar'), findsOneWidget);
      expect(find.text('Ya pagué'), findsOneWidget);
      expect(find.text('Pendiente'), findsOneWidget);
    });

    testWidgets('submit button disabled when no category selected',
        (tester) async {
      await tester.pumpWidget(
        _buildScreen(matchesRepo: matchesRepo, catalogRepo: catalogRepo),
      );
      await tester.pumpAndSettle();

      final submitBtn = tester.widget<FilledButton>(
        find.ancestor(
          of: find.text('Crear partido'),
          matching: find.byType(FilledButton),
        ),
      );
      expect(submitBtn.onPressed, isNull);
    });

    testWidgets('submit button enabled after selecting a category',
        (tester) async {
      await tester.pumpWidget(
        _buildScreen(matchesRepo: matchesRepo, catalogRepo: catalogRepo),
      );
      await tester.pumpAndSettle();

      // Tap the first category chip (Cuarta)
      await tester.tap(find.text('Cuarta'));
      await tester.pump();

      final submitBtn = tester.widget<FilledButton>(
        find.ancestor(
          of: find.text('Crear partido'),
          matching: find.byType(FilledButton),
        ),
      );
      expect(submitBtn.onPressed, isNotNull);
    });

    testWidgets('renders category chips loaded from catalogRepository',
        (tester) async {
      await tester.pumpWidget(
        _buildScreen(matchesRepo: matchesRepo, catalogRepo: catalogRepo),
      );
      await tester.pumpAndSettle();

      expect(find.text('Cuarta'), findsOneWidget);
      expect(find.text('Tercera'), findsOneWidget);
    });
  });
}
