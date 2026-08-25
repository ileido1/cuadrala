import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_invitation_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_schedule_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_detail_screen.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockRegistrationsCubit extends MockCubit<TournamentRegistrationsState>
    implements TournamentRegistrationsCubit {}

class _MockScheduleCubit extends MockCubit<TournamentScheduleState>
    implements TournamentScheduleCubit {}

class _MockScoreboardCubit extends MockCubit<TournamentScoreboardState>
    implements TournamentScoreboardCubit {}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

TournamentInvitationDto _pendingInvite({String invitedUserId = 'user-1'}) =>
    TournamentInvitationDto(
      id: 'inv-1',
      tournamentId: 't-1',
      invitedUserId: invitedUserId,
      createdByUserId: 'organizer-1',
      status: 'PENDING',
      createdAt: DateTime(2024),
    );

TournamentListItemDto _tournament({String? organizerUserId, String status = 'OPEN'}) =>
    TournamentListItemDto(
      id: 't-1',
      name: 'Torneo Test',
      status: status,
      sportName: 'Pádel',
      categoryName: 'Mixto',
      startsAt: null,
      registrationCount: 0,
      organizerUserId: organizerUserId,
    );

TournamentRegistrationDto _authRegistration({String userId = 'user-2'}) =>
    TournamentRegistrationDto(
      id: 'reg-auth-1',
      tournamentId: 't-1',
      userId: userId,
      status: 'CONFIRMED',
      createdAt: DateTime(2024),
    );

TournamentRegistrationDto _guestRegistration({
  String id = 'reg-guest-1',
  String status = 'PENDING',
}) =>
    TournamentRegistrationDto(
      id: id,
      tournamentId: 't-1',
      status: status,
      createdAt: DateTime(2024),
      registrationType: 'GUEST',
      guestName: 'Carlos',
      registeredByUserId: 'organizer-1',
    );

// ---------------------------------------------------------------------------
// Test app wrapper
// ---------------------------------------------------------------------------

Widget _buildTestApp({
  required TournamentRegistrationsCubit registrationsCubit,
  required TournamentScheduleCubit scheduleCubit,
  required TournamentScoreboardCubit scoreboardCubit,
  TournamentListItemDto? tournament,
}) {
  final router = GoRouter(
    initialLocation: '/tournaments/t-1',
    routes: [
      GoRoute(
        path: '/tournaments/t-1',
        builder: (context, _) => MultiBlocProvider(
          providers: [
            BlocProvider<TournamentRegistrationsCubit>.value(value: registrationsCubit),
            BlocProvider<TournamentScheduleCubit>.value(value: scheduleCubit),
            BlocProvider<TournamentScoreboardCubit>.value(value: scoreboardCubit),
          ],
          child: TournamentDetailBody(
            tournamentId: 't-1',
            tournament: tournament,
          ),
        ),
      ),
      GoRoute(
        path: '/matches/:matchId/live',
        builder: (context, state) {
          final matchId = state.pathParameters['matchId'] ?? '';
          return Scaffold(body: Center(child: Text('Live match: $matchId')));
        },
      ),
    ],
  );

  return MaterialApp.router(routerConfig: router);
}

