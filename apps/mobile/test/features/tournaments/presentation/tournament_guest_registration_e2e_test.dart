// Phase 5 (tournament-guest-registration): mobile end-to-end closure test.
//
// Unlike the per-widget/per-cubit tests added in Phase 4
// (`tournament_registrations_cubit_test.dart`, `tournament_detail_screen_test.dart`), this
// file wires a REAL `TournamentRegistrationsCubit` (not a `MockCubit`) to a mocked
// `TournamentsRepository`/`ProfileRepository`, and pumps it into the real
// `TournamentDetailBody` widget tree. Only the network boundary (repository) is faked — state
// management and rendering are the genuine production code, driven through real user
// interactions (tap "Invitar huésped", fill the sheet, submit, tap confirm/remove). This is
// the closest equivalent to T21's "full guest lifecycle" and T22's "guest-only roster" at the
// mobile layer, since this repo has no full-stack (real HTTP) Flutter integration harness.
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_invitation_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_detail_screen.dart';

class _MockTournamentsRepository extends Mock implements TournamentsRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockScheduleCubit extends MockCubit<TournamentScheduleState> implements TournamentScheduleCubit {}

class _MockScoreboardCubit extends MockCubit<TournamentScoreboardState> implements TournamentScoreboardCubit {}

const _tournamentId = 't-e2e-1';
const _organizerId = 'organizer-e2e-1';

TournamentRegistrationDto _authRegistration({String id = 'reg-auth-1', String userId = 'user-2'}) =>
    TournamentRegistrationDto(
      id: id,
      tournamentId: _tournamentId,
      userId: userId,
      status: 'CONFIRMED',
      createdAt: DateTime(2024),
    );

TournamentRegistrationDto _guestRegistration({
  required String id,
  required String name,
  String status = 'PENDING',
}) =>
    TournamentRegistrationDto(
      id: id,
      tournamentId: _tournamentId,
      status: status,
      createdAt: DateTime(2024),
      registrationType: 'GUEST',
      guestName: name,
      registeredByUserId: _organizerId,
    );

Widget _buildTestApp({
  required TournamentRegistrationsCubit registrationsCubit,
  required TournamentScheduleCubit scheduleCubit,
  required TournamentScoreboardCubit scoreboardCubit,
  required TournamentListItemDto tournament,
}) {
  final router = GoRouter(
    initialLocation: '/tournaments/$_tournamentId',
    routes: [
      GoRoute(
        path: '/tournaments/$_tournamentId',
        builder: (context, _) => MultiBlocProvider(
          providers: [
            BlocProvider<TournamentRegistrationsCubit>.value(value: registrationsCubit),
            BlocProvider<TournamentScheduleCubit>.value(value: scheduleCubit),
            BlocProvider<TournamentScoreboardCubit>.value(value: scoreboardCubit),
          ],
          child: TournamentDetailBody(tournamentId: _tournamentId, tournament: tournament),
        ),
      ),
    ],
  );
  return MaterialApp.router(routerConfig: router);
}

/// Se resuelve desde la constante de la pantalla: la etiqueta ya se renombró
/// dos veces y cada vez dejó esta suite en rojo.
Finder get _registrationsTab =>
    find.text(tournamentDetailTabLabels[tournamentRegistrationsTabIndex]);

