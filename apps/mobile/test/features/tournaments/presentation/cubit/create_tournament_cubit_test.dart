import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/create_tournament_request.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/create_tournament_response.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/create_tournament_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/create_tournament_state.dart';

class _MockTournamentsRepository extends Mock
    implements TournamentsRepository {}

const _validRequest = CreateTournamentRequest(
  sportId: 'padel',
  categoryId: 'cat-1',
  name: 'Torneo Apertura',
  formatPresetId: 'preset-1',
);

void main() {
  group('CreateTournamentCubit', () {
    late _MockTournamentsRepository tournamentsRepository;

    setUp(() {
      tournamentsRepository = _MockTournamentsRepository();
    });

    blocTest<CreateTournamentCubit, CreateTournamentState>(
      'submit (inválido) emite error de validación sin llamar repo',
      build: () =>
          CreateTournamentCubit(tournamentsRepository: tournamentsRepository),
      act: (cubit) => cubit.submit(
        const CreateTournamentRequest(
          sportId: 'padel',
          categoryId: 'cat-1',
          name: '',
          formatPresetId: 'preset-1',
        ),
      ),
      expect: () => [
        isA<CreateTournamentError>().having(
          (s) => s.message,
          'message',
          isNotEmpty,
        ),
      ],
      verify: (_) {
        verifyNever(
          () => tournamentsRepository.createTournament(
            request: any(named: 'request'),
          ),
        );
      },
    );

    blocTest<CreateTournamentCubit, CreateTournamentState>(
      'submit (Publicar al crear ON) creates then opens the tournament',
      build: () {
        when(
          () => tournamentsRepository.createTournament(
            request: any(named: 'request'),
          ),
        ).thenAnswer(
          (_) async => const CreateTournamentResponse(tournamentId: 't-1'),
        );
        when(
          () => tournamentsRepository.updateTournamentStatus(
            tournamentId: 't-1',
            status: 'OPEN',
          ),
        ).thenAnswer((_) async {});
        return CreateTournamentCubit(
          tournamentsRepository: tournamentsRepository,
        );
      },
      act: (cubit) => cubit.submit(
        const CreateTournamentRequest(
          sportId: 'padel',
          categoryId: 'cat-1',
          name: 'Torneo Apertura',
          formatPresetId: 'preset-1',
          publishOnCreate: true,
        ),
      ),
      expect: () => [
        const CreateTournamentSubmitting(),
        isA<CreateTournamentSuccess>().having(
          (s) => s.tournamentId,
          'tournamentId',
          't-1',
        ),
      ],
      verify: (_) {
        verifyInOrder([
          () => tournamentsRepository.createTournament(
            request: any(named: 'request'),
          ),
          () => tournamentsRepository.updateTournamentStatus(
            tournamentId: 't-1',
            status: 'OPEN',
          ),
        ]);
      },
    );

    blocTest<CreateTournamentCubit, CreateTournamentState>(
      'submit (Publicar al crear OFF) only creates the tournament',
      build: () {
        when(
          () => tournamentsRepository.createTournament(
            request: any(named: 'request'),
          ),
        ).thenAnswer(
          (_) async => const CreateTournamentResponse(tournamentId: 't-1'),
        );
        return CreateTournamentCubit(
          tournamentsRepository: tournamentsRepository,
        );
      },
      act: (cubit) => cubit.submit(_validRequest),
      expect: () => [
        const CreateTournamentSubmitting(),
        isA<CreateTournamentSuccess>().having(
          (s) => s.tournamentId,
          'tournamentId',
          't-1',
        ),
      ],
      verify: (_) {
        verifyNever(
          () => tournamentsRepository.updateTournamentStatus(
            tournamentId: any(named: 'tournamentId'),
            status: any(named: 'status'),
          ),
        );
      },
    );

    blocTest<CreateTournamentCubit, CreateTournamentState>(
      'submit (error) emite submitting→error',
      build: () {
        when(
          () => tournamentsRepository.createTournament(
            request: any(named: 'request'),
          ),
        ).thenThrow(
          const AppFailure(code: 'HTTP_400', message: 'Datos inválidos.'),
        );
        return CreateTournamentCubit(
          tournamentsRepository: tournamentsRepository,
        );
      },
      act: (cubit) => cubit.submit(
        const CreateTournamentRequest(
          sportId: 'padel',
          categoryId: 'cat-1',
          name: 'X',
          formatPresetId: 'preset-1',
        ),
      ),
      expect: () => [
        const CreateTournamentSubmitting(),
        isA<CreateTournamentError>().having(
          (s) => s.message,
          'message',
          'Datos inválidos.',
        ),
      ],
    );
  });
}
