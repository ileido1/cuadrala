import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_invitation_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_detail_screen.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/my_tournament_match_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_schedule_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_scoreboard_dto.dart';

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
  _playerMatrix();

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
        when(
          () => repository.listMyTournamentMatches(tournamentId: 't1'),
        ).thenAnswer((_) async => const []);

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

/// One fixture per distinct visible branch, rather than a Cartesian product.
final class _PlayerCase {
  const _PlayerCase(
    this.name,
    this.identity, {
    this.status = 'OPEN',
    this.registration,
    this.invitation = false,
    this.registerError,
    this.optionalMissing = false,
    this.full = false,
    this.registering = false,
    this.tab = 'Info',
    this.loadMatches = false,
    this.failMatches = false,
    this.responseBusy = false,
    this.responseError = false,
    this.response,
    this.decision = 'PENDING',
    this.missingSlot = false,
    this.emptyMatches = false,
    this.schedule = const TournamentScheduleEmpty(),
    this.scoreboard = const TournamentScoreboardEmpty(),
    this.scrollInfo = false,
  });

  final String name;
  final String identity;
  final String status;
  final String? registration;
  final bool invitation;
  final String? registerError;
  final bool optionalMissing;
  final bool full;
  final bool registering;
  final String tab;
  final bool loadMatches;
  final bool failMatches;
  final bool responseBusy;
  final bool responseError;
  final String? response;
  final String decision;
  final bool missingSlot;
  final bool emptyMatches;
  final TournamentScheduleState schedule;
  final TournamentScoreboardState scoreboard;
  final bool scrollInfo;
}

