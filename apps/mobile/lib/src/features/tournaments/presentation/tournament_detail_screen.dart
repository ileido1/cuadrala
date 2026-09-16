import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/failures/app_failure.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/brand_colors.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/app_header.dart';
import '../../../shared/widgets/avatar_stack.dart';
import '../../../shared/widgets/pill_toggle.dart';
import '../../../shared/widgets/segmented_control.dart';
import '../../profile/data/models/user_rating_dto.dart';
import '../../profile/data/profile_repository.dart';
import '../../venues/data/venues_repository.dart';
import '../data/models/tournament_invitation_dto.dart';
import '../data/models/tournament_list_item_dto.dart';
import '../data/models/my_tournament_match_dto.dart';
import '../data/models/viewer_tournament_dto.dart';
import '../domain/tournament_eligibility_resolver.dart';
import 'tournament_format_label.dart';
import '../data/models/tournament_registration_dto.dart';
import '../data/models/tournament_schedule_dto.dart';
import '../data/models/tournament_scoreboard_dto.dart';
import '../data/tournaments_repository.dart';
import '../domain/tournament_status_transitions.dart';
import 'cubit/tournament_registrations_cubit.dart';
import 'cubit/tournament_registrations_state.dart';
import 'cubit/tournament_publish_cubit.dart';
import 'cubit/tournament_publish_state.dart';
import 'cubit/tournament_schedule_cubit.dart';
import 'cubit/tournament_schedule_state.dart';
import 'cubit/tournament_scoreboard_cubit.dart';
import 'cubit/tournament_scoreboard_state.dart';
import 'tournament_status_view.dart';
import 'tournament_roster_grouping.dart';
import 'tournament_roster_summary.dart';
import 'widgets/result_entry_sheet.dart';
import 'widgets/reschedule_sheet.dart';
import 'widgets/tournament_entry_check.dart';
import 'widgets/tournament_pairing_section.dart';
import 'widgets/tournament_roster_sheet.dart';
import 'screens/bracket_screen.dart';
import 'tournament_invitation_screen.dart';
import 'widgets/invite_guest_sheet.dart';
import 'widgets/my_tournament_match_card.dart';
part 'tournament_detail/header_footer.dart';
part 'tournament_detail/player_tabs.dart';
part 'tournament_detail/org_bracket_tab.dart';
part 'tournament_detail/org_publish_tab.dart';
part 'tournament_detail/org_registrations_tab.dart';
part 'tournament_detail/info_tab.dart';

/// Etiquetas de las pestañas del detalle, en orden.
///
/// Público a propósito: los tests navegan tocando estas etiquetas, y el
/// nombre de la tercera cambió dos veces en dos días
/// (Inscripciones → Inscritos → Registrados) dejando la suite en rojo cada
/// vez, porque el texto estaba duplicado en los tests. Renombrar acá ahora
/// arrastra a los tests con él.
const tournamentDetailTabLabels = <String>['Info', 'Mis partidos', 'Tabla'];

/// Índice de la pestaña de información del torneo.
const tournamentInfoTabIndex = 0;

/// Índice de la pestaña de inscripciones dentro de [tournamentDetailTabLabels].
const tournamentRegistrationsTabIndex = 0;

/// Índice de la pestaña de tabla (bracket) dentro de [tournamentDetailTabLabels].
const tournamentBracketTabIndex = 2;

/// Tournament statuses that still allow generating/regenerating the
/// schedule and managing guest registrations (organizer confirm/remove),
/// mirroring the backend's `STATUSES_ALLOWING_SCHEDULE_GENERATION` /
/// registration guards.
const _kOrganizerManageableStatuses = {'DRAFT', 'OPEN'};

/// Helper para verificar si un usuario es el organizador del torneo.
/// Evita duplicar la lógica `organizerUserId != null && currentUserId == organizerUserId`
/// en múltiples widgets.
bool _isOrganizer(String? organizerUserId, String? currentUserId) {
  return organizerUserId != null &&
      currentUserId != null &&
      organizerUserId == currentUserId;
}

/// `MALE`/`FEMALE`/`MIXED` → la etiqueta en español del handoff, mismo mapeo
/// que `tournament_list_item_tile.dart:_genderTagLabel` (privado a ese
/// archivo, por eso se repite acá en vez de exponerlo). Un código
/// desconocido no se inventa: la etiqueta desaparece.
String? _headerGenderLabel(String? gender) => switch (gender) {
  'MALE' => 'Masculino',
  'FEMALE' => 'Femenino',
  'MIXED' => 'Mixto',
  _ => null,
};

