import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/result_draft_screen.dart';

import '../../../helpers/golden_harness.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

const _matchId = 'match-123456789';

MatchDetailDto _buildMatch() {
  final fixed = DateTime(2030, 6, 1, 12);
  return MatchDetailDto(
    id: _matchId,
    sportId: 'sport',
    categoryId: 'cat',
    type: 'REGULAR',
    status: 'FINISHED',
    scheduledAt: fixed,
    pricePerPlayerCents: 0,
    maxParticipants: 4,
    participantCount: 4,
    openSpots: 0,
    courtId: null,
    clubName: 'Club Cuádrala',
    courtName: 'Cancha 1',
    locationLabel: 'Las Mercedes, Caracas',
    tournamentId: null,
    participants: [
      for (final id in [
        'user-ana00001',
        'user-bru00002',
        'user-car00003',
        'user-dia00004',
      ])
        MatchParticipantDto(userId: id, joinedAt: fixed),
    ],
    createdAt: fixed,
    updatedAt: fixed,
  );
}

//? Issue #116: result_draft_screen.dart no tenía golden. Cubre la lista de
//? jugadores con su contador de puntos y el estado de error de carga.
void main() {
  late _MockMatchesRepository repository;

  setUpAll(loadGoldenFonts);

  setUp(() {
    repository = _MockMatchesRepository();
    getIt.registerSingleton<MatchesRepository>(repository);
  });

  tearDown(() => getIt.unregister<MatchesRepository>());

  Future<void> pumpScreen(WidgetTester tester, Brightness brightness) async {
    await pumpGolden(
      tester,
      child: const ResultDraftScreen(matchId: _matchId),
      brightness: brightness,
    );
    await tester.pumpAndSettle();
  }

  for (final brightness in Brightness.values) {
    testWidgets('loaded ${brightness.name}', (tester) async {
      when(
        () => repository.getMatchById(_matchId),
      ).thenAnswer((_) async => _buildMatch());

      await pumpScreen(tester, brightness);

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/result_draft_screen_loaded_${brightness.name}.png',
        ),
      );
    });

    testWidgets('error ${brightness.name}', (tester) async {
      when(
        () => repository.getMatchById(_matchId),
      ).thenThrow(Exception('boom'));

      await pumpScreen(tester, brightness);

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/result_draft_screen_error_${brightness.name}.png',
        ),
      );
    });
  }
}
