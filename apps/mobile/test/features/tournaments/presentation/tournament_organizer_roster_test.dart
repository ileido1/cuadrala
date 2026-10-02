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
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/invite_guest_sheet.dart';

class _Registrations extends MockCubit<TournamentRegistrationsState>
    implements TournamentRegistrationsCubit {}

class _Schedule extends MockCubit<TournamentScheduleState>
    implements TournamentScheduleCubit {}

class _Scoreboard extends MockCubit<TournamentScoreboardState>
    implements TournamentScoreboardCubit {}

class _Repository extends Mock implements TournamentsRepository {}

TournamentRegistrationDto _registration({
  required String id,
  required String name,
  required String status,
  String? partnerId,
  String? sportCategoryName,
}) => TournamentRegistrationDto(
  id: id,
  tournamentId: 't-1',
  userId: 'user-$id',
  userName: name,
  status: status,
  createdAt: DateTime(2026, 9, 1),
  partnerRegistrationId: partnerId,
  sportCategoryName: sportCategoryName,
);

TournamentInvitationDto _invitation() => TournamentInvitationDto(
  id: 'inv-1',
  tournamentId: 't-1',
  invitedUserId: 'invitee-1',
  invitedUserName: 'Invitado Uno',
  createdByUserId: 'org-1',
  status: 'PENDING',
  createdAt: DateTime(2026, 9, 1),
);

Future<void> _pumpOrganizer(
  WidgetTester tester, {
  required String status,
  required List<TournamentRegistrationDto> registrations,
  bool paired = false,
  List<TournamentInvitationDto> invitations = const [],
}) async {
  final roster = _Registrations();
  final schedule = _Schedule();
  final scoreboard = _Scoreboard();
  when(() => roster.currentUserId).thenReturn('org-1');
  when(() => roster.isCurrentUserRegistered).thenReturn(false);
  when(() => roster.state).thenReturn(
    TournamentRegistrationsLoaded(
      items: registrations,
      total: registrations.length,
      invitations: invitations,
      canManageInvitations: true,
    ),
  );
  when(() => schedule.state).thenReturn(const TournamentScheduleInitial());
  when(() => scoreboard.state).thenReturn(const TournamentScoreboardEmpty());
  await tester.pumpWidget(
    MaterialApp(
      home: MultiBlocProvider(
        providers: [
          BlocProvider<TournamentRegistrationsCubit>.value(value: roster),
          BlocProvider<TournamentScheduleCubit>.value(value: schedule),
          BlocProvider<TournamentScoreboardCubit>.value(value: scoreboard),
        ],
        child: TournamentDetailBody(
          tournamentId: 't-1',
          tournament: TournamentListItemDto(
            id: 't-1',
            name: 'Copa Cuádrala',
            status: status,
            sportName: 'Pádel',
            categoryId: 'cat-1',
            categoryName: 'Mixto 7ma',
            startsAt: DateTime(2026, 9, 12, 9),
            registrationCount: registrations.length,
            organizerUserId: 'org-1',
            pairedRegistration: paired,
            maxSlots: 16,
          ),
          tournamentsRepository: _Repository(),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() async => initializeDateFormatting('es_ES'));

  testWidgets('paired roster keeps individual Inscritos next to Duplas', (
    tester,
  ) async {
    await _pumpOrganizer(
      tester,
      status: 'OPEN',
      paired: true,
      registrations: [
        _registration(
          id: 'one',
          name: 'Ana Uno',
          status: 'CONFIRMED',
          partnerId: 'two',
        ),
        _registration(
          id: 'two',
          name: 'Beto Dos',
          status: 'CONFIRMED',
          partnerId: 'one',
        ),
      ],
    );

    expect(find.byKey(const Key('tournament.pairingSection')), findsOneWidget);
    expect(
      find.byKey(const Key('tournament.registrationTile.one')),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('tournament.registrationTile.two')),
      findsOneWidget,
    );
  });

  testWidgets('does not claim everyone was notified when the roster is empty', (
    tester,
  ) async {
    await _pumpOrganizer(tester, status: 'OPEN', registrations: []);

    expect(
      find.text('Todos confirmados. Cada uno ya recibió su aviso.'),
      findsNothing,
    );
    expect(find.text('Inscritos'), findsNWidgets(2));
    expect(find.text('0'), findsNWidgets(3));
  });

  testWidgets(
    'locked roster keeps read-only counts and rows but hides mutations',
    (tester) async {
      await _pumpOrganizer(
        tester,
        status: 'IN_PROGRESS',
        registrations: [
          _registration(
            id: 'pending',
            name: 'Pendiente Uno',
            status: 'PENDING',
          ),
          _registration(
            id: 'confirmed',
            name: 'Confirmado Uno',
            status: 'CONFIRMED',
          ),
        ],
        invitations: [_invitation()],
      );

      expect(find.text('Roster bloqueado'), findsOneWidget);
      expect(
        find.byKey(const Key('tournament.organizer.stats.total')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('tournament.registrationTile.pending')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('tournament.registrationTile.confirmed')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('tournament.confirmPendingButton')),
        findsNothing,
      );
      expect(
        find.byKey(const Key('tournament.confirmRegistration.pending')),
        findsNothing,
      );
      expect(
        find.byKey(const Key('tournament.removeRegistration.pending')),
        findsNothing,
      );
      expect(
        find.byKey(const Key('tournament.inviteGuestButton')),
        findsNothing,
      );
      expect(
        find.byKey(const Key('tournament.invitePlayerButton')),
        findsNothing,
      );
      await tester.drag(find.byType(ListView).last, const Offset(0, -700));
      await tester.pumpAndSettle();
      expect(find.text('Cancelar invitación'), findsNothing);
    },
  );

  testWidgets(
    'organizer roster displays the current player sport category',
    (tester) async {
      await _pumpOrganizer(
        tester,
        status: 'OPEN',
        registrations: [
          _registration(
            id: 'categorized',
            name: 'Ana Uno',
            status: 'CONFIRMED',
            sportCategoryName: 'Avanzado',
          ),
        ],
      );

      expect(find.text('Categoría: Avanzado'), findsOneWidget);
    },
  );

  testWidgets(
    'roster rows do not display tournament category as player category',
    (tester) async {
      await _pumpOrganizer(
        tester,
        status: 'OPEN',
        registrations: [
          _registration(id: 'one', name: 'Ana Uno', status: 'CONFIRMED'),
        ],
      );

      expect(
        find.descendant(
          of: find.byKey(const Key('tournament.registrationTile.one')),
          matching: find.text('Mixto 7ma'),
        ),
        findsNothing,
      );
    },
  );

  testWidgets('Sin cuenta sheet allows an omitted email', (tester) async {
    final cubit = _Registrations();
    when(
      () => cubit.state,
    ).thenReturn(const TournamentRegistrationsLoaded(items: [], total: 0));
    when(
      () => cubit.inviteGuest(name: 'Rafa Sosa', phone: null, email: null),
    ).thenAnswer((_) async {});

    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider<TournamentRegistrationsCubit>.value(
          value: cubit,
          child: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () => showInviteGuestSheet(context),
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('tournament.inviteGuestSheet.name')),
      'Rafa Sosa',
    );
    expect(find.text('Agregar sin cuenta'), findsOneWidget);
    expect(find.text('Email (opcional)'), findsOneWidget);
    await tester.tap(
      find.byKey(const Key('tournament.inviteGuestSheet.submit')),
    );
    await tester.pump();

    verify(
      () => cubit.inviteGuest(name: 'Rafa Sosa', phone: null, email: null),
    ).called(1);
  });
}
