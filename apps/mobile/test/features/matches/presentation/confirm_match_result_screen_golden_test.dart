import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/confirm_match_result_screen.dart';

import '../../../helpers/golden_harness.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

const _matchId = 'match-1';

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
    participantCount: 0,
    openSpots: 4,
    courtId: null,
    clubName: 'Club Cuádrala',
    courtName: 'Cancha 1',
    locationLabel: 'Las Mercedes, Caracas',
    tournamentId: null,
    participants: const [],
    createdAt: fixed,
    updatedAt: fixed,
  );
}

//? Issue #116: confirm_match_result_screen.dart no tenía golden. Cubre el
//? borrador cargado (lo que ve el rival antes de confirmar) y el estado
//? vacío "No hay resultado pendiente".
void main() {
  late _MockMatchesRepository repository;

  setUpAll(loadGoldenFonts);

  setUp(() {
    repository = _MockMatchesRepository();
    getIt.registerSingleton<MatchesRepository>(repository);
    when(
      () => repository.getMatchDetail(_matchId),
    ).thenAnswer((_) async => _buildMatch());
  });

  tearDown(() => getIt.unregister<MatchesRepository>());

  Future<void> pumpScreen(WidgetTester tester, Brightness brightness) async {
    await pumpGolden(
      tester,
      child: const ConfirmMatchResultScreen(matchId: _matchId),
      brightness: brightness,
    );
    await tester.pumpAndSettle();
  }

  for (final brightness in Brightness.values) {
    testWidgets('loaded ${brightness.name}', (tester) async {
      when(() => repository.getMatchResultDraft(_matchId)).thenAnswer(
        (_) async => {
          'id': 'draft-1',
          'matchId': _matchId,
          'proposedByUserId': 'u1',
          'proposedByName': 'Ana Pérez',
          'teamASetWins': 2,
          'teamBSetWins': 1,
          'teamAPoints': 15,
          'teamBPoints': 9,
        },
      );

      await pumpScreen(tester, brightness);

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/confirm_match_result_screen_loaded_${brightness.name}.png',
        ),
      );
    });

    testWidgets('not found ${brightness.name}', (tester) async {
      when(
        () => repository.getMatchResultDraft(_matchId),
      ).thenAnswer((_) async => null);

      await pumpScreen(tester, brightness);

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/confirm_match_result_screen_not_found_${brightness.name}.png',
        ),
      );
    });
  }
}
