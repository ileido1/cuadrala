import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_detail_screen.dart';

import 'tournament_golden.dart';

class _Registrations extends MockCubit<TournamentRegistrationsState>
    implements TournamentRegistrationsCubit {}

class _Schedule extends MockCubit<TournamentScheduleState>
    implements TournamentScheduleCubit {}

class _Scoreboard extends MockCubit<TournamentScoreboardState>
    implements TournamentScoreboardCubit {}

class _Repository extends Mock implements TournamentsRepository {}

void main() {
  setUpAll(loadTournamentGoldenFonts);

  for (final brightness in Brightness.values) {
    for (final registrationStatus in [null, 'CONFIRMED']) {
      final scenario = registrationStatus == null ? 'open' : 'confirmed';
      testWidgets('should render detail $scenario ${brightness.name}', (
        tester,
      ) async {
        final registrations = _Registrations();
        final schedule = _Schedule();
        final scoreboard = _Scoreboard();
        when(() => registrations.currentUserId).thenReturn('me');
        when(() => registrations.state).thenReturn(
          TournamentRegistrationsLoaded(
            items: registrationStatus == null
                ? const []
                : [
                    TournamentRegistrationDto(
                      id: 'reg-me',
                      tournamentId: 't1',
                      userId: 'me',
                      status: 'CONFIRMED',
                      createdAt: DateTime(2026, 9, 1),
                    ),
                  ],
            total: registrationStatus == null ? 0 : 1,
            invitations: const [],
          ),
        );
        when(() => schedule.state).thenReturn(const TournamentScheduleEmpty());
        when(
          () => scoreboard.state,
        ).thenReturn(const TournamentScoreboardEmpty());
        final repository = _Repository();

        await pumpTournamentGolden(
          tester,
          brightness: brightness,
          child: MultiBlocProvider(
            providers: [
              BlocProvider<TournamentRegistrationsCubit>.value(
                value: registrations,
              ),
              BlocProvider<TournamentScheduleCubit>.value(value: schedule),
              BlocProvider<TournamentScoreboardCubit>.value(value: scoreboard),
            ],
            child: TournamentDetailBody(
              tournamentId: 't1',
              tournament: TournamentListItemDto(
                id: 't1',
                name: 'Copa Cuádrala',
                status: 'OPEN',
                sportName: 'Pádel',
                categoryId: 'cat',
                categoryName: '7ma',
                startsAt: DateTime(2026, 9, 12, 9),
                registrationClosesAt: DateTime(2026, 9, 11, 20),
                registrationCount: 8,
                maxSlots: 16,
                venueName: 'Club Cuádrala',
                formatPresetName: 'ROUND_ROBIN',
                inscriptionPrice: 15,
              ),
              tournamentsRepository: repository,
            ),
          ),
        );
        expect(tester.takeException(), isNull);
        await expectLater(
          find.byKey(tournamentGoldenKey),
          matchesGoldenFile('detail_${scenario}_${brightness.name}.png'),
        );
      });
    }
  }
}
