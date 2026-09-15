import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_publish_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_publish_state.dart';

class _MockTournamentsRepository extends Mock
    implements TournamentsRepository {}

void main() {
  const tournamentId = 't-1';
  late _MockTournamentsRepository tournamentsRepository;

  TournamentPublishCubit buildCubit() => TournamentPublishCubit(
    tournamentsRepository: tournamentsRepository,
    tournamentId: tournamentId,
    status: 'DRAFT',
    visibility: 'PRIVATE',
  );

  setUp(() {
    tournamentsRepository = _MockTournamentsRepository();
  });

  group('TournamentPublishCubit', () {
    test(
      'should expose the tournament status, visibility, submitting and error',
      () {
        final cubit = buildCubit();

        expect(
          cubit.state,
          const TournamentPublishState(status: 'DRAFT', visibility: 'PRIVATE'),
        );
      },
    );

    blocTest<TournamentPublishCubit, TournamentPublishState>(
      'should update status through the existing status endpoint when requested',
      build: () {
        when(
          () => tournamentsRepository.updateTournamentStatus(
            tournamentId: tournamentId,
            status: 'OPEN',
          ),
        ).thenAnswer((_) async {});
        return buildCubit();
      },
      act: (cubit) => cubit.updateStatus('OPEN'),
      expect: () => const [
        TournamentPublishState(
          status: 'DRAFT',
          visibility: 'PRIVATE',
          submitting: true,
        ),
        TournamentPublishState(status: 'OPEN', visibility: 'PRIVATE'),
      ],
      verify: (_) {
        verify(
          () => tournamentsRepository.updateTournamentStatus(
            tournamentId: tournamentId,
            status: 'OPEN',
          ),
        ).called(1);
      },
    );

    blocTest<TournamentPublishCubit, TournamentPublishState>(
      'should retain the current status and expose an error when status update fails',
      build: () {
        when(
          () => tournamentsRepository.updateTournamentStatus(
            tournamentId: tournamentId,
            status: 'OPEN',
          ),
        ).thenThrow(
          const AppFailure(code: 'HTTP_409', message: 'No permitido.'),
        );
        return buildCubit();
      },
      act: (cubit) => cubit.updateStatus('OPEN'),
      expect: () => const [
        TournamentPublishState(
          status: 'DRAFT',
          visibility: 'PRIVATE',
          submitting: true,
        ),
        TournamentPublishState(
          status: 'DRAFT',
          visibility: 'PRIVATE',
          error: 'No permitido.',
        ),
      ],
    );

    blocTest<TournamentPublishCubit, TournamentPublishState>(
      'should retain the optimistic visibility when its request succeeds',
      build: () {
        when(
          () => tournamentsRepository.updateTournamentVisibility(
            tournamentId: tournamentId,
            visibility: 'PUBLIC',
          ),
        ).thenAnswer((_) async {});
        return buildCubit();
      },
      act: (cubit) => cubit.setVisibility('PUBLIC'),
      expect: () => const [
        TournamentPublishState(
          status: 'DRAFT',
          visibility: 'PUBLIC',
          submitting: true,
        ),
        TournamentPublishState(status: 'DRAFT', visibility: 'PUBLIC'),
      ],
      verify: (_) {
        verify(
          () => tournamentsRepository.updateTournamentVisibility(
            tournamentId: tournamentId,
            visibility: 'PUBLIC',
          ),
        ).called(1);
      },
    );

    blocTest<TournamentPublishCubit, TournamentPublishState>(
      'should optimistically change visibility and revert it when its request fails',
      build: () {
        when(
          () => tournamentsRepository.updateTournamentVisibility(
            tournamentId: tournamentId,
            visibility: 'PUBLIC',
          ),
        ).thenThrow(
          const AppFailure(code: 'HTTP_500', message: 'No se pudo guardar.'),
        );
        return buildCubit();
      },
      act: (cubit) => cubit.setVisibility('PUBLIC'),
      expect: () => const [
        TournamentPublishState(
          status: 'DRAFT',
          visibility: 'PUBLIC',
          submitting: true,
        ),
        TournamentPublishState(
          status: 'DRAFT',
          visibility: 'PRIVATE',
          error: 'No se pudo guardar.',
        ),
      ],
    );
  });
}
