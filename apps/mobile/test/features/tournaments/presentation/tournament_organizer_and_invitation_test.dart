import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_invitation_dto.dart';
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
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_invitation_screen.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/invite_guest_sheet.dart';
import 'package:cuadrala_mobile/src/shared/widgets/segmented_control.dart';

import '../handoff_copy.dart';

class _MockRegistrationsCubit extends MockCubit<TournamentRegistrationsState>
    implements TournamentRegistrationsCubit {}

class _MockScheduleCubit extends MockCubit<TournamentScheduleState>
    implements TournamentScheduleCubit {}

class _MockScoreboardCubit extends MockCubit<TournamentScoreboardState>
    implements TournamentScoreboardCubit {}

class _MockTournamentsRepository extends Mock
    implements TournamentsRepository {}

TournamentListItemDto _tournament({
  String? organizerUserId,
  String? venueName = 'Club Cuádrala',
  String? organizerName,
}) => TournamentListItemDto(
  id: 't-1',
  name: 'Copa Cuádrala',
  status: 'OPEN',
  sportName: 'Pádel',
  categoryName: 'Mixto 7ma',
  categoryId: 'cat-1',
  startsAt: DateTime(2026, 9, 12, 9),
  registrationCount: 4,
  organizerUserId: organizerUserId,
  inscriptionPrice: 12.5,
  maxSlots: 16,
  venueName: venueName,
  organizerName: organizerName,
);

TournamentRegistrationDto _registration() => TournamentRegistrationDto(
  id: 'r-1',
  tournamentId: 't-1',
  userId: 'player-1',
  userName: 'Daniel Rodríguez',
  status: 'PENDING',
  createdAt: DateTime(2026),
);