void main() {
  late _MockTournamentsRepository tournamentsRepository;
  late _MockProfileRepository profileRepository;
  late _MockScheduleCubit scheduleCubit;
  late _MockScoreboardCubit scoreboardCubit;

  setUpAll(() async {
    await initializeDateFormatting('es_ES');
  });

  setUp(() {
    tournamentsRepository = _MockTournamentsRepository();
    profileRepository = _MockProfileRepository();
    scheduleCubit = _MockScheduleCubit();
    scoreboardCubit = _MockScoreboardCubit();

    when(() => profileRepository.getMe()).thenAnswer(
      (_) async => const UserMeDto(id: _organizerId, email: 'organizer@test.com', name: 'Organizer', subscriptionType: 'FREE'),
    );
    when(() => scheduleCubit.state).thenReturn(const TournamentScheduleEmpty());
    when(() => scoreboardCubit.state).thenReturn(const TournamentScoreboardEmpty());
    when(() => tournamentsRepository.listInvitations(tournamentId: _tournamentId))
        .thenAnswer((_) async => const <TournamentInvitationDto>[]);
  });

  group('T21/T22 (mobile) — full guest lifecycle through the real cubit + widget tree', () {
    testWidgets(
      'organizer invites a guest via the UI, sees PENDING, confirms it, then removes it — cubit refreshes the roster each step',
      (tester) async {
        final tournament = TournamentListItemDto(
          id: _tournamentId,
          name: 'Torneo E2E Móvil',
          status: 'DRAFT',
          sportName: 'Pádel',
          categoryName: 'Mixto',
          startsAt: null,
          registrationCount: 1,
          organizerUserId: _organizerId,
        );

        //? Roster starts with just one authenticated player.
        when(() => tournamentsRepository.listRegistrations(tournamentId: _tournamentId))
            .thenAnswer((_) async => [_authRegistration()]);

        final cubit = TournamentRegistrationsCubit(
          tournamentsRepository: tournamentsRepository,
          profileRepository: profileRepository,
          tournamentId: _tournamentId,
        );

        await tester.pumpWidget(_buildTestApp(
          registrationsCubit: cubit,
          scheduleCubit: scheduleCubit,
          scoreboardCubit: scoreboardCubit,
          tournament: tournament,
        ));
        await cubit.load();
        await tester.pumpAndSettle();

        await tester.tap(_registrationsTab);
        await tester.pumpAndSettle();

        //? Organizer-only invite button is visible (currentUserId == organizerUserId).
        expect(find.byKey(const Key('tournament.inviteGuestButton')), findsOneWidget);

        //? --- Invite Alice ---------------------------------------------------
        final alicePending = _guestRegistration(id: 'reg-alice', name: 'Alice');
        when(
          () => tournamentsRepository.inviteGuestToTournament(
            tournamentId: _tournamentId,
            name: 'Alice',
            phone: null,
            email: null,
          ),
        ).thenAnswer((_) async => alicePending);
        //? After a successful invite, the cubit reloads the roster.
        when(() => tournamentsRepository.listRegistrations(tournamentId: _tournamentId))
            .thenAnswer((_) async => [_authRegistration(), alicePending]);

        await tester.tap(find.byKey(const Key('tournament.inviteGuestButton')));
        await tester.pumpAndSettle();

        await tester.enterText(find.byKey(const Key('tournament.inviteGuestSheet.name')), 'Alice');
        await tester.tap(find.byKey(const Key('tournament.inviteGuestSheet.submit')));
        await tester.pumpAndSettle();

        verify(
          () => tournamentsRepository.inviteGuestToTournament(
            tournamentId: _tournamentId,
            name: 'Alice',
            phone: null,
            email: null,
          ),
        ).called(1);

        //? Alice now shows in the "Invitados" group as PENDING.
        //? `skipOffstage: false` because these tiles live inside the TabBarView's
        //? registrations page, whose RenderBox transform can be temporarily
        //? unresolvable to the default onstage check right after a tab switch +
        //? bottom-sheet pop in the same pumpAndSettle cycle, even though the
        //? widgets are genuinely built with the right data (confirmed via
        //? `tester.allWidgets` during triage).
        expect(find.text('Invitados', skipOffstage: false), findsOneWidget);
        expect(find.text('Alice', skipOffstage: false), findsOneWidget);
        expect(find.text('Pendiente', skipOffstage: false), findsOneWidget);

        //? --- Confirm Alice ----------------------------------------------------
        final aliceConfirmed = _guestRegistration(id: 'reg-alice', name: 'Alice', status: 'CONFIRMED');
        when(
          () => tournamentsRepository.confirmRegistration(
            tournamentId: _tournamentId,
            registrationId: 'reg-alice',
          ),
        ).thenAnswer((_) async => aliceConfirmed);
        when(() => tournamentsRepository.listRegistrations(tournamentId: _tournamentId))
            .thenAnswer((_) async => [_authRegistration(), aliceConfirmed]);

        //? `skipOffstage: false` — see the note on the earlier `find.text` calls in this test.
        //? `ensureVisible` — this tile lives below the fold of the fixed 800x600 test surface
        //? inside the tab's scroll view; `tap()` needs a real, in-viewport hit-test point.
        final confirmFinder =
            find.byKey(const Key('tournament.confirmRegistration.reg-alice'), skipOffstage: false);
        await tester.ensureVisible(confirmFinder);
        await tester.pumpAndSettle();
        await tester.tap(confirmFinder);
        await tester.pumpAndSettle();

        verify(
          () => tournamentsRepository.confirmRegistration(
            tournamentId: _tournamentId,
            registrationId: 'reg-alice',
          ),
        ).called(1);
        expect(find.text('Confirmado', skipOffstage: false), findsNWidgets(2));
        expect(find.text('Pendiente'), findsNothing);

        //? --- Remove Alice (behind the AlertDialog confirm) ---------------------
        when(
          () => tournamentsRepository.removeRegistration(
            tournamentId: _tournamentId,
            registrationId: 'reg-alice',
          ),
        ).thenAnswer((_) async {});
        when(() => tournamentsRepository.listRegistrations(tournamentId: _tournamentId))
            .thenAnswer((_) async => [_authRegistration()]);

        final removeFinder =
            find.byKey(const Key('tournament.removeRegistration.reg-alice'), skipOffstage: false);
        await tester.ensureVisible(removeFinder);
        await tester.pumpAndSettle();
        await tester.tap(removeFinder);
        await tester.pumpAndSettle();
        expect(find.text('Eliminar jugador'), findsOneWidget);
        await tester.tap(find.text('Eliminar').last);
        await tester.pumpAndSettle();

        verify(
          () => tournamentsRepository.removeRegistration(
            tournamentId: _tournamentId,
            registrationId: 'reg-alice',
          ),
        ).called(1);
        expect(find.text('Alice'), findsNothing);
        expect(find.text('Invitados'), findsNothing);
      },
    );

    testWidgets(
      'guest-only roster (0 authenticated players) renders correctly and organizer actions stay hidden once IN_PROGRESS',
      (tester) async {
        final tournament = TournamentListItemDto(
          id: _tournamentId,
          name: 'Torneo Solo Invitados',
          status: 'IN_PROGRESS',
          sportName: 'Pádel',
          categoryName: 'Mixto',
          startsAt: null,
          registrationCount: 4,
          organizerUserId: _organizerId,
        );

        //? El roster es un ListView (perezoso): con la ventana por defecto el
        //? cuarto invitado nunca se construye y `skipOffstage: false` no
        //? alcanza, porque no está oculto sino ausente del árbol. Se agranda la
        //? superficie para que los cuatro entren y la aserción diga lo que dice.
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.reset);

        final guests = [
          _guestRegistration(id: 'reg-g1', name: 'Guest A', status: 'CONFIRMED'),
          _guestRegistration(id: 'reg-g2', name: 'Guest B', status: 'CONFIRMED'),
          _guestRegistration(id: 'reg-g3', name: 'Guest C', status: 'CONFIRMED'),
          _guestRegistration(id: 'reg-g4', name: 'Guest D', status: 'CONFIRMED'),
        ];
        when(() => tournamentsRepository.listRegistrations(tournamentId: _tournamentId))
            .thenAnswer((_) async => guests);

        final cubit = TournamentRegistrationsCubit(
          tournamentsRepository: tournamentsRepository,
          profileRepository: profileRepository,
          tournamentId: _tournamentId,
        );

        await tester.pumpWidget(_buildTestApp(
          registrationsCubit: cubit,
          scheduleCubit: scheduleCubit,
          scoreboardCubit: scoreboardCubit,
          tournament: tournament,
        ));
        await cubit.load();
        await tester.pumpAndSettle();

        await tester.tap(_registrationsTab);
        await tester.pumpAndSettle();

        //? All 4 guests render, none has a real userId (isGuest / displayName getters).
        //? `skipOffstage: false` — see the note on the first testWidgets in this file.
        for (final guest in guests) {
          expect(find.text(guest.guestName!, skipOffstage: false), findsOneWidget);
          expect(guest.userId, isNull);
          expect(guest.isGuest, isTrue);
        }

        //? Backend guard mirrored client-side: invite/confirm/remove hidden once IN_PROGRESS.
        expect(find.byKey(const Key('tournament.inviteGuestButton')), findsNothing);
        for (final guest in guests) {
          expect(find.byKey(Key('tournament.confirmRegistration.${guest.id}')), findsNothing);
          expect(find.byKey(Key('tournament.removeRegistration.${guest.id}')), findsNothing);
        }
      },
    );
  });
}
