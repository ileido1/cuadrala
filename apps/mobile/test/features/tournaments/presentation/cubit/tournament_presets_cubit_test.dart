import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'dart:async';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_preset_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_presets_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_presets_state.dart';

class _MockTournamentsRepository extends Mock
    implements TournamentsRepository {}

void main() {
  group('TournamentPresetsCubit', () {
    late _MockTournamentsRepository tournamentsRepository;
    late Completer<List<TournamentPresetDto>> pendingPadel;
    late Completer<List<TournamentPresetDto>> pendingTennis;

    setUp(() {
      tournamentsRepository = _MockTournamentsRepository();
    });

    TournamentPresetDto preset({
      required String sportId,
      required String name,
    }) {
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
      'ignores an older sport response after a newer selection',
      build: () {
        pendingPadel = Completer<List<TournamentPresetDto>>();
        pendingTennis = Completer<List<TournamentPresetDto>>();
        when(
          () => tournamentsRepository.getPresetsBySportId(sportId: 'padel'),
        ).thenAnswer((_) => pendingPadel.future);
        when(
          () => tournamentsRepository.getPresetsBySportId(sportId: 'tenis'),
        ).thenAnswer((_) => pendingTennis.future);
        return TournamentPresetsCubit(
          tournamentsRepository: tournamentsRepository,
        );
      },
      act: (cubit) async {
        final oldRequest = cubit.load(sportId: 'padel');
        final currentRequest = cubit.load(sportId: 'tenis');
        pendingTennis.complete([preset(sportId: 'tenis', name: 'Actual')]);
        await currentRequest;
        pendingPadel.complete([preset(sportId: 'padel', name: 'Obsoleto')]);
        await currentRequest;
        await oldRequest;
      },
      expect: () => [
        const TournamentPresetsLoading(),
        isA<TournamentPresetsSuccess>().having(
          (state) => state.presets.single.name,
          'current sport preset',
          'Actual',
        ),
      ],
    );

    blocTest<TournamentPresetsCubit, TournamentPresetsState>(
      'load (con presets) emite loading→success',
      build: () {
        when(
          () => tournamentsRepository.getPresetsBySportId(sportId: 'padel'),
        ).thenAnswer(
          (_) async => [preset(sportId: 'padel', name: 'Relámpago')],
        );
        return TournamentPresetsCubit(
          tournamentsRepository: tournamentsRepository,
        );
      },
      act: (cubit) => cubit.load(sportId: 'padel'),
      expect: () => [
        const TournamentPresetsLoading(),
        isA<TournamentPresetsSuccess>().having(
          (s) => s.presets.length,
          'presets.length',
          1,
        ),
      ],
    );

    blocTest<TournamentPresetsCubit, TournamentPresetsState>(
      'load (vacío) emite loading→empty',
      build: () {
        when(
          () => tournamentsRepository.getPresetsBySportId(sportId: 'tennis'),
        ).thenAnswer((_) async => []);
        return TournamentPresetsCubit(
          tournamentsRepository: tournamentsRepository,
        );
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
        when(
          () => tournamentsRepository.getPresetsBySportId(sportId: 'padel'),
        ).thenThrow(
          const AppFailure(
            code: 'HTTP_500',
            message: 'Error cargando presets.',
          ),
        );
        return TournamentPresetsCubit(
          tournamentsRepository: tournamentsRepository,
        );
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