void main() {
  setUpAll(() async => initializeDateFormatting('es_ES'));

  testWidgets(
    'shows organizer tabs on the first pump when viewer role comes from Mis torneos',
    (tester) async {
      final registrationsCubit = _MockRegistrationsCubit();
      final scheduleCubit = _MockScheduleCubit();
      final scoreboardCubit = _MockScoreboardCubit();

      when(
        () => registrationsCubit.state,
      ).thenReturn(const TournamentRegistrationsInitial());
      when(() => registrationsCubit.currentUserId).thenReturn(null);
      when(
        () => scheduleCubit.state,
      ).thenReturn(const TournamentScheduleInitial());
      when(
        () => scoreboardCubit.state,
      ).thenReturn(const TournamentScoreboardEmpty());

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
            child: TournamentDetailBody(
              tournamentId: 't-1',
              tournament: _tournament(organizerUserId: null),
              viewerIsOrganizer: true,
              tournamentsRepository: _MockTournamentsRepository(),
            ),
          ),
        ),
      );
      await tester.pump();

      final tabs = find.byType(SegmentedControl<int>);
      expect(
        find.descendant(of: tabs, matching: find.text('Inscriptos')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: tabs, matching: find.text('Cuadro')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: tabs, matching: find.text('Publicar')),
        findsOneWidget,
      );
    },
  );

  testWidgets('renders the organizer segmented panel and pending counter', (
    tester,
  ) async {
    final registrationsCubit = _MockRegistrationsCubit();
    final scheduleCubit = _MockScheduleCubit();
    final scoreboardCubit = _MockScoreboardCubit();
    final repository = _MockTournamentsRepository();

    when(() => registrationsCubit.state).thenReturn(
      TournamentRegistrationsLoaded(items: [_registration()], total: 1),
    );
    when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
    when(
      () => scheduleCubit.state,
    ).thenReturn(const TournamentScheduleInitial());
    when(
      () => scoreboardCubit.state,
    ).thenReturn(const TournamentScoreboardEmpty());

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
          child: TournamentDetailBody(
            tournamentId: 't-1',
            tournament: _tournament(organizerUserId: 'organizer-1'),
            tournamentsRepository: repository,
          ),
        ),
      ),
    );
    await tester.pump();

    expect(
      find.descendant(
        //? M5b reemplazó el `TabBar` de Material por `SegmentedControl`.
        of: find.byType(SegmentedControl<int>),
        matching: find.text('Inscriptos'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byType(SegmentedControl<int>),
        matching: find.text('Cuadro'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byType(SegmentedControl<int>),
        matching: find.text('Publicar'),
      ),
      findsOneWidget,
    );
    expect(find.text('Confirmar 1 pendientes'), findsOneWidget);
    expect(find.text('Pendientes'), findsOneWidget);
  });

  testWidgets(
    'renders roster stats and only shows the green pending CTA when needed',
    (tester) async {
      final registrationsCubit = _MockRegistrationsCubit();
      final scheduleCubit = _MockScheduleCubit();
      final scoreboardCubit = _MockScoreboardCubit();

      when(() => registrationsCubit.state).thenReturn(
        TournamentRegistrationsLoaded(
          items: [
            _registration(),
            TournamentRegistrationDto(
              id: 'r-2',
              tournamentId: 't-1',
              userId: 'player-2',
              userName: 'Ana López',
              status: 'CONFIRMED',
              createdAt: DateTime(2026),
            ),
          ],
          total: 2,
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
      when(
        () => scheduleCubit.state,
      ).thenReturn(const TournamentScheduleInitial());
      when(
        () => scoreboardCubit.state,
      ).thenReturn(const TournamentScoreboardEmpty());

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
            child: TournamentDetailBody(
              tournamentId: 't-1',
              tournament: _tournament(organizerUserId: 'organizer-1'),
              tournamentsRepository: _MockTournamentsRepository(),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(
        find.byKey(const Key('tournament.organizer.stats.total')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('tournament.organizer.stats.confirmed')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('tournament.organizer.stats.pending')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('tournament.confirmPendingButton')),
        findsOneWidget,
      );
      expect(find.text('PENDIENTES'), findsOneWidget);
      expect(find.text('CONFIRMADOS'), findsOneWidget);
    },
  );

  testWidgets(
    'player invite sheet keeps the real user id and exposes the visual CTA',
    (tester) async {
      final registrationsCubit = _MockRegistrationsCubit();
      when(
        () => registrationsCubit.state,
      ).thenReturn(const TournamentRegistrationsLoaded(items: [], total: 0));
      when(() => registrationsCubit.invite(any())).thenAnswer((_) async {});

      await tester.pumpWidget(
        MaterialApp(
          home: BlocProvider<TournamentRegistrationsCubit>.value(
            value: registrationsCubit,
            child: const Scaffold(body: InvitePlayerSheet()),
          ),
        ),
      );
      await tester.pump();

      expect(
        find.byKey(const Key('tournament.invitePlayerSheet.title')),
        findsOneWidget,
      );
      expect(find.text('Le llega y decide él'), findsOneWidget);
      expect(
        find.byKey(const Key('tournament.invitePlayerSheet.submit')),
        findsOneWidget,
      );

      await tester.enterText(
        find.byKey(const Key('tournament.invitePlayerSheet.search')),
        'user-42',
      );
      await tester.pump();
      expect(
        find.descendant(
          of: find.byKey(const Key('tournament.invitePlayerSheet.result')),
          matching: find.text('user-42'),
        ),
        findsOneWidget,
      );
      await tester.tap(
        find.byKey(const Key('tournament.invitePlayerSheet.submit')),
      );

      verify(() => registrationsCubit.invite('user-42')).called(1);
    },
  );

  testWidgets(
    'renders the invitation sheet content with available tournament data',
    (tester) async {
      final registrationsCubit = _MockRegistrationsCubit();
      when(() => registrationsCubit.state).thenReturn(
        TournamentRegistrationsLoaded(
          items: const [],
          total: 0,
          invitations: [
            TournamentInvitationDto(
              id: 'i-1',
              tournamentId: 't-1',
              invitedUserId: 'player-1',
              createdByUserId: 'organizer-1',
              status: 'PENDING',
              createdAt: DateTime(2026),
            ),
          ],
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('player-1');

      await tester.pumpWidget(
        MaterialApp(
          home: BlocProvider<TournamentRegistrationsCubit>.value(
            value: registrationsCubit,
            child: TournamentInvitationBody(
              tournament: _tournament(),
              invitation:
                  (registrationsCubit.state as TournamentRegistrationsLoaded)
                      .invitations
                      .single,
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Invitación'), findsOneWidget);
      //? {org} resuelve igual que el banner del Listado: `venueName`, nunca
      //? el nombre del propio torneo (D7, `tournament_list_item_tile.dart`
      //? `_invitationOrg`).
      expect(find.text('Club Cuádrala te invitó'), findsOneWidget);
      expect(find.text('Copa Cuádrala te invitó'), findsNothing);
      expect(find.text('Rechazar'), findsOneWidget);
      expect(find.text('Aceptar'), findsOneWidget);
      expect(find.text('NIVEL'), findsOneWidget);
      expect(find.text('DÓNDE'), findsOneWidget);
    },
  );

  testWidgets(
    'invitation banner falls back to the organizer name with no venue',
    (tester) async {
      final registrationsCubit = _MockRegistrationsCubit();
      when(() => registrationsCubit.state).thenReturn(
        TournamentRegistrationsLoaded(
          items: const [],
          total: 0,
          invitations: [
            TournamentInvitationDto(
              id: 'i-1',
              tournamentId: 't-1',
              invitedUserId: 'player-1',
              createdByUserId: 'organizer-1',
              status: 'PENDING',
              createdAt: DateTime(2026),
            ),
          ],
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('player-1');

      await tester.pumpWidget(
        MaterialApp(
          home: BlocProvider<TournamentRegistrationsCubit>.value(
            value: registrationsCubit,
            child: TournamentInvitationBody(
              tournament: _tournament(
                venueName: null,
                organizerName: 'Juan Pérez',
              ),
              invitation:
                  (registrationsCubit.state as TournamentRegistrationsLoaded)
                      .invitations
                      .single,
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Juan Pérez te invitó'), findsOneWidget);
    },
  );

  testWidgets(
    'org Inscriptos shows Rechazó for rejected invitations and invitee names, '
    'not filtered out',
    (tester) async {
      final registrationsCubit = _MockRegistrationsCubit();
      final scheduleCubit = _MockScheduleCubit();
      final scoreboardCubit = _MockScoreboardCubit();
      final repository = _MockTournamentsRepository();

      when(() => registrationsCubit.state).thenReturn(
        TournamentRegistrationsLoaded(
          items: const [],
          total: 0,
          canManageInvitations: true,
          invitations: [
            TournamentInvitationDto(
              id: 'inv-pending',
              tournamentId: 't-1',
              invitedUserId: 'user-pending',
              invitedUserName: 'Ana López',
              createdByUserId: 'organizer-1',
              status: 'PENDING',
              createdAt: DateTime(2026),
            ),
            TournamentInvitationDto(
              id: 'inv-rejected',
              tournamentId: 't-1',
              invitedUserId: 'user-rejected',
              invitedUserName: 'Carlos Ruiz',
              createdByUserId: 'organizer-1',
              status: 'REJECTED',
              createdAt: DateTime(2026),
            ),
          ],
        ),
      );
      when(() => registrationsCubit.currentUserId).thenReturn('organizer-1');
      when(
        () => scheduleCubit.state,
      ).thenReturn(const TournamentScheduleInitial());
      when(
        () => scoreboardCubit.state,
      ).thenReturn(const TournamentScoreboardEmpty());

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
            child: TournamentDetailBody(
              tournamentId: 't-1',
              tournament: _tournament(organizerUserId: 'organizer-1'),
              tournamentsRepository: repository,
            ),
          ),
        ),
      );
      await tester.pump();

      //? Rejected invitations render "Rechazó" instead of being filtered
      //? out of "Invitaciones enviadas" (spec "Org Inscriptos — grouping and
      //? per-row actions" cross-reference; M10b).
      expect(find.text('Ana López'), findsOneWidget);
      expect(find.text('Carlos Ruiz'), findsOneWidget);
      expect(find.text(sentInvitationStatusLabel(true)), findsOneWidget);
      expect(find.text(sentInvitationStatusLabel(false)), findsOneWidget);
    },
  );
}
