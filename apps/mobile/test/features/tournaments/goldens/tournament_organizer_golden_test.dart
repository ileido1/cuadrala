import 'dart:async';
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

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_invitation_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_scoreboard_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_publish_cubit.dart';

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
  _organizerMatrix();

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
          if (locked) {
            expect(
              find.byKey(const Key('tournament.confirmPendingButton')),
              findsNothing,
            );
            expect(
              find.byKey(const Key('tournament.confirmRegistration.two')),
              findsNothing,
            );
            expect(
              find.byKey(const Key('tournament.removeRegistration.one')),
              findsNothing,
            );
            expect(
              find.byKey(const Key('tournament.inviteGuestButton')),
              findsNothing,
            );
          }
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

TournamentRegistrationDto _guest(String id, {String? phone, String? email}) =>
    TournamentRegistrationDto(
      id: id,
      tournamentId: 't1',
      status: 'CONFIRMED',
      createdAt: DateTime(2026, 9, 1),
      registrationType: 'GUEST',
      guestName: 'Invitado $id',
      guestPhone: phone,
      guestEmail: email,
    );

TournamentRegistrationDto _paired(String id, String partner) =>
    TournamentRegistrationDto(
      id: id,
      tournamentId: 't1',
      userId: 'user-$id',
      userName: 'Jugador $id',
      status: 'CONFIRMED',
      partnerRegistrationId: partner,
      createdAt: DateTime(2026, 9, 1),
    );

TournamentInvitationDto _invitation(String id, String status) =>
    TournamentInvitationDto(
      id: id,
      tournamentId: 't1',
      invitedUserId: 'user-$id',
      invitedUserName: 'Invitado $id',
      createdByUserId: 'org',
      status: status,
      createdAt: DateTime(2026, 9, 1),
    );

final _confirmed = [
  _registration('one', 'Ana Uno', 'CONFIRMED'),
  _registration('two', 'Beto Dos', 'CONFIRMED'),
];

TournamentRegistrationsLoaded _loaded({
  List<TournamentRegistrationDto>? items,
  List<TournamentInvitationDto> invitations = const [],
  String? busy,
  String? error,
  bool inviting = false,
  bool invitingGuest = false,
  String? guestError,
  String? inviteError,
}) => TournamentRegistrationsLoaded(
  items: items ?? _confirmed,
  total: (items ?? _confirmed).length,
  canManageInvitations: true,
  invitations: invitations,
  busyRegistrationId: busy,
  registrationActionError: error,
  inviting: inviting,
  invitingGuest: invitingGuest,
  guestInviteError: guestError,
  invitationError: inviteError,
);

const _scoreboard = TournamentScoreboardSuccess(
  scoreboard: TournamentScoreboardDto(
    rows: [
      TournamentScoreboardRowDto(
        tournamentRegistrationId: 'guest',
        name: 'Invitada Lucía',
        rank: 1,
        points: 6,
        gamesPlayed: 1,
        gamesWon: 1,
      ),
      TournamentScoreboardRowDto(
        userId: 'user-one',
        name: 'Ana Uno',
        rank: 2,
        points: 3,
        gamesPlayed: 1,
      ),
    ],
  ),
);

const _finished = TournamentScheduleMatchDto(
  id: 'done',
  label: 'Invitada Lucía vs Ana Uno',
  status: 'SCHEDULED',
  matchId: 'match-done',
  matchStatus: 'FINISHED',
  sides: [
    TournamentScheduleMatchSideDto(
      sideKey: 'guest',
      userIds: [null],
      registrationIds: ['guest'],
    ),
    TournamentScheduleMatchSideDto(
      sideKey: 'Ana',
      userIds: ['user-one'],
      registrationIds: ['one'],
    ),
  ],
  scores: [
    TournamentScheduleMatchScoreDto(
      tournamentRegistrationId: 'guest',
      points: 6,
    ),
    TournamentScheduleMatchScoreDto(tournamentRegistrationId: 'one', points: 3),
  ],
);

const _matches = TournamentScheduleSuccess(
  schedule: TournamentScheduleDto(
    rounds: [
      TournamentScheduleRoundDto(
        name: 'Ronda 1',
        matches: [
          TournamentScheduleMatchDto(
            id: 'pending',
            label: 'Beto Dos vs Carla Tres',
            status: 'SCHEDULED',
            matchStatus: 'SCHEDULED',
            matchId: 'match-pending',
          ),
          TournamentScheduleMatchDto(
            id: 'live',
            label: 'Ana Uno vs Beto Dos',
            status: 'SCHEDULED',
            matchStatus: 'IN_PROGRESS',
            matchId: 'match-live',
          ),
          _finished,
        ],
      ),
    ],
  ),
);

