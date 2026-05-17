import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_preset_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_presets_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_presets_state.dart';

class _MockTournamentsRepository extends Mock implements TournamentsRepository {}

void main() {
  group('TournamentPresetsCubit', () {
    late _MockTournamentsRepository tournamentsRepository;

    setUp(() {
      tournamentsRepository = _MockTournamentsRepository();
    });

    TournamentPresetDto preset({required String sportId, required String name}) {
      return TournamentPresetDto(
        id: 'preset-1',
        sportId: sportId,
        code: 'SINGLE_ELIM',
        version: 1,
        name: name,
        schemaVersion: 1,
        defaultParameters: const <String, Object?>{'bracketSize': 16},
      );
    }

    blocTest<TournamentPresetsCubit, TournamentPresetsState>(
      'load (con presets) emite loading→success',
      build: () {
        when(() => tournamentsRepository.getPresetsBySportId(sportId: 'padel'))
            .thenAnswer(
          (_) async => [
            preset(sportId: 'padel', name: 'Relámpago'),
          ],
        );
        return TournamentPresetsCubit(tournamentsRepository: tournamentsRepository);
      },
      act: (cubit) => cubit.load(sportId: 'padel'),
      expect: () => [
        const TournamentPresetsLoading(),
        isA<TournamentPresetsSuccess>()
            .having((s) => s.presets.length, 'presets.length', 1),
      ],
    );

    blocTest<TournamentPresetsCubit, TournamentPresetsState>(
      'load (vacío) emite loading→empty',
      build: () {
        when(() => tournamentsRepository.getPresetsBySportId(sportId: 'tennis'))
            .thenAnswer((_) async => []);
        return TournamentPresetsCubit(tournamentsRepository: tournamentsRepository);
      },
      act: (cubit) => cubit.load(sportId: 'tennis'),
      expect: () => [
        const TournamentPresetsLoading(),
        const TournamentPresetsEmpty(),
      ],
    );

    blocTest<TournamentPresetsCubit, TournamentPresetsState>(
      'load (error) emite loading→error',
      build: () {
        when(() => tournamentsRepository.getPresetsBySportId(sportId: 'padel'))
            .thenThrow(
          const AppFailure(code: 'HTTP_500', message: 'Error cargando presets.'),
        );
        return TournamentPresetsCubit(tournamentsRepository: tournamentsRepository);
      },
      act: (cubit) => cubit.load(sportId: 'padel'),
      expect: () => [
        const TournamentPresetsLoading(),
        isA<TournamentPresetsError>().having(
          (s) => s.message,
          'message',
          'Error cargando presets.',
        ),
      ],
    );
  });
}

