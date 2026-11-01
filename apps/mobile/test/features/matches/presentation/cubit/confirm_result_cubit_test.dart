import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/confirm_result_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/confirm_result_state.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

void main() {
  const matchId = 'match-1';
  final now = DateTime.utc(2026, 5, 25, 12);

  late _MockMatchesRepository matchesRepository;

  MatchDetailDto buildMatch() {
    return MatchDetailDto(
      id: matchId,
      sportId: 'sport-padel',
      categoryId: 'cat-1',
      type: 'REGULAR',
      status: 'FINISHED',
      scheduledAt: now,
      pricePerPlayerCents: 0,
      maxParticipants: 4,
      participantCount: 4,
      openSpots: 0,
      courtId: null,
      clubName: 'Club Test',
      courtName: 'Cancha 1',
      locationLabel: 'Dirección',
      tournamentId: null,
      participants: const [],
      createdAt: now,
      updatedAt: now,
    );
  }

  Map<String, Object?> buildDraftJson() {
    return {
      'id': 'draft-1',
      'matchId': matchId,
      'proposedByUserId': 'u1',
      'proposedByName': 'Jugador 1',
      'teamASetWins': 2,
      'teamBSetWins': 1,
      'teamAPoints': 21,
      'teamBPoints': 19,
    };
  }

  ConfirmResultCubit buildCubit() => ConfirmResultCubit(
        matchesRepository: matchesRepository,
        matchId: matchId,
      );

  setUp(() {
    matchesRepository = _MockMatchesRepository();
  });

  group('ConfirmResultCubit', () {
    group('load()', () {
      blocTest<ConfirmResultCubit, ConfirmResultState>(
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
          const ConfirmResultStateLoading(),
          isA<ConfirmResultStateFailure>()
              .having((s) => s.message, 'message', 'El servidor no responde.'),
        ],
      );

      blocTest<ConfirmResultCubit, ConfirmResultState>(
        'usa un fallback en español cuando el error no es AppFailure',
        setUp: () {
          when(() => matchesRepository.getMatchDetail(matchId))
              .thenThrow(Exception('boom'));
        },
        build: buildCubit,
        act: (cubit) => cubit.load(),
        expect: () => [
          const ConfirmResultStateLoading(),
          isA<ConfirmResultStateFailure>().having(
            (s) => s.message,
            'message',
            'No se pudo cargar el resultado.',
          ),
        ],
      );
    });

    group('confirmResult()', () {
      blocTest<ConfirmResultCubit, ConfirmResultState>(
        'emite el mensaje de un AppFailure real cuando confirmMatchResult falla',
        setUp: () {
          when(() => matchesRepository.getMatchDetail(matchId))
              .thenAnswer((_) async => buildMatch());
          when(() => matchesRepository.getMatchResultDraft(matchId))
              .thenAnswer((_) async => buildDraftJson());
          when(
            () => matchesRepository.confirmMatchResult(
              matchId: matchId,
              draftId: any(named: 'draftId'),
            ),
          ).thenThrow(
            const AppFailure(
              code: 'CONFLICT',
              message: 'El resultado ya fue confirmado.',
            ),
          );
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          await cubit.confirmResult();
        },
        verify: (cubit) {
          final state = cubit.state as ConfirmResultStateLoaded;
          expect(state.error, 'El resultado ya fue confirmado.');
          expect(state.submitting, isFalse);
        },
      );
    });

    group('rejectResult()', () {
      blocTest<ConfirmResultCubit, ConfirmResultState>(
        'emite el mensaje de un AppFailure real cuando rejectMatchResult falla',
        setUp: () {
          when(() => matchesRepository.getMatchDetail(matchId))
              .thenAnswer((_) async => buildMatch());
          when(() => matchesRepository.getMatchResultDraft(matchId))
              .thenAnswer((_) async => buildDraftJson());
          when(
            () => matchesRepository.rejectMatchResult(
              matchId: matchId,
              draftId: any(named: 'draftId'),
            ),
          ).thenThrow(
            const AppFailure(
              code: 'CONFLICT',
              message: 'No se pudo rechazar: ya fue procesado.',
            ),
          );
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          await cubit.rejectResult();
        },
        verify: (cubit) {
          final state = cubit.state as ConfirmResultStateLoaded;
          expect(state.error, 'No se pudo rechazar: ya fue procesado.');
          expect(state.submitting, isFalse);
        },
      );
    });
  });
}