Future<void> _pumpOrganizer(
  WidgetTester tester,
  Brightness brightness, {
  required TournamentRegistrationsState registrationsState,
  TournamentScheduleState scheduleState = const TournamentScheduleEmpty(),
  TournamentScoreboardState scoreboardState = const TournamentScoreboardEmpty(),
  String status = 'OPEN',
  String visibility = 'PUBLIC',
  String format = 'SINGLE_ELIMINATION',
  bool paired = false,
  _Repository? repository,
}) async {
  final registrations = _Registrations();
  final schedule = _Schedule();
  final scoreboard = _Scoreboard();
  when(() => registrations.currentUserId).thenReturn('org');
  when(() => registrations.state).thenReturn(registrationsState);
  when(() => schedule.state).thenReturn(scheduleState);
  when(() => scoreboard.state).thenReturn(scoreboardState);
  addTearDown(registrations.close);
  addTearDown(schedule.close);
  addTearDown(scoreboard.close);
  await pumpTournamentGolden(
    tester,
    brightness: brightness,
    child: MultiBlocProvider(
      providers: [
        BlocProvider<TournamentRegistrationsCubit>.value(value: registrations),
        BlocProvider<TournamentScheduleCubit>.value(value: schedule),
        BlocProvider<TournamentScoreboardCubit>.value(value: scoreboard),
      ],
      child: TournamentDetailBody(
        tournamentId: 't1',
        viewerIsOrganizer: true,
        tournament: TournamentListItemDto(
          id: 't1',
          name: 'Copa Cuádrala',
          status: status,
          sportName: 'Pádel',
          categoryId: 'cat',
          categoryName: 'Mixto 7ma',
          startsAt: DateTime(2026, 9, 12, 9),
          registrationCount: 2,
          organizerUserId: 'org',
          organizerName: 'Organizador',
          visibility: visibility,
          pairedRegistration: paired,
          formatPresetName: format,
        ),
        tournamentsRepository: repository ?? _Repository(),
      ),
    ),
  );
}

Future<void> _capture(
  WidgetTester tester,
  String name,
  Brightness brightness, {
  bool modal = false,
}) async {
  expect(tester.takeException(), isNull);
  await expectLater(
    modal ? find.byType(Overlay).first : find.byKey(tournamentGoldenKey),
    matchesGoldenFile('organizer_${name}_${brightness.name}.png'),
  );
  expect(tester.takeException(), isNull);
}