void main() {
  late _MockRegistrationsCubit registrationsCubit;
  late _MockScheduleCubit scheduleCubit;
  late _MockScoreboardCubit scoreboardCubit;

  setUpAll(() async {
    await initializeDateFormatting('es_ES');
  });

  setUp(() {
    registrationsCubit = _MockRegistrationsCubit();
    scheduleCubit = _MockScheduleCubit();
    scoreboardCubit = _MockScoreboardCubit();

    when(() => scoreboardCubit.state).thenReturn(const TournamentScoreboardEmpty());
    when(() => registrationsCubit.isCurrentUserRegistered).thenReturn(false);
  });

  group('_RegistrationsTab — pending invitations (D1)', () {
    testWidgets('shows accept/reject actions when current user has a pending invite',
        (tester) async {
      final loaded = TournamentRegistrationsLoaded(
        items: const [],
        total: 0,
        invitations: [_pendingInvite(invitedUserId: 'user-1')],
      );
      when(() => registrationsCubit.state).thenReturn(loaded);
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');
      when(() => scheduleCubit.state).thenReturn(const TournamentScheduleEmpty());

      await tester.pumpWidget(_buildTestApp(
        registrationsCubit: registrationsCubit,
        scheduleCubit: scheduleCubit,
        scoreboardCubit: scoreboardCubit,
      ));
      await tester.pump();

      // Switch to the "Inscriptos" tab.
      await tester.tap(find.text('Inscriptos'));
      await tester.pumpAndSettle();

      expect(find.text('Aceptar'), findsOneWidget);
      expect(find.text('Rechazar'), findsOneWidget);
    });

    testWidgets('does not show accept/reject when there is no pending invite for the user',
        (tester) async {
      final loaded = const TournamentRegistrationsLoaded(items: [], total: 0, invitations: []);
      when(() => registrationsCubit.state).thenReturn(loaded);
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');
      when(() => scheduleCubit.state).thenReturn(const TournamentScheduleEmpty());

      await tester.pumpWidget(_buildTestApp(
        registrationsCubit: registrationsCubit,
        scheduleCubit: scheduleCubit,
        scoreboardCubit: scoreboardCubit,
      ));
      await tester.pump();

      await tester.tap(find.text('Inscriptos'));
      await tester.pumpAndSettle();

      expect(find.text('Aceptar'), findsNothing);
      expect(find.text('Rechazar'), findsNothing);
    });
  });

  group('_ScheduleList — tap live match navigates (D2)', () {
    testWidgets('tapping a materialized match navigates to MatchLiveScreen', (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(items: [], total: 0, invitations: []),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');
      when(() => scheduleCubit.state).thenReturn(
        const TournamentScheduleSuccess(
          schedule: TournamentScheduleDto(
            rounds: [
              TournamentScheduleRoundDto(
                name: 'Ronda 1',
                matches: [
                  TournamentScheduleMatchDto(
                    id: 'sched-m-1',
                    label: 'Partido 1',
                    status: 'IN_PROGRESS',
                    matchId: 'match-123',
                  ),
                ],
              ),
            ],
          ),
        ),
      );

      await tester.pumpWidget(_buildTestApp(
        registrationsCubit: registrationsCubit,
        scheduleCubit: scheduleCubit,
        scoreboardCubit: scoreboardCubit,
      ));
      await tester.pump();

      // Default tab is Fixture.
      await tester.tap(find.text('Partido 1'));
      await tester.pumpAndSettle();

      expect(find.text('Live match: match-123'), findsOneWidget);
    });

    testWidgets('tapping a match without a materialized matchId does not navigate',
        (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(items: [], total: 0, invitations: []),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');
      when(() => scheduleCubit.state).thenReturn(
        const TournamentScheduleSuccess(
          schedule: TournamentScheduleDto(
            rounds: [
              TournamentScheduleRoundDto(
                name: 'Ronda 1',
                matches: [
                  TournamentScheduleMatchDto(
                    id: 'sched-m-1',
                    label: 'Partido 1',
                    status: 'PENDING',
                  ),
                ],
              ),
            ],
          ),
        ),
      );

      await tester.pumpWidget(_buildTestApp(
        registrationsCubit: registrationsCubit,
        scheduleCubit: scheduleCubit,
        scoreboardCubit: scoreboardCubit,
      ));
      await tester.pump();

      await tester.tap(find.text('Partido 1'));
      await tester.pumpAndSettle();

      expect(find.text('Partido 1'), findsOneWidget);
      expect(find.textContaining('Live match:'), findsNothing);
    });
  });

  group('Organizer status-transition control (D5)', () {
    Widget buildControl() {
      return MaterialApp(
        home: BlocProvider<TournamentRegistrationsCubit>.value(
          value: registrationsCubit,
          child: const Scaffold(
            body: OrganizerStatusControl(
              tournamentId: 't-1',
              organizerUserId: 'organizer-1',
              currentStatus: 'OPEN',
            ),
          ),
        ),
      );
    }

    testWidgets('is not rendered for a non-organizer', (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(items: [], total: 0, invitations: []),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');

      await tester.pumpWidget(buildControl());
      await tester.pump();

      expect(find.byKey(const Key('tournament.organizerStatusControl')), findsNothing);
    });

    testWidgets('is rendered for the organizer', (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(items: [], total: 0, invitations: []),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');

      await tester.pumpWidget(buildControl());
      await tester.pump();

      expect(find.byKey(const Key('tournament.organizerStatusControl')), findsOneWidget);
    });
  });

  group('Guest registrations (Slice 1: tournament-guest-registration)', () {
    Future<void> pumpAndOpenRegistrationsTab(
      WidgetTester tester, {
      required TournamentListItemDto tournament,
    }) async {
      await tester.pumpWidget(_buildTestApp(
        registrationsCubit: registrationsCubit,
        scheduleCubit: scheduleCubit,
        scoreboardCubit: scoreboardCubit,
        tournament: tournament,
      ));
      await tester.pump();
      await tester.tap(find.text('Inscriptos'));
      await tester.pumpAndSettle();
    }

    testWidgets('shows guests grouped separately with translated status labels',
        (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        TournamentRegistrationsLoaded(
          items: [
            _authRegistration(),
            _guestRegistration(id: 'reg-guest-1', status: 'PENDING'),
            _guestRegistration(id: 'reg-guest-2', status: 'CONFIRMED'),
          ],
          total: 3,
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');
      when(() => scheduleCubit.state).thenReturn(const TournamentScheduleEmpty());

      await pumpAndOpenRegistrationsTab(tester, tournament: _tournament());

      expect(find.text('Invitados (sin ranking)'), findsOneWidget);
      expect(find.text('Pendiente'), findsOneWidget);
      expect(find.text('Confirmado', skipOffstage: false), findsNWidgets(2));
    });

    testWidgets('organizer sees "Invitar huésped" and non-organizer does not', (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(items: [], total: 0, invitations: []),
      );
      when(() => scheduleCubit.state).thenReturn(const TournamentScheduleEmpty());

      // Non-organizer.
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');
      await pumpAndOpenRegistrationsTab(
        tester,
        tournament: _tournament(organizerUserId: 'organizer-1'),
      );
      expect(find.text('Invitar huésped'), findsNothing);

      // Organizer.
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
      await pumpAndOpenRegistrationsTab(
        tester,
        tournament: _tournament(organizerUserId: 'organizer-1'),
      );
      expect(find.text('Invitar huésped'), findsOneWidget);
    });

    testWidgets('tapping "Invitar huésped" opens the invite sheet', (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(items: [], total: 0, invitations: []),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
      when(() => scheduleCubit.state).thenReturn(const TournamentScheduleEmpty());

      await pumpAndOpenRegistrationsTab(
        tester,
        tournament: _tournament(organizerUserId: 'organizer-1'),
      );

      await tester.tap(find.text('Invitar huésped'));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('tournament.inviteGuestSheet.name')), findsOneWidget);
    });

    testWidgets('organizer taps confirm on a PENDING guest -> calls cubit.confirmRegistration',
        (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        TournamentRegistrationsLoaded(
          items: [_guestRegistration(id: 'reg-guest-1', status: 'PENDING')],
          total: 1,
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
      when(() => registrationsCubit.confirmRegistration(any())).thenAnswer((_) async {});
      when(() => scheduleCubit.state).thenReturn(const TournamentScheduleEmpty());

      await pumpAndOpenRegistrationsTab(
        tester,
        tournament: _tournament(organizerUserId: 'organizer-1'),
      );

      await tester.tap(find.byKey(const Key('tournament.confirmRegistration.reg-guest-1')));
      await tester.pump();

      verify(() => registrationsCubit.confirmRegistration('reg-guest-1')).called(1);
    });

    testWidgets(
        'organizer taps remove on a guest, confirms the dialog -> calls cubit.removeRegistration',
        (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        TournamentRegistrationsLoaded(
          items: [_guestRegistration(id: 'reg-guest-1', status: 'CONFIRMED')],
          total: 1,
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
      when(() => registrationsCubit.removeRegistration(any())).thenAnswer((_) async {});
      when(() => scheduleCubit.state).thenReturn(const TournamentScheduleEmpty());

      await pumpAndOpenRegistrationsTab(
        tester,
        tournament: _tournament(organizerUserId: 'organizer-1'),
      );

      await tester.tap(find.byKey(const Key('tournament.removeRegistration.reg-guest-1')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Eliminar'));
      await tester.pumpAndSettle();

      verify(() => registrationsCubit.removeRegistration('reg-guest-1')).called(1);
    });

    testWidgets(
        'guest confirm/remove actions are hidden once the tournament is IN_PROGRESS',
        (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        TournamentRegistrationsLoaded(
          items: [_guestRegistration(id: 'reg-guest-1', status: 'CONFIRMED')],
          total: 1,
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
      when(() => scheduleCubit.state).thenReturn(const TournamentScheduleEmpty());

      await pumpAndOpenRegistrationsTab(
        tester,
        tournament: _tournament(organizerUserId: 'organizer-1', status: 'IN_PROGRESS'),
      );

      expect(find.text('Invitar huésped'), findsNothing);
      expect(find.byKey(const Key('tournament.removeRegistration.reg-guest-1')), findsNothing);
    });
  });
}
