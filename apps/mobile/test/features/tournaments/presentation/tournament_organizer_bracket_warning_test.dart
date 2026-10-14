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

class _RegistrationsCubit extends MockCubit<TournamentRegistrationsState>
    implements TournamentRegistrationsCubit {}

class _ScheduleCubit extends MockCubit<TournamentScheduleState>
    implements TournamentScheduleCubit {}

class _ScoreboardCubit extends MockCubit<TournamentScoreboardState>
    implements TournamentScoreboardCubit {}

class _TournamentsRepository extends Mock implements TournamentsRepository {}

TournamentListItemDto _tournament(String status) => TournamentListItemDto(
  id: 't-1',
  name: 'Torneo test',
  status: status,
  sportName: 'Pádel',
  categoryName: 'Mixto',
  categoryId: 'cat-1',
  startsAt: null,
  registrationCount: 1,
  organizerUserId: 'user-1',
  visibility: 'PUBLIC',
);

void main() {
  late _RegistrationsCubit registrationsCubit;
  late _ScheduleCubit scheduleCubit;
  late _ScoreboardCubit scoreboardCubit;

  setUp(() {
    registrationsCubit = _RegistrationsCubit();
    scheduleCubit = _ScheduleCubit();
    scoreboardCubit = _ScoreboardCubit();
    when(() => registrationsCubit.state).thenReturn(
      TournamentRegistrationsLoaded(
        items: [
          TournamentRegistrationDto(
            id: 'registration-1',
            tournamentId: 't-1',
            status: 'PENDING',
            createdAt: DateTime(2024),
          ),
        ],
        total: 1,
        invitations: const [],
      ),
    );
    when(() => registrationsCubit.currentUserId).thenReturn('user-1');
    when(() => scheduleCubit.state).thenReturn(
      const TournamentScheduleSuccess(
        schedule: TournamentScheduleDto(rounds: []),
      ),
    );
    when(
      () => scoreboardCubit.state,
    ).thenReturn(const TournamentScoreboardEmpty());
  });

  Future<void> openBracket(
    WidgetTester tester, {
    required String status,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: MultiBlocProvider(
          providers: [
            BlocProvider<TournamentRegistrationsCubit>.value(
              value: registrationsCubit,
            ),
            BlocProvider<TournamentScheduleCubit>.value(value: scheduleCubit),
            BlocProvider<TournamentScoreboardCubit>.value(
              value: scoreboardCubit,
            ),
          ],
          child: Scaffold(
            body: TournamentDetailBody(
              tournamentId: 't-1',
              tournament: _tournament(status),
              tournamentsRepository: _TournamentsRepository(),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cuadro'));
    await tester.pumpAndSettle();
  }

  for (final status in ['OPEN', 'IN_PROGRESS']) {
    testWidgets('hides confirmation warning when status is $status', (
      tester,
    ) async {
      await openBracket(tester, status: status);

      expect(find.text('1 sin confirmar quedan fuera'), findsNothing);
      expect(find.text('Confirmar pendientes'), findsNothing);
    });
  }
}
