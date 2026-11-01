import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/match_live_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/match_live_state.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

void main() {
  const matchId = 'match-1';

  late _MockMatchesRepository matchesRepository;

  MatchLiveCubit buildCubit() => MatchLiveCubit(
        matchesRepository: matchesRepository,
        matchId: matchId,
      );

  setUp(() {
    matchesRepository = _MockMatchesRepository();
  });

  group('MatchLiveCubit', () {
    group('load()', () {
      blocTest<MatchLiveCubit, MatchLiveState>(
        'emite el mensaje de un AppFailure real cuando getMatchDetail falla',
        setUp: () {
          when(() => matchesRepository.getMatchDetail(matchId)).thenThrow(
            const AppFailure(
              code: 'SERVER_DOWN',
              message: 'El servidor no responde.',
            ),
          );
        },
        build: buildCubit,
        act: (cubit) => cubit.load(),
        expect: () => [
          const MatchLiveStateLoading(),
          isA<MatchLiveStateFailure>()
              .having((s) => s.message, 'message', 'El servidor no responde.'),
        ],
        tearDown: () async {
          await Future<void>.delayed(Duration.zero);
        },
      );

      blocTest<MatchLiveCubit, MatchLiveState>(
        'usa un fallback en español cuando el error no es AppFailure',
        setUp: () {
          when(() => matchesRepository.getMatchDetail(matchId))
              .thenThrow(Exception('boom'));
        },
        build: buildCubit,
        act: (cubit) => cubit.load(),
        expect: () => [
          const MatchLiveStateLoading(),
          isA<MatchLiveStateFailure>().having(
            (s) => s.message,
            'message',
            'No se pudo cargar la partida en vivo.',
          ),
        ],
        tearDown: () async {
          await Future<void>.delayed(Duration.zero);
        },
      );
    });
  });
}
