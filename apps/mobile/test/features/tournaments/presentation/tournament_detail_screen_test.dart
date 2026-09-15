import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_invitation_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_schedule_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_scoreboard_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_detail_screen.dart';
import 'package:cuadrala_mobile/src/shared/widgets/app_header.dart';
import 'package:cuadrala_mobile/src/shared/widgets/pill_toggle.dart';
import 'package:cuadrala_mobile/src/shared/widgets/segmented_control.dart';

import '../handoff_copy.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockRegistrationsCubit extends MockCubit<TournamentRegistrationsState>
    implements TournamentRegistrationsCubit {}

class _MockScheduleCubit extends MockCubit<TournamentScheduleState>
    implements TournamentScheduleCubit {}

class _MockScoreboardCubit extends MockCubit<TournamentScoreboardState>
    implements TournamentScoreboardCubit {}

class _MockTournamentsRepository extends Mock
    implements TournamentsRepository {}

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

TournamentListItemDto _tournament({
  String? organizerUserId = 'user-1',
  String status = 'OPEN',
  String? formatPresetName,
  int? maxSlots,
  int registrationCount = 0,
  bool pairedRegistration = false,
  String visibility = 'PUBLIC',
}) => TournamentListItemDto(
  id: 't-1',
  name: 'Torneo Test',
  status: status,
  sportName: 'Pádel',
  categoryName: 'Mixto',
  categoryId: 'cat-1',
  startsAt: null,
  registrationCount: registrationCount,
  organizerUserId: organizerUserId,
  visibility: visibility,
  formatPresetName: formatPresetName,
  maxSlots: maxSlots,
  pairedRegistration: pairedRegistration,
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
}) => TournamentRegistrationDto(
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
  TournamentsRepository? tournamentsRepository,
}) {
  final router = GoRouter(
    initialLocation: '/tournaments/t-1',
    routes: [
      GoRoute(
        path: '/tournaments/t-1',
        builder: (context, _) => MultiBlocProvider(
          providers: [
            BlocProvider<TournamentRegistrationsCubit>.value(
              value: registrationsCubit,
            ),
            BlocProvider<TournamentScheduleCubit>.value(value: scheduleCubit),
            BlocProvider<TournamentScoreboardCubit>.value(
              value: scoreboardCubit,
            ),
          ],
          child: TournamentDetailBody(
            tournamentId: 't-1',
            tournament: tournament,
            tournamentsRepository:
                tournamentsRepository ?? _MockTournamentsRepository(),
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

    when(
      () => scoreboardCubit.state,
    ).thenReturn(const TournamentScoreboardEmpty());
    when(() => registrationsCubit.isCurrentUserRegistered).thenReturn(false);
  });

  /// Opens the organizer's Cuadro tab with the given [schedule] loaded.
  /// [tournament] defaults to a SINGLE_ELIMINATION-less fixture (M11b's
  /// baseline); M11c's caption/gating tests override it to set
  /// `formatPresetName` or inject a stubbed [tournamentsRepository].
  Future<void> pumpAndOpenBracketTab(
    WidgetTester tester, {
    required TournamentScheduleDto schedule,
    TournamentListItemDto? tournament,
    TournamentsRepository? tournamentsRepository,
  }) async {
    when(() => registrationsCubit.state).thenReturn(
      const TournamentRegistrationsLoaded(
        items: [],
        total: 0,
        invitations: [],
      ),
    );
    when(() => registrationsCubit.currentUserId).thenReturn('user-1');
    when(
      () => scheduleCubit.state,
    ).thenReturn(TournamentScheduleSuccess(schedule: schedule));

    await tester.pumpWidget(
      _buildTestApp(
        registrationsCubit: registrationsCubit,
        scheduleCubit: scheduleCubit,
        scoreboardCubit: scoreboardCubit,
        tournament: tournament ?? _tournament(),
        tournamentsRepository: tournamentsRepository,
      ),
    );
    await tester.pump();

    final bracketTab = find.descendant(
      of: find.byType(SegmentedControl<int>),
      matching: find.text('Cuadro'),
    );
    await tester.tap(bracketTab);
    await tester.pumpAndSettle();
  }

  group('Player detail — pending invitations (D1)', () {
    testWidgets('shows the pending-invitation banner with its open action', (
      tester,
    ) async {
      //? El header estático (M5a) libera alto y saca del offstage el banner
      //? y sus botones Aceptar/Rechazar (`_InfoTab`, fuera de este slice);
      //? antes pasaban desapercibidos por scroll, no por diseño. Hallazgo
      //? pre-existente documentado en apply-progress M5a, no en el widget.
      final loaded = TournamentRegistrationsLoaded(
        items: const [],
        total: 0,
        invitations: [_pendingInvite(invitedUserId: 'user-1')],
      );
      when(() => registrationsCubit.state).thenReturn(loaded);
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');
      when(
        () => scheduleCubit.state,
      ).thenReturn(const TournamentScheduleEmpty());

      await tester.pumpWidget(
        _buildTestApp(
          registrationsCubit: registrationsCubit,
          scheduleCubit: scheduleCubit,
          scoreboardCubit: scoreboardCubit,
          tournament: _tournament(organizerUserId: null),
        ),
      );
      await tester.pumpAndSettle();

      await tester.pumpAndSettle();

      expect(
        find.byKey(const Key('tournament.pendingInviteBanner')),
        findsOneWidget,
      );
      expect(find.text('Ver invitación →'), findsOneWidget);
    });

    testWidgets(
      'does not show accept/reject when there is no pending invite for the user',
      (tester) async {
        final loaded = const TournamentRegistrationsLoaded(
          items: [],
          total: 0,
          invitations: [],
        );
        when(() => registrationsCubit.state).thenReturn(loaded);
        when(() => registrationsCubit.currentUserId).thenReturn('user-1');
        when(
          () => scheduleCubit.state,
        ).thenReturn(const TournamentScheduleEmpty());

        await tester.pumpWidget(
          _buildTestApp(
            registrationsCubit: registrationsCubit,
            scheduleCubit: scheduleCubit,
            scoreboardCubit: scoreboardCubit,
            tournament: _tournament(organizerUserId: null),
          ),
        );
        await tester.pumpAndSettle();

        await tester.pumpAndSettle();

        expect(find.text('Aceptar'), findsNothing);
        expect(find.text('Rechazar'), findsNothing);
      },
    );
  });

  group('_ScheduleList — tap live match navigates (D2)', () {
    testWidgets('tapping a materialized match navigates to MatchLiveScreen', (
      tester,
    ) async {
      when(() => registrationsCubit.state).thenReturn(
        TournamentRegistrationsLoaded(
          items: [_authRegistration(userId: 'user-1')],
          total: 0,
          invitations: [],
        ),
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

      await tester.pumpWidget(
        _buildTestApp(
          registrationsCubit: registrationsCubit,
          scheduleCubit: scheduleCubit,
          scoreboardCubit: scoreboardCubit,
          tournament: _tournament(status: 'IN_PROGRESS', organizerUserId: null),
        ),
      );
      await tester.pump();
      expect(find.byKey(const Key('tournament.detail')), findsOneWidget);
      expect(find.text('Calendario'), findsNothing);
    });

    testWidgets(
      'tapping a match without a materialized matchId does not navigate',
      (tester) async {
        when(() => registrationsCubit.state).thenReturn(
          TournamentRegistrationsLoaded(
            items: [_authRegistration(userId: 'user-1')],
            total: 0,
            invitations: [],
          ),
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

        await tester.pumpWidget(
          _buildTestApp(
            registrationsCubit: registrationsCubit,
            scheduleCubit: scheduleCubit,
            scoreboardCubit: scoreboardCubit,
            tournament: _tournament(
              status: 'IN_PROGRESS',
              organizerUserId: null,
            ),
          ),
        );
        await tester.pump();

        expect(find.byKey(const Key('tournament.detail')), findsOneWidget);
        expect(find.text('Calendario'), findsNothing);
      },
    );
  });

  group('Organizer status-transition control (D5)', () {
    Widget buildControl() {
      return MaterialApp(
        home: BlocProvider<TournamentRegistrationsCubit>.value(
          value: registrationsCubit,
          child: Scaffold(
            body: OrganizerStatusControl(
              tournamentId: 't-1',
              organizerUserId: 'organizer-1',
              currentStatus: 'OPEN',
              tournamentsRepository: _MockTournamentsRepository(),
            ),
          ),
        ),
      );
    }

    testWidgets('is not rendered for a non-organizer', (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(
          items: [],
          total: 0,
          invitations: [],
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');

      await tester.pumpWidget(buildControl());
      await tester.pump();

      expect(
        find.byKey(const Key('tournament.organizerStatusControl')),
        findsNothing,
      );
    });

    testWidgets('is rendered for the organizer', (tester) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(
          items: [],
          total: 0,
          invitations: [],
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');

      await tester.pumpWidget(buildControl());
      await tester.pump();

      expect(
        find.byKey(const Key('tournament.organizerStatusControl')),
        findsOneWidget,
      );
    });
  });

  group('Organizer visibility control (M12b)', () {
    Future<void> pumpOrganizerPublishTab(
      WidgetTester tester, {
      required TournamentsRepository tournamentsRepository,
      required String visibility,
    }) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(
          items: [],
          total: 0,
          invitations: [],
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');

      await tester.pumpWidget(
        _buildTestApp(
          registrationsCubit: registrationsCubit,
          scheduleCubit: scheduleCubit,
          scoreboardCubit: scoreboardCubit,
          tournament: _tournament(
            organizerUserId: 'organizer-1',
            visibility: visibility,
          ),
          tournamentsRepository: tournamentsRepository,
        ),
      );
      await tester.pump();

      await tester.tap(
        find.descendant(
          of: find.byType(SegmentedControl<int>),
          matching: find.text('Publicar'),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets(
      'shows exactly one shared visibility toggle and no Material Switch',
      (tester) async {
        await pumpOrganizerPublishTab(
          tester,
          tournamentsRepository: _MockTournamentsRepository(),
          visibility: 'PRIVATE',
        );

        expect(
          find.byKey(const Key('tournament.visibilityControl')),
          findsOneWidget,
        );
        expect(find.byType(PillToggle), findsOneWidget);
        expect(find.byType(Switch), findsNothing);
        expect(find.text('Sólo lo ven los que invitás'), findsOneWidget);
      },
    );

    testWidgets(
      'optimistically changes the toggle and rolls it back when the request fails',
      (tester) async {
        final repository = _MockTournamentsRepository();
        final request = Completer<void>();
        when(
          () => repository.updateTournamentVisibility(
            tournamentId: 't-1',
            visibility: 'PUBLIC',
          ),
        ).thenAnswer((_) => request.future);

        await pumpOrganizerPublishTab(
          tester,
          tournamentsRepository: repository,
          visibility: 'PRIVATE',
        );

        await tester.tap(
          find.byKey(const Key('tournament.visibilityControl')),
        );
        await tester.pump();

        expect(
          tester.widget<PillToggle>(
            find.byKey(const Key('tournament.visibilityControl')),
          ).value,
          isTrue,
        );
        expect(find.text('Aparece en el listado de la app'), findsOneWidget);

        request.completeError(
          const AppFailure(code: 'HTTP_500', message: 'No se pudo guardar.'),
        );
        await tester.pump();

        expect(
          tester.widget<PillToggle>(
            find.byKey(const Key('tournament.visibilityControl')),
          ).value,
          isFalse,
        );
        expect(find.text('No se pudo guardar.'), findsOneWidget);
        expect(find.text('Sólo lo ven los que invitás'), findsOneWidget);
      },
    );
  });

  group('Organizer status control (M12c)', () {
    Future<void> pumpOrganizerPublishTab(
      WidgetTester tester, {
      required TournamentsRepository tournamentsRepository,
      required String status,
    }) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(
          items: [],
          total: 0,
          invitations: [],
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');

      await tester.pumpWidget(
        _buildTestApp(
          registrationsCubit: registrationsCubit,
          scheduleCubit: scheduleCubit,
          scoreboardCubit: scoreboardCubit,
          tournament: _tournament(
            organizerUserId: 'organizer-1',
            status: status,
          ),
          tournamentsRepository: tournamentsRepository,
        ),
      );
      await tester.pump();
      await tester.tap(
        find.descendant(
          of: find.byType(SegmentedControl<int>),
          matching: find.text('Publicar'),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('removes Cancelar torneo from a draft tournament', (tester) async {
      await pumpOrganizerPublishTab(
        tester,
        tournamentsRepository: _MockTournamentsRepository(),
        status: 'DRAFT',
      );

      expect(find.text('Cancelar torneo'), findsNothing);
    });

    testWidgets('removes Finalizar torneo from an in-progress tournament', (
      tester,
    ) async {
      await pumpOrganizerPublishTab(
        tester,
        tournamentsRepository: _MockTournamentsRepository(),
        status: 'IN_PROGRESS',
      );

      expect(find.text('Finalizar torneo'), findsNothing);
    });

    testWidgets('selects an enabled status and shows its explanation', (
      tester,
    ) async {
      final repository = _MockTournamentsRepository();
      when(
        () => repository.updateTournamentStatus(
          tournamentId: 't-1',
          status: 'OPEN',
        ),
      ).thenAnswer((_) async {});

      await pumpOrganizerPublishTab(
        tester,
        tournamentsRepository: repository,
        status: 'DRAFT',
      );

      final statusControl = find.byKey(const Key('tournament.statusControl'));
      expect(
        find.descendant(of: statusControl, matching: find.text('Borrador')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: statusControl, matching: find.text('Abierta')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: statusControl, matching: find.text('En juego')),
        findsOneWidget,
      );
      expect(
        find.text('Podés seguir cargando gente, pero nadie se anota solo.'),
        findsOneWidget,
      );

      await tester.tap(
        find.descendant(of: statusControl, matching: find.text('Abierta')),
      );
      await tester.pump();

      verify(
        () => repository.updateTournamentStatus(
          tournamentId: 't-1',
          status: 'OPEN',
        ),
      ).called(1);
      expect(
        find.text(
          'Cualquiera de la categoría puede anotarse. Entra como pendiente.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('shows the En juego explanation after opening registrations', (
      tester,
    ) async {
      final repository = _MockTournamentsRepository();
      when(
        () => repository.updateTournamentStatus(
          tournamentId: 't-1',
          status: 'IN_PROGRESS',
        ),
      ).thenAnswer((_) async {});

      await pumpOrganizerPublishTab(
        tester,
        tournamentsRepository: repository,
        status: 'OPEN',
      );

      final statusControl = find.byKey(const Key('tournament.statusControl'));
      await tester.tap(
        find.descendant(of: statusControl, matching: find.text('En juego')),
      );
      await tester.pump();

      expect(
        find.text(
          'Se cierran las inscripciones: ya no entra ni sale nadie del plantel.',
        ),
        findsOneWidget,
      );
    });
  });

  group('Guest registrations (Slice 1: tournament-guest-registration)', () {
    Future<void> pumpAndOpenRegistrationsTab(
      WidgetTester tester, {
      required TournamentListItemDto tournament,
    }) async {
      await tester.pumpWidget(
        _buildTestApp(
          registrationsCubit: registrationsCubit,
          scheduleCubit: scheduleCubit,
          scoreboardCubit: scoreboardCubit,
          tournament: tournament,
        ),
      );
      await tester.pump();
      //? El guard busca "Inscriptos" ya acotado al `SegmentedControl` (no un
      //? `find.text` suelto): el mismo texto también encabeza una sección
      //? del tab "Info" del jugador, y con el header estático (M5) esa
      //? sección ya no queda offstage por defecto — un guard sin acotar
      //? confundía esa sección con la pestaña del organizador. M5b (`TabBar`
      //? → `SegmentedControl`) mueve la búsqueda al widget nuevo.
      final organizerTab = find.descendant(
        of: find.byType(SegmentedControl<int>),
        matching: find.text('Inscriptos'),
      );
      if (organizerTab.evaluate().isNotEmpty) {
        await tester.tap(organizerTab);
        await tester.pumpAndSettle();
      }
    }

    testWidgets(
      'groups roster into Pendientes then Confirmados regardless of guest/authenticated (M10a)',
      (tester) async {
        //? El aviso de inscripciones pendientes ocupa lugar arriba del roster y
        //? empuja el resto del ListView fuera de lo que se construye con la
        //? ventana por defecto.
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.reset);

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
        when(
          () => scheduleCubit.state,
        ).thenReturn(const TournamentScheduleEmpty());

        await pumpAndOpenRegistrationsTab(tester, tournament: _tournament());

        //? Ya no se agrupa por guest/autenticado ("Invitados" desaparece):
        //? el roster agrupa por status en dos secciones encabezadas.
        expect(find.text('Invitados'), findsNothing);
        expect(
          find.byKey(const Key('tournament.registrationsGroup.pending')),
          findsOneWidget,
        );
        expect(
          find.byKey(const Key('tournament.registrationsGroup.confirmed')),
          findsOneWidget,
        );
        expect(find.text('Pendiente'), findsOneWidget);
        expect(find.text('Confirmado', skipOffstage: false), findsNWidgets(2));

        //? Orden: la sección "Pendientes" se dibuja antes que "Confirmados".
        final pendingHeaderY = tester
            .getTopLeft(
              find.byKey(const Key('tournament.registrationsGroup.pending')),
            )
            .dy;
        final confirmedHeaderY = tester
            .getTopLeft(
              find.byKey(const Key('tournament.registrationsGroup.confirmed')),
            )
            .dy;
        expect(pendingHeaderY, lessThan(confirmedHeaderY));
      },
    );

    testWidgets(
      'authenticated PENDING registration shows ✓/✕ actions matching guest rows (M10a)',
      (tester) async {
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.reset);

        when(() => registrationsCubit.state).thenReturn(
          TournamentRegistrationsLoaded(
            items: [
              TournamentRegistrationDto(
                id: 'reg-auth-pending-1',
                tournamentId: 't-1',
                userId: 'user-2',
                status: 'PENDING',
                createdAt: DateTime(2024),
              ),
            ],
            total: 1,
          ),
        );
        when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
        when(
          () => scheduleCubit.state,
        ).thenReturn(const TournamentScheduleEmpty());

        await pumpAndOpenRegistrationsTab(
          tester,
          tournament: _tournament(organizerUserId: 'organizer-1'),
        );

        final confirmButton = find.byKey(
          const Key('tournament.confirmRegistration.reg-auth-pending-1'),
        );
        final removeButton = find.byKey(
          const Key('tournament.removeRegistration.reg-auth-pending-1'),
        );
        expect(confirmButton, findsOneWidget);
        expect(removeButton, findsOneWidget);
        //? "38px" per spec: ambos botones de la fila PENDING miden 38x38.
        expect(tester.getSize(confirmButton), const Size(38, 38));
        expect(tester.getSize(removeButton), const Size(38, 38));
      },
    );

    testWidgets('organizer sees the invite button and non-organizer does not', (
      tester,
    ) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(
          items: [],
          total: 0,
          invitations: [],
        ),
      );
      when(
        () => scheduleCubit.state,
      ).thenReturn(const TournamentScheduleEmpty());

      // Non-organizer.
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');
      await pumpAndOpenRegistrationsTab(
        tester,
        tournament: _tournament(organizerUserId: 'organizer-1'),
      );
      expect(
        find.byKey(const Key('tournament.inviteGuestButton')),
        findsNothing,
      );

      // Organizer.
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
      await pumpAndOpenRegistrationsTab(
        tester,
        tournament: _tournament(organizerUserId: 'organizer-1'),
      );
      expect(
        find.byKey(const Key('tournament.inviteGuestButton')),
        findsOneWidget,
      );
    });

    testWidgets('tapping the invite button opens the invite sheet', (
      tester,
    ) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(
          items: [],
          total: 0,
          invitations: [],
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
      when(
        () => scheduleCubit.state,
      ).thenReturn(const TournamentScheduleEmpty());

      await pumpAndOpenRegistrationsTab(
        tester,
        tournament: _tournament(organizerUserId: 'organizer-1'),
      );

      await tester.tap(find.byKey(const Key('tournament.inviteGuestButton')));
      await tester.pumpAndSettle();

      expect(
        find.byKey(const Key('tournament.inviteGuestSheet.name')),
        findsOneWidget,
      );
    });

    testWidgets(
      'organizer taps confirm on a PENDING guest -> calls cubit.confirmRegistration',
      (tester) async {
        //? El aviso de inscripciones pendientes ocupa lugar arriba del roster y
        //? empuja la sección de invitados fuera de lo que el ListView construye
        //? con la ventana por defecto.
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.reset);

        when(() => registrationsCubit.state).thenReturn(
          TournamentRegistrationsLoaded(
            items: [_guestRegistration(id: 'reg-guest-1', status: 'PENDING')],
            total: 1,
          ),
        );
        when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
        when(
          () => registrationsCubit.confirmRegistration(any()),
        ).thenAnswer((_) async {});
        when(
          () => scheduleCubit.state,
        ).thenReturn(const TournamentScheduleEmpty());

        await pumpAndOpenRegistrationsTab(
          tester,
          tournament: _tournament(organizerUserId: 'organizer-1'),
        );

        await tester.tap(
          find.byKey(const Key('tournament.confirmRegistration.reg-guest-1')),
        );
        await tester.pump();

        verify(
          () => registrationsCubit.confirmRegistration('reg-guest-1'),
        ).called(1);
      },
    );

    testWidgets(
      'organizer taps remove on a guest, confirms the dialog -> calls cubit.removeRegistration',
      (tester) async {
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.reset);

        when(() => registrationsCubit.state).thenReturn(
          TournamentRegistrationsLoaded(
            items: [_guestRegistration(id: 'reg-guest-1', status: 'CONFIRMED')],
            total: 1,
          ),
        );
        when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
        when(
          () => registrationsCubit.removeRegistration(any()),
        ).thenAnswer((_) async {});
        when(
          () => scheduleCubit.state,
        ).thenReturn(const TournamentScheduleEmpty());

        await pumpAndOpenRegistrationsTab(
          tester,
          tournament: _tournament(organizerUserId: 'organizer-1'),
        );

        final removeFinder = find.byKey(
          const Key('tournament.removeRegistration.reg-guest-1'),
          skipOffstage: false,
        );
        await tester.ensureVisible(removeFinder);
        await tester.tap(removeFinder);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Eliminar'));
        await tester.pumpAndSettle();

        verify(
          () => registrationsCubit.removeRegistration('reg-guest-1'),
        ).called(1);
      },
    );

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
        when(
          () => scheduleCubit.state,
        ).thenReturn(const TournamentScheduleEmpty());

        await pumpAndOpenRegistrationsTab(
          tester,
          tournament: _tournament(
            organizerUserId: 'organizer-1',
            status: 'IN_PROGRESS',
          ),
        );

        expect(
          find.byKey(const Key('tournament.inviteGuestButton')),
          findsNothing,
        );
        expect(
          find.byKey(const Key('tournament.removeRegistration.reg-guest-1')),
          findsNothing,
        );
      },
    );
  });

  group(
    'Detail header (M5a) — static header replaces collapsing SliverAppBar',
    () {
      testWidgets('renders without a collapsing SliverAppBar', (
        tester,
      ) async {
        when(() => registrationsCubit.state).thenReturn(
          const TournamentRegistrationsLoaded(
            items: [],
            total: 0,
            invitations: [],
          ),
        );
        when(() => registrationsCubit.currentUserId).thenReturn('user-1');
        when(
          () => scheduleCubit.state,
        ).thenReturn(const TournamentScheduleEmpty());

        await tester.pumpWidget(
          _buildTestApp(
            registrationsCubit: registrationsCubit,
            scheduleCubit: scheduleCubit,
            scoreboardCubit: scoreboardCubit,
            tournament: _tournament(organizerUserId: null),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.byType(SliverAppBar), findsNothing);
        expect(find.byType(NestedScrollView), findsNothing);
        expect(find.byType(AppHeader), findsOneWidget);
      });

      testWidgets(
        'header size and position stay fixed after scrolling the tab content',
        (tester) async {
          //? Ventana chica a propósito para forzar overflow del contenido del
          //? tab Info; así probamos que el header ya no vive dentro de un
          //? scroll que pueda encogerlo (regresión del `SliverAppBar` pinned).
          tester.view.physicalSize = const Size(1080, 500);
          tester.view.devicePixelRatio = 1.0;
          addTearDown(tester.view.reset);

          when(() => registrationsCubit.state).thenReturn(
            const TournamentRegistrationsLoaded(
              items: [],
              total: 0,
              invitations: [],
            ),
          );
          when(() => registrationsCubit.currentUserId).thenReturn('user-1');
          when(
            () => scheduleCubit.state,
          ).thenReturn(const TournamentScheduleEmpty());

          await tester.pumpWidget(
            _buildTestApp(
              registrationsCubit: registrationsCubit,
              scheduleCubit: scheduleCubit,
              scoreboardCubit: scoreboardCubit,
              tournament: _tournament(organizerUserId: null),
            ),
          );
          await tester.pumpAndSettle();

          final headerFinder = find.byType(AppHeader);
          final beforeRect = tester.getRect(headerFinder);

          await tester.drag(
            find.byType(SingleChildScrollView),
            const Offset(0, -400),
            warnIfMissed: false,
          );
          await tester.pump();

          final afterRect = tester.getRect(headerFinder);
          expect(afterRect, beforeRect);
        },
      );
    },
  );

  group(
    'Detail tabs (M5b) — SegmentedControl replaces TabBar',
    () {
      Future<void> pumpPlayerTabs(WidgetTester tester) async {
        when(() => registrationsCubit.state).thenReturn(
          TournamentRegistrationsLoaded(
            items: [_authRegistration(userId: 'user-1')],
            total: 1,
            invitations: const [],
          ),
        );
        when(() => registrationsCubit.currentUserId).thenReturn('user-1');
        when(
          () => scheduleCubit.state,
        ).thenReturn(const TournamentScheduleEmpty());

        await tester.pumpWidget(
          _buildTestApp(
            registrationsCubit: registrationsCubit,
            scheduleCubit: scheduleCubit,
            scoreboardCubit: scoreboardCubit,
            tournament: _tournament(organizerUserId: null),
          ),
        );
        await tester.pumpAndSettle();
      }

      testWidgets(
        'renders a SegmentedControl with the three tab labels instead of a Material TabBar',
        (tester) async {
          await pumpPlayerTabs(tester);

          expect(find.byType(TabBar), findsNothing);
          expect(find.text('Info'), findsOneWidget);
          expect(find.text('Mis partidos'), findsOneWidget);
          expect(find.text('Tabla'), findsOneWidget);
          //? Info es la pestaña por defecto (índice 0).
          expect(find.text('Cómo se juega'), findsOneWidget);
        },
      );

      testWidgets(
        'tapping the "Mis partidos" segment switches to the schedule tab content',
        (tester) async {
          await pumpPlayerTabs(tester);

          await tester.tap(find.text('Mis partidos'));
          await tester.pumpAndSettle();

          expect(
            find.text(
              'El organizador debe generar el calendario cuando haya al menos 2 participantes.',
            ),
            findsOneWidget,
          );
        },
      );

      testWidgets(
        'tapping the "Tabla" segment switches to the scoreboard tab content',
        (tester) async {
          await pumpPlayerTabs(tester);

          await tester.tap(find.text('Tabla'));
          await tester.pumpAndSettle();

          expect(
            find.text(
              'La clasificación estará disponible cuando comience el torneo.',
            ),
            findsOneWidget,
          );
        },
      );

      testWidgets(
        'swiping the tab content does not change the selected segment (tap-only, per handoff)',
        (tester) async {
          await pumpPlayerTabs(tester);

          //? El handoff (`cuadrala-torneos.jsx:220`) sólo cambia de pestaña
          //? con el Segmented: sin swipe. `NeverScrollableScrollPhysics` en
          //? el `TabBarView` corta el gesto antes de que mueva el índice.
          await tester.drag(
            find.byType(TabBarView),
            const Offset(-400, 0),
            warnIfMissed: false,
          );
          await tester.pumpAndSettle();

          expect(find.text('Cómo se juega'), findsOneWidget);
        },
      );
    },
  );

  group('Tabla — row styling and caption (M8)', () {
    TournamentScoreboardDto scoreboard() => const TournamentScoreboardDto(
      rows: [
        //? Valores numéricos elegidos para no colisionar entre sí (ni con
        //? `rank`), así `find.text('1'/'2'/'3')` sólo matchea la celda `#`.
        TournamentScoreboardRowDto(
          userId: 'user-1',
          name: 'Yo Jugador',
          points: 20,
          gamesPlayed: 7,
          gamesWon: 6,
          rank: 1,
        ),
        TournamentScoreboardRowDto(
          userId: 'user-2',
          name: 'Rival Uno',
          points: 15,
          gamesPlayed: 7,
          gamesWon: 5,
          rank: 2,
        ),
        TournamentScoreboardRowDto(
          userId: 'user-3',
          name: 'Rival Dos',
          points: 10,
          gamesPlayed: 7,
          gamesWon: 4,
          rank: 3,
        ),
      ],
    );

    Future<void> pumpTabla(WidgetTester tester) async {
      when(() => registrationsCubit.state).thenReturn(
        TournamentRegistrationsLoaded(
          items: [_authRegistration(userId: 'user-1')],
          total: 1,
          invitations: const [],
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');
      when(
        () => scheduleCubit.state,
      ).thenReturn(const TournamentScheduleEmpty());
      when(
        () => scoreboardCubit.state,
      ).thenReturn(TournamentScoreboardSuccess(scoreboard: scoreboard()));

      await tester.pumpWidget(
        _buildTestApp(
          registrationsCubit: registrationsCubit,
          scheduleCubit: scheduleCubit,
          scoreboardCubit: scoreboardCubit,
          tournament: _tournament(organizerUserId: null),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Tabla'));
      await tester.pumpAndSettle();
    }

    testWidgets('shows the "Se actualiza sola..." caption', (tester) async {
      await pumpTabla(tester);

      expect(
        find.text('Se actualiza sola al cargarse cada resultado'),
        findsOneWidget,
      );
    });

    testWidgets(
      'highlights the viewer own row with green background, bold name and "· vos" suffix',
      (tester) async {
        await pumpTabla(tester);

        final scheme = Theme.of(
          tester.element(find.byType(DataTable)),
        ).colorScheme;

        //? El nombre propio se pinta con Text.rich para poder anexar el
        //? sufijo "· vos" con un estilo distinto dentro del mismo texto.
        final nameCell = tester.widget<Text>(
          find.textContaining('Yo Jugador'),
        );
        expect(nameCell.textSpan?.toPlainText(), contains('· vos'));

        //? `DataRow` no es un Widget de árbol: viene de la lista
        //? `DataTable.rows`, se inspecciona ahí en vez de con `find`.
        final table = tester.widget<DataTable>(find.byType(DataTable));
        final highlighted = table.rows.where(
          (row) => row.color?.resolve(<WidgetState>{}) != null,
        );
        expect(highlighted.length, 1);
        expect(
          highlighted.single.color?.resolve(<WidgetState>{}),
          scheme.primaryContainer.withValues(alpha: 0.35),
        );
      },
    );

    testWidgets('colors rank 1 and 2 green, rank 3 muted', (tester) async {
      await pumpTabla(tester);

      final scheme = Theme.of(tester.element(find.byType(DataTable))).colorScheme;

      final rankOne = tester.widget<Text>(find.text('1'));
      final rankTwo = tester.widget<Text>(find.text('2'));
      final rankThree = tester.widget<Text>(find.text('3'));

      expect(rankOne.style?.color, scheme.primary);
      expect(rankTwo.style?.color, scheme.primary);
      expect(rankThree.style?.color, scheme.onSurfaceVariant);
    });
  });

  group('Cómo se juega tiles (M6b-2)', () {
    Future<void> pumpInfoTab(
      WidgetTester tester, {
      String? formatPresetName,
      int? maxSlots,
      int registrationCount = 0,
    }) async {
      when(() => registrationsCubit.state).thenReturn(
        const TournamentRegistrationsLoaded(items: [], total: 0),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');
      when(
        () => scheduleCubit.state,
      ).thenReturn(const TournamentScheduleEmpty());

      await tester.pumpWidget(
        _buildTestApp(
          registrationsCubit: registrationsCubit,
          scheduleCubit: scheduleCubit,
          scoreboardCubit: scoreboardCubit,
          tournament: _tournament(
            organizerUserId: null,
            formatPresetName: formatPresetName,
            maxSlots: maxSlots,
            registrationCount: registrationCount,
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    //? El "Formato" del handoff (`cuadrala-torneos.jsx:268`) es el preset del
    //? torneo, nunca el deporte: antes de este fix la tarjeta mostraba
    //? `sportName` ("Pádel") en vez de "Eliminación simple".
    testWidgets(
      'shows the mapped formatPresetName label, never the sport name',
      (tester) async {
        await pumpInfoTab(tester, formatPresetName: 'SINGLE_ELIMINATION');

        expect(find.text('Eliminación simple'), findsOneWidget);
        expect(find.text('Pádel'), findsNothing);
      },
    );

    testWidgets(
      'shows maxSlots as "{n} jugadores" on the Cuadro tile when declared',
      (tester) async {
        await pumpInfoTab(
          tester,
          formatPresetName: 'SINGLE_ELIMINATION',
          maxSlots: 16,
        );

        expect(find.text('Cuadro'), findsOneWidget);
        expect(find.text('16 jugadores'), findsOneWidget);
      },
    );

    //? El diseño prohíbe explícitamente un placeholder inventado ("Cupos no
    //? declarados"): sin `maxSlots` la tarjeta entera se omite.
    testWidgets(
      'omits the Cuadro tile entirely when maxSlots is null',
      (tester) async {
        await pumpInfoTab(tester, formatPresetName: 'SINGLE_ELIMINATION');

        expect(find.text('Cuadro'), findsNothing);
        expect(find.textContaining('Cupos no declarados'), findsNothing);
      },
    );

    testWidgets(
      'still shows Formato and Anotados when Cuadro is omitted',
      (tester) async {
        await pumpInfoTab(
          tester,
          formatPresetName: 'ROUND_ROBIN',
          registrationCount: 5,
        );

        expect(find.text('Round robin'), findsOneWidget);
        expect(find.text('5'), findsOneWidget);
      },
    );
  });

  group('Inscriptos summary (M6b-3)', () {
    Future<void> pumpInscriptos(
      WidgetTester tester, {
      required TournamentRegistrationsState state,
      bool pairedRegistration = false,
    }) async {
      when(() => registrationsCubit.state).thenReturn(state);
      when(() => registrationsCubit.currentUserId).thenReturn('user-1');
      when(
        () => scheduleCubit.state,
      ).thenReturn(const TournamentScheduleEmpty());

      await tester.pumpWidget(
        _buildTestApp(
          registrationsCubit: registrationsCubit,
          scheduleCubit: scheduleCubit,
          scoreboardCubit: scoreboardCubit,
          tournament: _tournament(
            organizerUserId: null,
            //? El total de "Anotados" no debe filtrarse con confirmados: son
            //? dos números del handoff (`cuadrala-torneos.jsx:268,281`).
            registrationCount: 99,
            pairedRegistration: pairedRegistration,
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    //? El resumen usa confirmados/pendientes de `items`, no el
    //? `registrationCount` crudo del torneo (que en este fixture es 99: el
    //? mismo número sigue apareciendo, sin cambios, en la tarjeta
    //? "Anotados" — lo que no debe pasar es que el resumen de Inscriptos lo
    //? reutilice como si fueran confirmados).
    testWidgets(
      'shows confirmed and pending counts from registrations items, not registrationCount',
      (tester) async {
        await pumpInscriptos(
          tester,
          state: TournamentRegistrationsLoaded(
            items: [
              _authRegistration(userId: 'p1'),
              _authRegistration(userId: 'p2'),
              _guestRegistration(id: 'g1', status: 'PENDING'),
            ],
            total: 3,
          ),
        );

        expect(find.text(inscriptosConfirmedLabel(2)), findsOneWidget);
        expect(find.text(inscriptosPendingLabel(1)), findsOneWidget);
        expect(find.text(inscriptosConfirmedLabel(99)), findsNothing);
      },
    );

    testWidgets(
      'omits the pending line when nobody is waiting on the organizer',
      (tester) async {
        await pumpInscriptos(
          tester,
          state: TournamentRegistrationsLoaded(
            items: [_authRegistration(userId: 'p1')],
            total: 1,
          ),
        );

        expect(find.text(inscriptosConfirmedLabel(1)), findsOneWidget);
        expect(find.textContaining('esperando al organizador'), findsNothing);
      },
    );

    //? Diseño D17: "The section is hidden until the registrations are
    //? Loaded" — antes de eso no hay confirmados/pendientes que mostrar.
    testWidgets(
      'hides the Inscriptos section before registrations finish loading',
      (tester) async {
        await pumpInscriptos(
          tester,
          state: const TournamentRegistrationsLoading(),
        );

        expect(find.text('Inscriptos'), findsNothing);
      },
    );

    testWidgets(
      'tapping the summary opens a roster sheet listing registrant names',
      (tester) async {
        await pumpInscriptos(
          tester,
          state: TournamentRegistrationsLoaded(
            items: [
              _authRegistration(userId: 'p1'),
              _guestRegistration(id: 'g1', status: 'PENDING'),
            ],
            total: 2,
          ),
        );

        //? La tarjeta vive debajo del fold del área de 800x600 del test.
        final summaryFinder = find.text(inscriptosConfirmedLabel(1));
        await tester.ensureVisible(summaryFinder);
        await tester.tap(summaryFinder);
        await tester.pumpAndSettle();

        expect(find.byKey(const Key('tournament.rosterSheet')), findsOneWidget);
        expect(find.text('Carlos'), findsOneWidget);
      },
    );
  });

  group('_OrganizerBracketTab — Partidos de hoy rows (M11b)', () {
    testWidgets('shows the recorded score for a finished match', (
      tester,
    ) async {
      final schedule = const TournamentScheduleDto(
        rounds: [
          TournamentScheduleRoundDto(
            name: 'Cuartos de final',
            matches: [
              TournamentScheduleMatchDto(
                id: 'sched-1',
                label: 'Daniel R. vs Marcos S.',
                status: '',
                matchId: 'match-1',
                matchStatus: 'FINISHED',
                sides: [
                  TournamentScheduleMatchSideDto(
                    sideKey: 'a',
                    userIds: ['u1'],
                  ),
                  TournamentScheduleMatchSideDto(
                    sideKey: 'b',
                    userIds: ['u2'],
                  ),
                ],
                scores: [
                  TournamentScheduleMatchScoreDto(userId: 'u1', points: 6),
                  TournamentScheduleMatchScoreDto(userId: 'u2', points: 3),
                ],
              ),
            ],
          ),
        ],
      );

      await pumpAndOpenBracketTab(tester, schedule: schedule);

      expect(find.text('Partidos de hoy'), findsOneWidget);
      expect(find.text('Daniel R. vs Marcos S.'), findsOneWidget);
      expect(find.text('6-3'), findsOneWidget);
    });

    testWidgets('shows a Cargar action for a live match', (tester) async {
      final schedule = TournamentScheduleDto(
        rounds: [
          TournamentScheduleRoundDto(
            name: 'Semifinal',
            matches: [
              TournamentScheduleMatchDto(
                id: 'sched-2',
                label: 'Daniel R. vs Luis P.',
                status: '',
                matchId: 'match-2',
                matchStatus: 'IN_PROGRESS',
                scheduledAt: DateTime(2024, 1, 1, 11, 30),
                courtName: 'Central',
              ),
            ],
          ),
        ],
      );

      await pumpAndOpenBracketTab(tester, schedule: schedule);

      expect(find.text('11:30 · Central'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, 'Cargar'), findsOneWidget);
    });

    testWidgets(
      'shows the rejecter name and a Mover action for a rejected slot',
      (tester) async {
        final schedule = TournamentScheduleDto(
          rounds: [
            TournamentScheduleRoundDto(
              name: 'Semifinal',
              matches: [
                TournamentScheduleMatchDto(
                  id: 'sched-3',
                  label: 'Pedro L. vs Rafa T.',
                  status: '',
                  decision: 'REJECTED',
                  rejectedByName: 'Rafa T.',
                  scheduledAt: DateTime(2024, 1, 1, 11, 30),
                  courtName: 'Cancha 2',
                ),
              ],
            ),
          ],
        );

        await pumpAndOpenBracketTab(tester, schedule: schedule);

        expect(find.text('Rafa T. no puede a las 11:30'), findsOneWidget);
        expect(find.widgetWithText(OutlinedButton, 'Mover'), findsOneWidget);
      },
    );

    testWidgets('shows round name and label for a scheduled, not-yet-live match', (
      tester,
    ) async {
      final schedule = TournamentScheduleDto(
        rounds: [
          TournamentScheduleRoundDto(
            name: 'Cuartos de final',
            matches: [
              TournamentScheduleMatchDto(
                id: 'sched-4',
                label: 'Luis P. vs Jorge Á.',
                status: '',
                scheduledAt: DateTime(2024, 1, 1, 9),
                courtName: 'Cancha 2',
              ),
            ],
          ),
        ],
      );

      await pumpAndOpenBracketTab(tester, schedule: schedule);

      expect(find.text('CUARTOS DE FINAL'), findsOneWidget);
      expect(find.text('Luis P. vs Jorge Á.'), findsOneWidget);
      expect(find.text('09:00 · Cancha 2'), findsOneWidget);
    });
  });

  group('_OrganizerBracketTab — SE-only advancement caption (M11c)', () {
    testWidgets('shows the caption verbatim for a single-elimination tournament', (
      tester,
    ) async {
      await pumpAndOpenBracketTab(
        tester,
        schedule: const TournamentScheduleDto(rounds: []),
        tournament: _tournament(formatPresetName: 'SINGLE_ELIMINATION'),
      );

      expect(find.text(seAdvancementCaption), findsOneWidget);
    });

    testWidgets('hides the caption for a round-robin tournament', (
      tester,
    ) async {
      await pumpAndOpenBracketTab(
        tester,
        schedule: const TournamentScheduleDto(rounds: []),
        tournament: _tournament(formatPresetName: 'ROUND_ROBIN'),
      );

      expect(find.text(seAdvancementCaption), findsNothing);
    });

    testWidgets('hides the caption when the format is unknown', (
      tester,
    ) async {
      await pumpAndOpenBracketTab(
        tester,
        schedule: const TournamentScheduleDto(rounds: []),
        tournament: _tournament(),
      );

      expect(find.text(seAdvancementCaption), findsNothing);
    });
  });

  group('_OrganizerBracketTab — Cargar resultado (M11c)', () {
    testWidgets(
      'disables Cargar when a side has no user id (guest-only side)',
      (tester) async {
        final schedule = TournamentScheduleDto(
          rounds: [
            TournamentScheduleRoundDto(
              name: 'Semifinal',
              matches: [
                TournamentScheduleMatchDto(
                  id: 'sched-5',
                  label: 'Daniel R. vs Invitado',
                  status: '',
                  matchId: 'match-5',
                  matchStatus: 'IN_PROGRESS',
                  scheduledAt: DateTime(2024, 1, 1, 11, 30),
                  courtName: 'Central',
                  sides: const [
                    TournamentScheduleMatchSideDto(sideKey: 'a', userIds: ['u1']),
                    TournamentScheduleMatchSideDto(sideKey: 'b', userIds: [null]),
                  ],
                ),
              ],
            ),
          ],
        );

        await pumpAndOpenBracketTab(tester, schedule: schedule);

        final button = tester.widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Cargar'),
        );
        expect(button.onPressed, isNull);
      },
    );

    testWidgets(
      'enables Cargar and opens ResultEntrySheet when every side has a user id',
      (tester) async {
        final schedule = TournamentScheduleDto(
          rounds: [
            TournamentScheduleRoundDto(
              name: 'Semifinal',
              matches: [
                TournamentScheduleMatchDto(
                  id: 'sched-6',
                  label: 'Daniel R. vs Luis P.',
                  status: '',
                  matchId: 'match-6',
                  matchStatus: 'IN_PROGRESS',
                  scheduledAt: DateTime(2024, 1, 1, 11, 30),
                  courtName: 'Central',
                  sides: const [
                    TournamentScheduleMatchSideDto(sideKey: 'a', userIds: ['u1']),
                    TournamentScheduleMatchSideDto(sideKey: 'b', userIds: ['u2']),
                  ],
                ),
              ],
            ),
          ],
        );

        await pumpAndOpenBracketTab(tester, schedule: schedule);

        final button = tester.widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Cargar'),
        );
        expect(button.onPressed, isNotNull);

        await tester.tap(find.widgetWithText(FilledButton, 'Cargar'));
        await tester.pumpAndSettle();

        expect(
          find.byKey(const Key('tournament.resultEntrySheet')),
          findsOneWidget,
        );
        expect(find.text('Semifinal · Central'), findsOneWidget);
      },
    );

    testWidgets(
      'submitting the sheet calls TournamentScheduleCubit.submitMatchResult',
      (tester) async {
        final schedule = TournamentScheduleDto(
          rounds: [
            TournamentScheduleRoundDto(
              name: 'Semifinal',
              matches: [
                TournamentScheduleMatchDto(
                  id: 'sched-7',
                  label: 'Daniel R. vs Luis P.',
                  status: '',
                  matchId: 'match-7',
                  matchStatus: 'IN_PROGRESS',
                  scheduledAt: DateTime(2024, 1, 1, 11, 30),
                  courtName: 'Central',
                  sides: const [
                    TournamentScheduleMatchSideDto(sideKey: 'a', userIds: ['u1']),
                    TournamentScheduleMatchSideDto(sideKey: 'b', userIds: ['u2']),
                  ],
                ),
              ],
            ),
          ],
        );
        when(
          () => scheduleCubit.submitMatchResult(
            matchId: 'match-7',
            scores: any(named: 'scores'),
          ),
        ).thenAnswer((_) async {});

        await pumpAndOpenBracketTab(tester, schedule: schedule);

        await tester.tap(find.widgetWithText(FilledButton, 'Cargar'));
        await tester.pumpAndSettle();

        await tester.tap(
          find.byKey(const Key('tournament.resultEntrySheet.submit')),
        );
        await tester.pumpAndSettle();

        verify(
          () => scheduleCubit.submitMatchResult(
            matchId: 'match-7',
            scores: const [
              TournamentScheduleMatchScoreDto(userId: 'u1', points: 0),
              TournamentScheduleMatchScoreDto(userId: 'u2', points: 0),
            ],
          ),
        ).called(1);
      },
    );
  });
}