void _playerMatrix() {
  const cases = [
    _PlayerCase(
      'invited',
      'Tenés una invitación pendiente para este torneo.',
      invitation: true,
    ),
    _PlayerCase(
      'registration_pending',
      'Esperando confirmación',
      registration: 'PENDING',
    ),
    _PlayerCase(
      'registration_error',
      'No se pudo completar la inscripción.',
      registerError: 'No se pudo completar la inscripción.',
    ),
    _PlayerCase(
      'draft_none',
      'Todavía no abrió la inscripción',
      status: 'DRAFT',
    ),
    _PlayerCase(
      'live_confirmed',
      'Inscripción confirmada',
      status: 'IN_PROGRESS',
      registration: 'CONFIRMED',
    ),
    _PlayerCase(
      'live_spectator',
      'No participás en este torneo',
      status: 'IN_PROGRESS',
    ),
    _PlayerCase('completed', 'Inscripción cerrada', status: 'COMPLETED'),
    _PlayerCase('cancelled', 'Inscripción cerrada', status: 'CANCELLED'),
    _PlayerCase('optional_missing', 'Inscribirme', optionalMissing: true),
    _PlayerCase(
      'optional_missing_rules',
      '0 · sin tope',
      optionalMissing: true,
      scrollInfo: true,
    ),
    _PlayerCase('full', '16 de 16', full: true, scrollInfo: true),
    _PlayerCase('enrollment_busy', 'Inscribirme', registering: true),
    _PlayerCase(
      'calendar_empty',
      'Todavía no hay partidos asignados.',
      registration: 'CONFIRMED',
      tab: 'Calendario',
      emptyMatches: true,
    ),
    _PlayerCase(
      'calendar_loading',
      '',
      registration: 'CONFIRMED',
      tab: 'Calendario',
      loadMatches: true,
    ),
    _PlayerCase(
      'calendar_error',
      'No se pudieron cargar tus partidos.',
      registration: 'CONFIRMED',
      tab: 'Calendario',
      failMatches: true,
    ),
    _PlayerCase(
      'calendar_unanswered',
      'Falta tu respuesta',
      registration: 'CONFIRMED',
      tab: 'Calendario',
    ),
    _PlayerCase(
      'calendar_accepted_waiting',
      'Aceptaste · faltan los demás',
      registration: 'CONFIRMED',
      tab: 'Calendario',
      response: 'ACCEPTED',
    ),
    _PlayerCase(
      'calendar_all_accepted',
      'Horario confirmado',
      registration: 'CONFIRMED',
      tab: 'Calendario',
      response: 'ACCEPTED',
      decision: 'ACCEPTED',
    ),
    _PlayerCase(
      'calendar_change_requested',
      'Cambio pedido',
      registration: 'CONFIRMED',
      tab: 'Calendario',
      response: 'REJECTED',
      decision: 'REJECTED',
    ),
    _PlayerCase(
      'calendar_missing_slot',
      'vs Se define en la ronda anterior',
      registration: 'CONFIRMED',
      tab: 'Calendario',
      missingSlot: true,
    ),
    _PlayerCase(
      'calendar_response_busy',
      'Falta tu respuesta',
      registration: 'CONFIRMED',
      tab: 'Calendario',
      responseBusy: true,
    ),
    _PlayerCase(
      'calendar_response_error',
      'No se pudo guardar tu respuesta.',
      registration: 'CONFIRMED',
      tab: 'Calendario',
      responseError: true,
    ),
    _PlayerCase(
      'spectator_empty',
      'Solo el organizador puede generar el calendario.',
      status: 'IN_PROGRESS',
      tab: 'Calendario',
    ),
    _PlayerCase(
      'spectator_loading',
      '',
      status: 'IN_PROGRESS',
      tab: 'Calendario',
      schedule: TournamentScheduleLoading(),
    ),
    _PlayerCase(
      'spectator_error',
      'No se pudo cargar el calendario.',
      status: 'IN_PROGRESS',
      tab: 'Calendario',
      schedule: TournamentScheduleError(
        message: 'No se pudo cargar el calendario.',
      ),
    ),
    _PlayerCase(
      'spectator_populated',
      'Ana vs Lucía',
      status: 'IN_PROGRESS',
      tab: 'Calendario',
      schedule: TournamentScheduleSuccess(
        schedule: TournamentScheduleDto(
          rounds: [
            TournamentScheduleRoundDto(
              name: 'Ronda 1',
              matches: [
                TournamentScheduleMatchDto(
                  id: 'slot-1',
                  label: 'Ana vs Lucía',
                  status: 'SCHEDULED',
                  courtName: 'Cancha 2',
                ),
              ],
            ),
          ],
        ),
      ),
    ),
    _PlayerCase(
      'table_empty',
      'La clasificación estará disponible cuando comience el torneo.',
      status: 'IN_PROGRESS',
      tab: 'Tabla',
    ),
    _PlayerCase(
      'table_loading',
      '',
      status: 'IN_PROGRESS',
      tab: 'Tabla',
      scoreboard: TournamentScoreboardLoading(),
    ),
    _PlayerCase(
      'table_error',
      'No se pudo cargar la tabla.',
      status: 'IN_PROGRESS',
      tab: 'Tabla',
      scoreboard: TournamentScoreboardError(
        message: 'No se pudo cargar la tabla.',
      ),
    ),
    _PlayerCase(
      'table_own_highlight_guest',
      'Ana · vos',
      registration: 'CONFIRMED',
      tab: 'Tabla',
      scoreboard: TournamentScoreboardSuccess(
        scoreboard: TournamentScoreboardDto(
          rows: [
            TournamentScoreboardRowDto(
              userId: 'me',
              name: 'Ana',
              points: 12,
              gamesPlayed: 3,
              gamesWon: 2,
              rank: 1,
            ),
            TournamentScoreboardRowDto(
              tournamentRegistrationId: 'guest',
              name: 'Lucía',
              points: 8,
              gamesPlayed: 3,
              gamesWon: 1,
              rank: 2,
            ),
          ],
        ),
      ),
    ),
    _PlayerCase(
      'table_spectator_guest_fallback',
      'Invitado',
      status: 'IN_PROGRESS',
      tab: 'Tabla',
      scoreboard: TournamentScoreboardSuccess(
        scoreboard: TournamentScoreboardDto(
          rows: [
            TournamentScoreboardRowDto(
              name: '',
              points: 8,
              gamesPlayed: 2,
              gamesWon: 1,
              rank: 1,
            ),
          ],
        ),
      ),
    ),
  ];

  for (final brightness in Brightness.values) {
    for (final scenario in cases) {
      testWidgets('should render player ${scenario.name} ${brightness.name}', (
        tester,
      ) async {
        final registrations = _Registrations();
        final schedule = _Schedule();
        final scoreboard = _Scoreboard();
        final repository = _Repository();
        final response = Completer<void>();
        final matches = <MyTournamentMatchDto>[
          if (!scenario.emptyMatches)
            MyTournamentMatchDto(
              roundNumber: 1,
              matchNumber: 1,
              partners: scenario.missingSlot ? const [] : const ['María'],
              opponents: scenario.missingSlot
                  ? const []
                  : const ['Lucía', 'Sofía'],
              scheduledAt: scenario.missingSlot
                  ? null
                  : DateTime(2026, 9, 12, 9),
              courtName: scenario.missingSlot ? null : 'Cancha 2',
              myResponse: scenario.response,
              decision: scenario.decision,
            ),
        ];
        when(
          () => repository.listMyTournamentMatches(tournamentId: 't1'),
        ).thenAnswer((_) {
          if (scenario.loadMatches) {
            return Completer<List<MyTournamentMatchDto>>().future;
          }
          if (scenario.failMatches) {
            return Future.error(StateError('Offline'));
          }
          return Future.value(matches);
        });
        when(
          () => repository.respondToTournamentSlot(
            tournamentId: 't1',
            roundNumber: 1,
            matchNumber: 1,
            response: 'ACCEPTED',
          ),
        ).thenAnswer(
          (_) => scenario.responseError
              ? Future.error(StateError('Offline'))
              : response.future,
        );
        when(() => registrations.currentUserId).thenReturn('me');
        when(() => registrations.state).thenReturn(
          TournamentRegistrationsLoaded(
            items: [
              if (scenario.registration != null)
                TournamentRegistrationDto(
                  id: 'reg-me',
                  tournamentId: 't1',
                  userId: 'me',
                  status: scenario.registration!,
                  createdAt: DateTime(2026, 9, 1),
                ),
            ],
            total: scenario.registration == null ? 0 : 1,
            registering: scenario.registering,
            registerError: scenario.registerError,
            invitations: scenario.invitation
                ? [
                    TournamentInvitationDto(
                      id: 'invite-me',
                      tournamentId: 't1',
                      invitedUserId: 'me',
                      createdByUserId: 'organizer',
                      status: 'PENDING',
                      createdAt: DateTime(2026, 9, 1),
                    ),
                  ]
                : const [],
          ),
        );
        when(() => schedule.state).thenReturn(scenario.schedule);
        when(() => scoreboard.state).thenReturn(scenario.scoreboard);
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
              tournamentsRepository: repository,
              tournament: TournamentListItemDto(
                id: 't1',
                name: 'Copa Cuádrala',
                status: scenario.status,
                sportName: 'Pádel',
                categoryId: 'cat',
                categoryName: '7ma',
                organizerUserId: 'organizer',
                organizerName: 'Carlos',
                startsAt: scenario.optionalMissing
                    ? null
                    : DateTime(2026, 9, 12, 9),
                registrationClosesAt: scenario.optionalMissing
                    ? null
                    : DateTime(2026, 9, 11, 20),
                registrationCount: scenario.optionalMissing
                    ? 0
                    : scenario.full
                    ? 16
                    : 8,
                maxSlots: scenario.optionalMissing ? null : 16,
                venueName: scenario.optionalMissing ? null : 'Club Cuádrala',
                formatPresetName: scenario.optionalMissing
                    ? null
                    : 'ROUND_ROBIN',
                inscriptionPrice: scenario.optionalMissing ? null : 15,
              ),
            ),
          ),
        );
        if (scenario.tab != 'Info') {
          await tester.tap(find.text(scenario.tab));
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 400));
        }
        await tester.pump();
        if (scenario.responseBusy || scenario.responseError) {
          await tester.tap(find.byKey(const Key('tournament.acceptSlot.1.1')));
          await tester.pump();
        }
        if (scenario.scrollInfo) {
          await tester.drag(
            find.byType(SingleChildScrollView).first,
            const Offset(0, -450),
          );
          await tester.pump(const Duration(milliseconds: 300));
        }
        // Fixed frame: pending registration and request spinners never settle.
        await tester.pump(const Duration(milliseconds: 100));
        expect(tester.takeException(), isNull);
        if (scenario.registerError != null) {
          expect(find.text(scenario.registerError!), findsOneWidget);
        }
        if (scenario.identity.isEmpty) {
          expect(find.byType(CircularProgressIndicator), findsWidgets);
        } else {
          expect(
            find.text(scenario.identity, findRichText: true),
            findsWidgets,
          );
        }
        if (scenario.responseBusy) {
          expect(find.byType(CircularProgressIndicator), findsOneWidget);
          expect(find.text('Me sirve'), findsNothing);
        }
        if (scenario.registering) {
          final button = tester.widget<FilledButton>(
            find.byKey(const Key('tournament.detail.register')),
          );
          expect(button.onPressed, isNull);
        }
        await expectLater(
          find.byKey(tournamentGoldenKey),
          matchesGoldenFile(
            'player_detail_${scenario.name}_${brightness.name}.png',
          ),
        );
      });
    }
  }
}