void _organizerMatrix() {
  for (final brightness in Brightness.values) {
    final rosterCases =
        <
          String,
          ({
            TournamentRegistrationsState state,
            String identity,
            bool paired,
            String status,
          })
        >{
          'draft': (
            state: _loaded(),
            identity: 'Borrador: nadie se puede anotar solo',
            paired: false,
            status: 'DRAFT',
          ),
          'empty': (
            state: _loaded(items: []),
            identity:
                'Aún no hay participantes. ¡Compartí el torneo para que más jugadores se inscriban!',
            paired: false,
            status: 'OPEN',
          ),
          'confirmed': (
            state: _loaded(),
            identity: 'Todos confirmados. Cada uno ya recibió su aviso.',
            paired: false,
            status: 'OPEN',
          ),
          'guests': (
            state: _loaded(
              items: [
                _guest('tel', phone: '+58 412 1234567'),
                _guest('email', email: 'invitado@example.com'),
                _guest('none'),
              ],
            ),
            identity: 'Sin teléfono ni email',
            paired: false,
            status: 'OPEN',
          ),
          'paired': (
            state: _loaded(
              items: [_paired('one', 'two'), _paired('two', 'one')],
            ),
            identity: 'En dupla',
            paired: true,
            status: 'OPEN',
          ),
          'busy': (
            state: _loaded(
              items: [_registration('one', 'Ana Uno', 'PENDING')],
              busy: 'one',
            ),
            identity: 'Confirmar 1 pendientes',
            paired: false,
            status: 'OPEN',
          ),
          'action_error': (
            state: _loaded(error: 'No se pudo confirmar al inscrito.'),
            identity: 'No se pudo confirmar al inscrito.',
            paired: false,
            status: 'OPEN',
          ),
          'error': (
            state: const TournamentRegistrationsFailure(
              message: 'No se pudieron cargar los inscritos.',
            ),
            identity: 'No se pudieron cargar los inscritos.',
            paired: false,
            status: 'OPEN',
          ),
        };
    for (final entry in rosterCases.entries) {
      testWidgets('should render Inscritos ${entry.key} ${brightness.name}', (
        tester,
      ) async {
        final scenario = entry.value;
        await _pumpOrganizer(
          tester,
          brightness,
          registrationsState: scenario.state,
          paired: scenario.paired,
          status: scenario.status,
        );
        expect(find.text(scenario.identity), findsWidgets);
        await _capture(tester, 'roster_${entry.key}', brightness);
      });
    }
    testWidgets('should render Inscritos loading ${brightness.name}', (
      tester,
    ) async {
      await _pumpOrganizer(
        tester,
        brightness,
        registrationsState: const TournamentRegistrationsLoading(),
      );
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      await _capture(tester, 'roster_loading', brightness);
    });
    for (final busy in [false, true]) {
      testWidgets(
        'should render lower invitations busy=$busy ${brightness.name}',
        (tester) async {
          await _pumpOrganizer(
            tester,
            brightness,
            registrationsState: _loaded(
              invitations: [
                _invitation('pending', 'PENDING'),
                _invitation('rejected', 'REJECTED'),
              ],
              inviting: busy,
            ),
          );
          await tester.scrollUntilVisible(
            find.byKey(const Key('tournament.sentInvitation.rejected')),
            180,
            scrollable: find.byType(Scrollable).last,
          );
          await tester.pump(const Duration(milliseconds: 300));
          expect(
            find.byKey(const Key('tournament.sentInvitation.pending')),
            findsOneWidget,
          );
          expect(
            find.byKey(const Key('tournament.sentInvitation.rejected')),
            findsOneWidget,
          );
          await _capture(
            tester,
            'invitations_${busy ? 'busy' : 'sent'}',
            brightness,
          );
        },
      );
    }
    for (final busy in [false, true]) {
      testWidgets('should render lower Duplas busy=$busy ${brightness.name}', (
        tester,
      ) async {
        await _pumpOrganizer(
          tester,
          brightness,
          paired: true,
          registrationsState: _loaded(
            items: [
              _paired('one', 'two'),
              _paired('two', 'one'),
              _registration('three', 'Carla Tres', 'CONFIRMED'),
            ],
            busy: busy ? 'one' : null,
          ),
        );
        await tester.scrollUntilVisible(
          find.byKey(const Key('tournament.unpaired.three')),
          180,
          scrollable: find.byType(Scrollable).last,
        );
        await tester.pump(const Duration(milliseconds: 300));
        expect(find.text('DUPLAS'), findsOneWidget);
        expect(find.text('Sin pareja (1)'), findsOneWidget);
        await _capture(tester, 'duplas_${busy ? 'busy' : 'lower'}', brightness);
      });
    }

    final cuadroCases =
        <String, ({TournamentScheduleState state, String? identity})>{
          'insufficient': (
            state: const TournamentScheduleEmpty(),
            identity: 'Generar el cuadro',
          ),
          'enabled': (
            state: const TournamentScheduleEmpty(),
            identity: 'Generar cuadro y horarios',
          ),
          'pending_warning': (
            state: const TournamentScheduleEmpty(),
            identity: '1 sin confirmar quedan fuera',
          ),
          'loading': (state: const TournamentScheduleLoading(), identity: null),
          'generating': (
            state: const TournamentScheduleGenerating(),
            identity: null,
          ),
          'error': (
            state: const TournamentScheduleError(
              message: 'No se pudo generar el cuadro.',
            ),
            identity: 'No se pudo generar el cuadro.',
          ),
          'conflict': (
            state: const TournamentScheduleConflict(),
            identity: 'Cuadro generado',
          ),
          'standings': (state: _matches, identity: 'PRIMERAS RONDAS'),
          'unsupported': (
            state: const TournamentScheduleUnsupported(),
            identity:
                'La clasificación estará disponible cuando comience el torneo.',
          ),
          'gpk_transition': (
            state: const TournamentScheduleSuccess(
              schedule: TournamentScheduleDto(
                rounds: [
                  TournamentScheduleRoundDto(
                    name: 'Grupo A',
                    matches: [_finished],
                  ),
                  TournamentScheduleRoundDto(
                    name: 'Semifinales',
                    matches: [
                      TournamentScheduleMatchDto(
                        id: 'semi',
                        label: 'Por definir',
                        status: 'SCHEDULED',
                      ),
                    ],
                  ),
                  TournamentScheduleRoundDto(name: 'Final', matches: []),
                ],
              ),
            ),
            identity: 'Fase de grupos finalizada',
          ),
        };
    for (final entry in cuadroCases.entries) {
      testWidgets('should render Cuadro ${entry.key} ${brightness.name}', (
        tester,
      ) async {
        final items = entry.key == 'insufficient'
            ? [_confirmed.first]
            : [
                ..._confirmed,
                if (entry.key == 'pending_warning')
                  _registration('three', 'Carla Tres', 'PENDING'),
              ];
        await _pumpOrganizer(
          tester,
          brightness,
          registrationsState: _loaded(items: items),
          scheduleState: entry.value.state,
          format: entry.key == 'gpk_transition'
              ? 'GROUPS_PLUS_KNOCKOUT'
              : entry.key == 'standings'
              ? 'AMERICANO'
              : 'SINGLE_ELIMINATION',
          scoreboardState: entry.key == 'standings'
              ? _scoreboard
              : const TournamentScoreboardEmpty(),
        );
        await tester.tap(find.text('Cuadro'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 500));
        await tester.pump();
        if (entry.value.identity case final String identity) {
          expect(find.textContaining(identity), findsWidgets);
        } else {
          expect(find.byType(CircularProgressIndicator), findsOneWidget);
        }
        if (entry.key == 'insufficient' || entry.key == 'enabled') {
          final button = tester.widget<FilledButton>(
            find.ancestor(
              of: find.text('Generar cuadro y horarios'),
              matching: find.byWidgetPredicate(
                (widget) => widget is FilledButton,
              ),
            ),
          );
          expect(
            button.onPressed,
            entry.key == 'insufficient' ? isNull : isNotNull,
          );
        }
        await _capture(tester, 'cuadro_${entry.key}', brightness);
        if (entry.key == 'standings') {
          await tester.scrollUntilVisible(
            find.text('6-3'),
            180,
            scrollable: find.byType(Scrollable).last,
          );
          await tester.pump(const Duration(milliseconds: 300));
          expect(find.text('6-3'), findsOneWidget);
          expect(find.text('Cargar'), findsOneWidget);
          await _capture(tester, 'cuadro_matches_lower', brightness);
        }
      });
    }
    for (final scenario in [
      'draft_public',
      'open_private',
      'inprogress_public',
      'status_busy',
      'status_error',
      'visibility_busy',
      'visibility_error',
    ]) {
      testWidgets('should render Publicar $scenario ${brightness.name}', (
        tester,
      ) async {
        final repository = _Repository();
        final pending = Completer<void>();
        when(
          () => repository.updateTournamentStatus(
            tournamentId: 't1',
            status: 'OPEN',
          ),
        ).thenAnswer(
          (_) => scenario == 'status_busy'
              ? pending.future
              : Future<void>.error(Exception('status failed')),
        );
        when(
          () => repository.updateTournamentVisibility(
            tournamentId: 't1',
            visibility: 'PRIVATE',
          ),
        ).thenAnswer(
          (_) => scenario == 'visibility_busy'
              ? pending.future
              : Future<void>.error(Exception('visibility failed')),
        );
        await _pumpOrganizer(
          tester,
          brightness,
          registrationsState: _loaded(),
          repository: repository,
          status: scenario == 'inprogress_public'
              ? 'IN_PROGRESS'
              : scenario == 'open_private'
              ? 'OPEN'
              : 'DRAFT',
          visibility: scenario == 'open_private' ? 'PRIVATE' : 'PUBLIC',
        );
        await tester.tap(find.text('Publicar'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 500));
        await tester.pump();
        expect(find.text('Estado de la inscripción'), findsOneWidget);
        expect(
          find.text(
            scenario == 'open_private'
                ? 'Sólo lo ven los que invitás'
                : 'Aparece en el listado de la app',
          ),
          findsOneWidget,
        );
        if (scenario.startsWith('status_')) {
          await tester.tap(find.text('Abierta'));
        } else if (scenario.startsWith('visibility_')) {
          await tester.tap(
            find.byKey(const Key('tournament.visibilityControl')),
          );
        }
        await tester.pump(const Duration(milliseconds: 100));
        if (scenario.endsWith('error')) {
          expect(
            find.text(
              scenario.startsWith('status')
                  ? 'No se pudo cambiar el estado del torneo.'
                  : 'No se pudo cambiar la visibilidad del torneo.',
            ),
            findsOneWidget,
          );
        }
        if (scenario.endsWith('busy')) {
          final context = tester.element(
            find.byKey(
              Key(
                scenario.startsWith('status')
                    ? 'tournament.statusControl'
                    : 'tournament.visibilityControl',
              ),
            ),
          );
          expect(
            context.read<TournamentPublishCubit>().state.submitting,
            isTrue,
          );
        }
        await _capture(tester, 'publish_$scenario', brightness);
        // Resolve after the capture while the real Cubit is still mounted.
        if (!pending.isCompleted) pending.complete();
        await tester.pump();
        await tester.pumpWidget(const SizedBox.shrink());
      });
    }

    for (final sheet in ['guest', 'invite', 'pair']) {
      final states = sheet == 'pair'
          ? ['initial', 'selected_one', 'selected_two', 'empty']
          : ['initial', 'filled', 'validation', 'busy', 'api_error'];
      for (final state in states) {
        testWidgets('should render $sheet sheet $state ${brightness.name}', (
          tester,
        ) async {
          final registrationsState = _loaded(
            items: sheet == 'pair' && state == 'empty' ? [] : _confirmed,
            inviting: sheet == 'invite' && state == 'busy',
            invitingGuest: sheet == 'guest' && state == 'busy',
            guestError: sheet == 'guest' && state == 'api_error'
                ? 'No se pudo agregar al invitado.'
                : null,
            inviteError: sheet == 'invite' && state == 'api_error'
                ? 'No se pudo enviar la invitación.'
                : null,
          );
          await _pumpOrganizer(
            tester,
            brightness,
            registrationsState: registrationsState,
            paired: sheet == 'pair',
          );
          final opener = find.byKey(
            Key(
              sheet == 'guest'
                  ? 'tournament.inviteGuestButton'
                  : sheet == 'invite'
                  ? 'tournament.invitePlayerButton'
                  : 'tournament.pairing.arm',
            ),
          );
          await tester.scrollUntilVisible(
            opener,
            180,
            scrollable: find.byType(Scrollable).last,
          );
          await tester.tap(opener);
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 500));
          await tester.pump();
          if (sheet == 'pair') {
            expect(find.text('Elegí dos inscritos sin pareja'), findsOneWidget);
            if (state.startsWith('selected')) {
              await tester.tap(
                find.byKey(const Key('tournament.pairing.select.one')),
              );
              if (state == 'selected_two') {
                await tester.tap(
                  find.byKey(const Key('tournament.pairing.select.two')),
                );
              }
              await tester.pump(const Duration(milliseconds: 300));
            }
            final button = tester.widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Armar dupla'),
            );
            expect(
              button.onPressed,
              state == 'selected_two' ? isNotNull : isNull,
            );
            if (state == 'empty') {
              expect(find.text('No hay inscritos sin pareja.'), findsOneWidget);
            }
          } else {
            expect(
              find.byKey(
                Key(
                  'tournament.${sheet == 'guest' ? 'inviteGuestSheet' : 'invitePlayerSheet'}.title',
                ),
              ),
              findsOneWidget,
            );
            if (state != 'initial') {
              if (sheet == 'guest') {
                await tester.enterText(
                  find.byKey(const Key('tournament.inviteGuestSheet.name')),
                  state == 'validation' ? 'A' : 'Lucía Invitada',
                );
                await tester.enterText(
                  find.byKey(const Key('tournament.inviteGuestSheet.email')),
                  state == 'validation'
                      ? 'email-invalido'
                      : 'lucia@example.com',
                );
                await tester.enterText(
                  find.byKey(const Key('tournament.inviteGuestSheet.phone')),
                  '+58 412 1234567',
                );
              } else if (state != 'validation') {
                await tester.enterText(
                  find.byKey(const Key('tournament.invitePlayerSheet.search')),
                  'user-lucia',
                );
              }
              tester.testTextInput.hide();
              FocusManager.instance.primaryFocus?.unfocus();
              await tester.pump(const Duration(milliseconds: 300));
            }
            if (state == 'validation') {
              if (sheet == 'guest') {
                await tester.tap(
                  find.byKey(const Key('tournament.inviteGuestSheet.submit')),
                );
                await tester.pump();
                expect(
                  find.byKey(const Key('tournament.inviteGuestSheet')),
                  findsOneWidget,
                );
              } else {
                final button = tester.widget<FilledButton>(
                  find.byKey(const Key('tournament.invitePlayerSheet.submit')),
                );
                expect(button.onPressed, isNull);
              }
            }
            if (state == 'busy') {
              expect(find.byType(CircularProgressIndicator), findsOneWidget);
            }
            if (state == 'api_error') {
              expect(
                find.text(
                  sheet == 'guest'
                      ? 'No se pudo agregar al invitado.'
                      : 'No se pudo enviar la invitación.',
                ),
                findsWidgets,
              );
            }
          }
          await _capture(
            tester,
            '${sheet}_sheet_$state',
            brightness,
            modal: true,
          );
        });
      }
    }
  }
}