/// Subtítulo del header del detalle: "{venue} · {gender} {categoría}",
/// igual al handoff (`cuadrala-torneos.jsx:216`). Los datos que el
/// organizador no declaró no se inventan: esa parte desaparece en vez de
/// mostrar un placeholder (mismo criterio que `TournamentListItemTile`).
String? _tournamentHeaderSubtitle(TournamentListItemDto? tournament) {
  if (tournament == null) return null;
  final genderLabel = _headerGenderLabel(tournament.gender);
  final categoryPart = genderLabel != null
      ? '$genderLabel ${tournament.categoryName}'
      : tournament.categoryName;
  final parts = [
    if (tournament.venueName != null) tournament.venueName!,
    categoryPart,
  ];
  return parts.join(' · ');
}

final class TournamentDetailScreen extends StatefulWidget {
  const TournamentDetailScreen({
    super.key,
    required this.tournamentId,
    this.extra,
    this.viewerIsOrganizer,
  });

  final String tournamentId;
  final Object? extra;
  final bool? viewerIsOrganizer;

  @override
  State<TournamentDetailScreen> createState() => _TournamentDetailScreenState();
}

final class _TournamentDetailScreenState extends State<TournamentDetailScreen> {
  late final TournamentScheduleCubit _scheduleCubit;
  late final TournamentScoreboardCubit _scoreboardCubit;
  late final TournamentRegistrationsCubit _registrationsCubit;
  late final TournamentsRepository _tournamentsRepository;

  TournamentListItemDto? _tournament;
  bool? _viewerIsOrganizer;
  bool _loadingTournament = false;
  List<UserRatingDto>? _playerRatings;
  TabController? _tabController;

  @override
  void initState() {
    super.initState();
    //? Lazy-load cubits only when tabs are accessed (not in initState)
    //? This prevents unnecessary 404s and loading states
    _scheduleCubit = getIt<TournamentScheduleCubit>(
      param1: widget.tournamentId,
    );
    _scoreboardCubit = getIt<TournamentScoreboardCubit>(
      param1: widget.tournamentId,
    );
    _registrationsCubit = getIt<TournamentRegistrationsCubit>(
      param1: widget.tournamentId,
    )..load();
    _tournamentsRepository = getIt<TournamentsRepository>();
    //? Only load registrations eagerly; others load on tab switch

    //? Cargar ratings del jugador en background para saber eligibilidad
    //? No awaitar acá para que el detalle se muestre rápido; el resolver
    //? maneja ratings == null como "no determinado aún".
    Future.microtask(_loadPlayerRatings);

    //? Validar tipo antes de asignar (evita silent null cuando extra es tipo incorrecto)
    final viewerTournament = widget.extra is ViewerTournamentDto
        ? widget.extra as ViewerTournamentDto
        : null;
    _tournament =
        viewerTournament?.tournament ??
        (widget.extra is TournamentListItemDto
            ? widget.extra as TournamentListItemDto
            : null);
    _viewerIsOrganizer =
        widget.viewerIsOrganizer ?? viewerTournament?.isOrganizer;
    //? Solo fetch si: 1) no tenemos extra, 2) falta organizerUserId, o
    //? 3) el item del listado todavía no trae el preset de formato.
    //? Con organizerUserId en el listado DTO, evitamos spinner en 90% de los casos.
    if (_tournament == null) {
      _loadingTournament = true;
      _fetchTournament();
    } else if (_tournament!.organizerUserId == null ||
        _tournament!.formatPresetName == null) {
      //? Raro pero posible: tournament viene sin organizerUserId (API old version?)
      //? Fetch para asegurar que se carga
      _loadingTournament = true;
      _fetchTournament();
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    //? Load player data only when the conditional tabs are accessed.
    final tabController = DefaultTabController.maybeOf(context);
    if (_tabController == tabController) return;
    _tabController?.animation?.removeListener(_onTabChanged);
    _tabController = tabController;
    _tabController?.animation?.addListener(_onTabChanged);
  }

  void _onTabChanged() {
    final tabController = DefaultTabController.maybeOf(context);
    if (tabController == null) return;

    final index = tabController.index;
    //? The player schedule is fetched by `_MyMatchesTab`; keep this load for
    //? organizer calendar generation and the existing repository contract.
    if (index == 1 && _scheduleCubit.state is TournamentScheduleInitial) {
      _scheduleCubit.load();
    }
    // En la pestaña Cuadro del organizador los formatos round-robin muestran
    // la tabla, no el bracket. Cargarla al entrar evita dejar al usuario en
    // la tarjeta de "Cuadro generado" sin ningún contenido navegable.
    final isOrganizer =
        _viewerIsOrganizer ??
        _isOrganizer(
          _tournament?.organizerUserId,
          _registrationsCubit.currentUserId,
        );
    if (index == 1 &&
        isOrganizer &&
        _scoreboardCubit.state is TournamentScoreboardInitial) {
      _scoreboardCubit.load();
    }
    if (index == 2 && _scoreboardCubit.state is TournamentScoreboardInitial) {
      _scoreboardCubit.load();
    }
  }

  Future<void> _fetchTournament() async {
    try {
      final t = await getIt<TournamentsRepository>().getTournamentById(
        tournamentId: widget.tournamentId,
      );
      if (!mounted) return;
      setState(() {
        _tournament = t;
        _loadingTournament = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingTournament = false);
    }
  }

  Future<void> _loadPlayerRatings() async {
    try {
      final ratings = await getIt<ProfileRepository>().getUserRatings(
        userId: 'me',
      );
      if (!mounted) return;
      setState(() => _playerRatings = ratings);
    } catch (_) {
      //? Eligibility resolver maneja ratings == null como desconocido.
      //? Si falla el fetch, simplemente no bloqueamos al usuario.
    }
  }

  @override
  void dispose() {
    _tabController?.animation?.removeListener(_onTabChanged);
    _scheduleCubit.close();
    _scoreboardCubit.close();
    _registrationsCubit.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: _scheduleCubit),
        BlocProvider.value(value: _scoreboardCubit),
        BlocProvider.value(value: _registrationsCubit),
      ],
      child: _loadingTournament
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : TournamentDetailBody(
              tournamentId: widget.tournamentId,
              tournament: _tournament,
              viewerIsOrganizer: _viewerIsOrganizer,
              playerRatings: _playerRatings,
              tournamentsRepository: _tournamentsRepository,
            ),
    );
  }
}

