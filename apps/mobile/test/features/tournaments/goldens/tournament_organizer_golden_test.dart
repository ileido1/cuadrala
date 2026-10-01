import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_schedule_dto.dart';
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

TournamentRegistrationDto _registration(
  String id,
  String name,
  String status,
) => TournamentRegistrationDto(
  id: id,
  tournamentId: 't1',
  userId: 'user-$id',
  userName: name,
  status: status,
  createdAt: DateTime(2026, 9, 1),
);

void main() {
  setUpAll(loadTournamentGoldenFonts);

  for (final brightness in Brightness.values) {
    for (final locked in [false, true]) {
      testWidgets(
        'should render organizer Inscritos locked=$locked ${brightness.name}',
        (tester) async {
          final registrations = _Registrations();
          final schedule = _Schedule();
          final scoreboard = _Scoreboard();
          when(() => registrations.currentUserId).thenReturn('org');
          when(() => registrations.state).thenReturn(
            TournamentRegistrationsLoaded(
              items: [
                _registration('one', 'Ana Uno', 'CONFIRMED'),
                _registration('two', 'Beto Dos', 'PENDING'),
              ],
              total: 2,
              canManageInvitations: true,
            ),
          );
          when(
            () => schedule.state,
          ).thenReturn(const TournamentScheduleEmpty());
          when(
            () => scoreboard.state,
          ).thenReturn(const TournamentScoreboardEmpty());
          await pumpTournamentGolden(
            tester,
            brightness: brightness,
            child: MultiBlocProvider(
              providers: [
                BlocProvider<TournamentRegistrationsCubit>.value(
                  value: registrations,
                ),
                BlocProvider<TournamentScheduleCubit>.value(value: schedule),
                BlocProvider<TournamentScoreboardCubit>.value(
                  value: scoreboard,
                ),
              ],
              child: TournamentDetailBody(
                tournamentId: 't1',
                viewerIsOrganizer: true,
                tournament: TournamentListItemDto(
                  id: 't1',
                  name: 'Copa Cuádrala',
                  status: locked ? 'IN_PROGRESS' : 'OPEN',
                  sportName: 'Pádel',
                  categoryId: 'cat',
                  categoryName: 'Mixto 7ma',
                  startsAt: DateTime(2026, 9, 12, 9),
                  registrationCount: 2,
                  maxSlots: 16,
                  venueName: 'Club Cuádrala',
                  pairedRegistration: true,
                ),
                tournamentsRepository: _Repository(),
              ),
            ),
          );
          expect(tester.takeException(), isNull);
          await expectLater(
            find.byKey(tournamentGoldenKey),
            matchesGoldenFile(
              'organizer_inscritos_${locked ? 'locked' : 'open'}_${brightness.name}.png',
            ),
          );
        },
      );
    }

    testWidgets('should render organizer generated Cuadro ${brightness.name}', (
      tester,
    ) async {
      final registrations = _Registrations();
      final schedule = _Schedule();
      final scoreboard = _Scoreboard();
      when(() => registrations.currentUserId).thenReturn('org');
      when(() => registrations.state).thenReturn(
        TournamentRegistrationsLoaded(
          items: [_registration('one', 'Ana Uno', 'CONFIRMED')],
          total: 1,
        ),
      );
      when(() => schedule.state).thenReturn(
        const TournamentScheduleSuccess(
          schedule: TournamentScheduleDto(
            rounds: [
              TournamentScheduleRoundDto(
                name: 'Semifinales',
                matches: [
                  TournamentScheduleMatchDto(
                    id: 'm1',
                    label: 'Partido 1',
                    status: 'SCHEDULED',
                  ),
                ],
              ),
            ],
          ),
        ),
      );
      when(
        () => scoreboard.state,
      ).thenReturn(const TournamentScoreboardEmpty());
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
            viewerIsOrganizer: true,
            tournament: TournamentListItemDto(
              id: 't1',
              name: 'Copa Cuádrala',
              status: 'OPEN',
              sportName: 'Pádel',
              categoryId: 'cat',
              categoryName: '7ma',
              startsAt: DateTime(2026, 9, 12, 9),
              registrationCount: 1,
              formatPresetName: 'SINGLE_ELIMINATION',
            ),
            tournamentsRepository: _Repository(),
          ),
        ),
      );
      await tester.tap(find.text('Cuadro'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await expectLater(
        find.byKey(tournamentGoldenKey),
        matchesGoldenFile('organizer_bracket_generated_${brightness.name}.png'),
      );
    });
  }
}
