import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/match_live_screen.dart';

import '../../../helpers/golden_harness.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

const _matchId = 'match-1';

MatchDetailDto _buildMatch() {
  final at = DateTime(2030, 6, 1, 19);
  return MatchDetailDto(
    id: _matchId,
    sportId: 'sport',
    categoryId: 'cat',
    type: 'REGULAR',
    status: 'IN_PROGRESS',
    //? Sin scheduledAt el cubit arranca el cronómetro en 0 en vez de
    //? calcularlo contra DateTime.now(); el golden avanza un tiempo fijo.
    scheduledAt: null,
    pricePerPlayerCents: 0,
    maxParticipants: 4,
    participantCount: 4,
    openSpots: 0,
    courtId: null,
    clubName: 'Club Cuádrala',
    courtName: 'Cancha 1',
    locationLabel: 'Las Mercedes, Caracas',
    tournamentId: null,
    participants: const [],
    createdAt: at,
    updatedAt: at,
  );
}

//? Issue #116: match_live_screen.dart no tenía golden. Cubre el estado
//? "running" con el cronómetro avanzado 12:34 de tiempo simulado, así la
//? imagen no depende del reloj real ni del Timer.periodic infinito.
void main() {
  late _MockMatchesRepository matchesRepository;

  setUpAll(loadGoldenFonts);

  setUp(() {
    matchesRepository = _MockMatchesRepository();
    getIt.registerSingleton<MatchesRepository>(matchesRepository);
    when(
      () => matchesRepository.getMatchDetail(_matchId),
    ).thenAnswer((_) async => _buildMatch());
  });

  tearDown(() {
    getIt.unregister<MatchesRepository>();
  });

  for (final brightness in Brightness.values) {
    testWidgets('running ${brightness.name}', (tester) async {
      await pumpGolden(
        tester,
        brightness: brightness,
        child: const MatchLiveScreen(matchId: _matchId),
      );
      await tester.pump();
      await tester.pump(const Duration(minutes: 12, seconds: 34));

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/match_live_screen_running_${brightness.name}.png',
        ),
      );

      //? Desmontar cierra el cubit y cancela sus Timer.periodic.
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}