/// Body of [TournamentDetailScreen], separated so it can be pumped directly
/// in widget tests against mocked cubits (see `tournament_detail_screen_test.dart`).
@visibleForTesting
final class TournamentDetailBody extends StatelessWidget {
  const TournamentDetailBody({
    super.key,
    required this.tournamentId,
    required this.tournament,
    this.viewerIsOrganizer,
    this.playerRatings,
    required this.tournamentsRepository,
  });

  final String tournamentId;
  final TournamentListItemDto? tournament;
  final bool? viewerIsOrganizer;
  final List<UserRatingDto>? playerRatings;
  final TournamentsRepository tournamentsRepository;

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy', 'es_ES');
    final registrationsState = context
        .watch<TournamentRegistrationsCubit>()
        .state;
    final registrationsCubit = context.read<TournamentRegistrationsCubit>();
    final currentRegistration =
        registrationsState is TournamentRegistrationsLoaded &&
            registrationsCubit.currentUserId != null
        ? registrationsState.registrationFor(registrationsCubit.currentUserId!)
        : null;
    final isOrganizer =
        viewerIsOrganizer ??
        _isOrganizer(
          tournament?.organizerUserId,
          registrationsCubit.currentUserId,
        );
    final showPlayerTabs =
        currentRegistration?.status == 'CONFIRMED' ||
        tournament?.status == 'IN_PROGRESS';
    final tabs = isOrganizer
        ? const <String>['Inscritos', 'Cuadro', 'Publicar']
        : showPlayerTabs
        ? tournamentDetailTabLabels
        : const <String>['Info'];
    final invited =
        registrationsState is TournamentRegistrationsLoaded &&
        registrationsCubit.currentUserId != null &&
        registrationsState.pendingInvitationFor(
              registrationsCubit.currentUserId!,
            ) !=
            null;
    final pendingInvitation =
        registrationsState is TournamentRegistrationsLoaded &&
            registrationsCubit.currentUserId != null
        ? registrationsState.pendingInvitationFor(
            registrationsCubit.currentUserId!,
          )
        : null;

    // A `DefaultTabController` is required by the `TabBar`/`TabBarView` pair
    // below; without it, mounting this screen throws
    // "No TabController for TabBarView" (pre-existing gap fixed here since
    // it blocks every tab, including the invitations/schedule work below).
    return DefaultTabController(
      key: ValueKey(tabs.join('|')),
      length: tabs.length,
      child: Scaffold(
        key: const Key('tournament.detail'),
        body: Column(
          children: [
            // Static header (req. 5): replaces the collapsing `SliverAppBar` +
            // `_TournamentHeaderBg` pair. Scrolling the tab content below no
            // longer resizes or hides this header.
            AppHeader(
              title: tournament?.name ?? '',
              subtitle: _tournamentHeaderSubtitle(tournament),
              showBack: true,
              onBack: () {
                //? Si entramos vía context.go (p. ej. tras crear el torneo)
                //? no hay historial que hacer pop; caemos al home de torneos.
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go(Routes.torneosHome);
                }
              },
              rightAction: isOrganizer ? const _OrgBadge() : null,
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Row(
                children: [
                  _StatusBadge(status: tournament?.status ?? ''),
                  if (tournament?.visibility == 'PRIVATE') ...[
                    const SizedBox(width: 8),
                    const _SmallTag(label: 'Privado'),
                  ],
                  const Spacer(),
                  if (tournament?.startsAt != null)
                    Text(
                      dateFormat.format(tournament!.startsAt!),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ),

            // Tab switcher (M5b): replaces the Material `TabBar` with the
            // shared `SegmentedControl`, matching the handoff's tap-only
            // `Segmented` (`cuadrala-torneos.jsx:220`) instead of a
            // swipeable strip. `AnimatedBuilder` rebuilds it whenever the
            // (still shared) `TabController` index changes.
            Container(
              color: Theme.of(context).colorScheme.surface,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
              //? `Builder` para obtener el `TabController` desde un contexto
              //? descendiente del `DefaultTabController` de más abajo: el
              //? `context` del `build()` de este widget es ancestro del
              //? `DefaultTabController` que retorna, no descendiente.
              child: Builder(
                builder: (context) {
                  final tabController = DefaultTabController.of(context);
                  return AnimatedBuilder(
                    animation: tabController,
                    builder: (context, _) => SegmentedControl<int>(
                      options: [
                        for (var i = 0; i < tabs.length; i++)
                          SegmentedOption(value: i, label: tabs[i]),
                      ],
                      value: tabController.index,
                      //? Salto directo de índice (sin animar): igual al
                      //? `Segmented` del handoff, que sólo cambia de estado
                      //? al tocar, sin swipe.
                      onChanged: (index) => tabController.index = index,
                    ),
                  );
                },
              ),
            ),

            Expanded(
              child: TabBarView(
                //? Sin swipe: el handoff cambia de pestaña únicamente con el
                //? `Segmented` de arriba (`cuadrala-torneos.jsx:220`).
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  if (isOrganizer) ...[
                    _RegistrationsTab(
                      tournamentId: tournamentId,
                      organizerUserId: tournament?.organizerUserId,
                      organizerName: tournament?.organizerName,
                      tournamentStatus: tournament?.status,
                      categoryName: tournament?.categoryName,
                      pairedRegistration:
                          tournament?.pairedRegistration ?? false,
                    ),
                    _OrganizerBracketTab(
                      tournamentId: tournamentId,
                      organizerUserId: tournament?.organizerUserId,
                      tournamentsRepository: tournamentsRepository,
                      formatPresetName: tournament?.formatPresetName,
                      venueId: tournament?.venueId,
                    ),
                    _OrganizerPublishTab(
                      tournament: tournament,
                      tournamentId: tournamentId,
                      organizerUserId: tournament?.organizerUserId,
                      tournamentsRepository: tournamentsRepository,
                    ),
                  ] else ...[
                    _InfoTab(
                      tournament: tournament,
                      playerRatings: playerRatings,
                      registration: currentRegistration,
                      registrationsState: registrationsState,
                      invited: invited,
                      invitation: pendingInvitation,
                      onOpenInvitation: pendingInvitation == null
                          ? null
                          : () {
                              final cubit = context
                                  .read<TournamentRegistrationsCubit>();
                              Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => BlocProvider.value(
                                    value: cubit,
                                    child: TournamentInvitationScreen(
                                      tournament: tournament!,
                                      invitation: pendingInvitation,
                                    ),
                                  ),
                                ),
                              );
                            },
                    ),
                    if (showPlayerTabs)
                      _ScheduleTab(
                        tournamentId: tournamentId,
                        organizerUserId: tournament?.organizerUserId,
                      ),
                    if (showPlayerTabs)
                      _ScoreboardTab(
                        tournamentId: tournamentId,
                        tournamentsRepository: tournamentsRepository,
                      ),
                  ],
                ],
              ),
            ),
          ],
        ),
        bottomNavigationBar: isOrganizer
            ? null
            : _TournamentFooter(
                tournament: tournament,
                playerRatings: playerRatings,
                invited: invited,
              ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Original tab classes
// ---------------------------------------------------------------------------
