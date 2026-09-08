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
import '../../profile/data/models/user_rating_dto.dart';
import '../../profile/data/profile_repository.dart';
import '../data/models/tournament_invitation_dto.dart';
import '../data/models/tournament_list_item_dto.dart';
import '../data/models/my_tournament_match_dto.dart';
import '../domain/tournament_eligibility_resolver.dart';
import '../data/models/tournament_registration_dto.dart';
import '../data/models/tournament_schedule_dto.dart';
import '../data/models/tournament_scoreboard_dto.dart';
import '../data/tournaments_repository.dart';
import 'cubit/tournament_registrations_cubit.dart';
import 'cubit/tournament_registrations_state.dart';
import 'cubit/tournament_schedule_cubit.dart';
import 'cubit/tournament_schedule_state.dart';
import 'cubit/tournament_scoreboard_cubit.dart';
import 'cubit/tournament_scoreboard_state.dart';
import 'tournament_status_view.dart';
import 'tournament_roster_grouping.dart';
import 'tournament_roster_summary.dart';
import 'widgets/tournament_entry_check.dart';
import 'widgets/tournament_pairing_section.dart';
import 'screens/bracket_screen.dart';
import 'tournament_invitation_screen.dart';
import 'widgets/invite_guest_sheet.dart';
import 'widgets/my_tournament_match_card.dart';

/// Etiquetas de las pestañas del detalle, en orden.
///
/// Público a propósito: los tests navegan tocando estas etiquetas, y el
/// nombre de la tercera cambió dos veces en dos días
/// (Inscripciones → Inscriptos → Registrados) dejando la suite en rojo cada
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

final class TournamentDetailScreen extends StatefulWidget {
  const TournamentDetailScreen({
    super.key,
    required this.tournamentId,
    this.extra,
  });

  final String tournamentId;
  final Object? extra;

  @override
  State<TournamentDetailScreen> createState() => _TournamentDetailScreenState();
}

final class _TournamentDetailScreenState extends State<TournamentDetailScreen> {
  late final TournamentScheduleCubit _scheduleCubit;
  late final TournamentScoreboardCubit _scoreboardCubit;
  late final TournamentRegistrationsCubit _registrationsCubit;
  late final TournamentsRepository _tournamentsRepository;

  TournamentListItemDto? _tournament;
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
    _tournament = widget.extra is TournamentListItemDto
        ? widget.extra as TournamentListItemDto
        : null;
    //? Solo fetch si: 1) no tenemos extra, O 2) extra existe pero sin organizerUserId
    //? Con organizerUserId en el listado DTO, evitamos spinner en 90% de los casos.
    if (_tournament == null) {
      _loadingTournament = true;
      _fetchTournament();
    } else if (_tournament!.organizerUserId == null) {
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
    this.playerRatings,
    required this.tournamentsRepository,
  });

  final String tournamentId;
  final TournamentListItemDto? tournament;
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
    final isOrganizer = _isOrganizer(
      tournament?.organizerUserId,
      registrationsCubit.currentUserId,
    );
    final showPlayerTabs =
        currentRegistration?.status == 'CONFIRMED' ||
        tournament?.status == 'IN_PROGRESS';
    final tabs = isOrganizer
        ? const <String>['Inscriptos', 'Cuadro', 'Publicar']
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
        body: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) {
            return [
              // Header image + title + enroll
              SliverAppBar(
                // 120 was 8px too short for `_TournamentHeaderBg`'s own
                // headline + subtitle + padding (pre-existing bug — the
                // existing widget-test suite never surfaced it because it
                // never pumped a non-null `tournament` fixture into this
                // screen; found while adding guest-registration coverage).
                expandedHeight: 112,
                pinned: true,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () {
                    //? Si entramos vía context.go (p. ej. tras crear el torneo)
                    //? no hay historial que hacer pop; caemos al home de torneos.
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go(Routes.torneosHome);
                    }
                  },
                ),
                actions: isOrganizer
                    ? [
                        Padding(
                          padding: const EdgeInsets.only(right: 16),
                          child: Center(child: _OrgBadge()),
                        ),
                      ]
                    : const [],
                flexibleSpace: FlexibleSpaceBar(
                  background: _TournamentHeaderBg(
                    tournament: tournament,
                    organizer: isOrganizer,
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: Padding(
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
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurfaceVariant,
                              ),
                        ),
                    ],
                  ),
                ),
              ),

              // Organizer-only status transition control
              if (isOrganizer && tournament?.organizerUserId != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: OrganizerStatusControl(
                      tournamentId: tournamentId,
                      organizerUserId: tournament!.organizerUserId!,
                      currentStatus: tournament!.status,
                      onStatusChanged: () {
                        // Recargar el torneo para actualizar la UI
                        context.read<TournamentScheduleCubit>().load();
                        context.read<TournamentRegistrationsCubit>().load();
                      },
                    ),
                  ),
                ),

              // Organizer-only visibility control (PUBLIC/PRIVATE)
              if (isOrganizer && tournament?.organizerUserId != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: _VisibilityControl(
                      tournamentId: tournamentId,
                      organizerUserId: tournament!.organizerUserId!,
                      currentVisibility: tournament?.visibility ?? 'PUBLIC',
                      onVisibilityChanged: () {
                        // Recargar el torneo para actualizar la UI
                        context.read<TournamentScheduleCubit>().load();
                        context.read<TournamentRegistrationsCubit>().load();
                      },
                    ),
                  ),
                ),

              // The player tabs only appear after confirmation or once the tournament is running.
              SliverPersistentHeader(
                pinned: true,
                delegate: _TabBarDelegate(
                  TabBar(
                    labelColor: Theme.of(context).colorScheme.primary,
                    unselectedLabelColor: Theme.of(
                      context,
                    ).colorScheme.onSurfaceVariant,
                    indicatorColor: Theme.of(context).colorScheme.primary,
                    tabs: [for (final label in tabs) Tab(text: label)],
                  ),
                ),
              ),
            ];
          },
          body: TabBarView(
            children: [
              if (isOrganizer) ...[
                _RegistrationsTab(
                  tournamentId: tournamentId,
                  organizerUserId: tournament?.organizerUserId,
                  tournamentStatus: tournament?.status,
                  pairedRegistration: tournament?.pairedRegistration ?? false,
                ),
                _OrganizerBracketTab(
                  tournamentId: tournamentId,
                  organizerUserId: tournament?.organizerUserId,
                  tournamentsRepository: tournamentsRepository,
                ),
                _OrganizerPublishTab(
                  tournament: tournament,
                  tournamentId: tournamentId,
                  organizerUserId: tournament?.organizerUserId,
                ),
              ] else ...[
                _InfoTab(
                  tournament: tournament,
                  playerRatings: playerRatings,
                  registration: currentRegistration,
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

final class _TournamentHeaderBg extends StatelessWidget {
  const _TournamentHeaderBg({required this.tournament, this.organizer = false});
  final TournamentListItemDto? tournament;
  final bool organizer;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: tournament != null
          ? Align(
              alignment: Alignment.bottomLeft,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      tournament!.name,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      organizer
                          ? 'Vos organizás este torneo'
                          : '${tournament!.sportName} · ${tournament!.categoryName}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            )
          : const SizedBox.shrink(),
    );
  }
}

final class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = tournamentStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        tournamentStatusLabel(status),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

final class _SmallTag extends StatelessWidget {
  const _SmallTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        child: Text(
          label,
          style: TextStyle(
            color: scheme.onSurfaceVariant,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

final class _OrgBadge extends StatelessWidget {
  const _OrgBadge();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: BrandColors.limeAccent,
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Padding(
        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        child: Text(
          'ORG',
          style: TextStyle(
            color: BrandColors.onLime,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

final class _TournamentFooter extends StatelessWidget {
  const _TournamentFooter({
    required this.tournament,
    required this.playerRatings,
    required this.invited,
  });

  final TournamentListItemDto? tournament;
  final List<UserRatingDto>? playerRatings;
  final bool invited;

  @override
  Widget build(BuildContext context) {
    if (tournament == null) return const SizedBox.shrink();
    return BlocBuilder<
      TournamentRegistrationsCubit,
      TournamentRegistrationsState
    >(
      builder: (context, state) {
        if (state is! TournamentRegistrationsLoaded) {
          return const SizedBox.shrink();
        }
        final cubit = context.read<TournamentRegistrationsCubit>();
        final userId = cubit.currentUserId;
        if (userId == null) return const SizedBox.shrink();
        final registration = state.registrationFor(userId);
        final ratings = playerRatings
            ?.map(
              (r) => {
                'categoryId': r.categoryId,
                'categoryName': r.categoryName ?? '',
              },
            )
            .toList();
        final eligibility = resolveTournamentEligibilitySV(
          tournamentCategoryId: tournament!.categoryId,
          playerRatings: ratings,
          playerIsInvited: invited,
        );
        final scheme = Theme.of(context).colorScheme;
        final open = isTournamentRosterOpen(tournament!.status);
        final footer = <Widget>[];

        if (registration?.status == 'PENDING') {
          footer.add(
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 54,
                    decoration: BoxDecoration(
                      color: scheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: scheme.outlineVariant),
                    ),
                    alignment: Alignment.center,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text('Esperando al organizador'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                OutlinedButton(
                  onPressed: state.registering ? null : cubit.withdraw,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 54),
                  ),
                  child: const Text('Retirarme'),
                ),
              ],
            ),
          );
        } else if (registration?.status == 'CONFIRMED') {
          footer.add(
            FilledButton.icon(
              onPressed: () => DefaultTabController.of(context).animateTo(1),
              icon: const Icon(Icons.calendar_today_outlined, size: 19),
              label: const Text('Ver cuándo y dónde juego'),
            ),
          );
        } else if (!open) {
          footer.add(
            OutlinedButton.icon(
              onPressed: null,
              icon: const Icon(Icons.schedule_outlined),
              label: const Text('Inscripción cerrada'),
            ),
          );
        } else if (eligibility == TournamentEligibility.wrongCategory &&
            !invited) {
          footer.add(
            OutlinedButton.icon(
              onPressed: null,
              icon: const Icon(Icons.lock_outline),
              label: Text('Es categoría ${tournament!.categoryName}'),
            ),
          );
        } else {
          footer.add(
            Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text.rich(
                      TextSpan(
                        text: 'Entrás como ',
                        style: TextStyle(
                          color: scheme.onSurfaceVariant,
                          fontSize: 12.5,
                        ),
                        children: [
                          TextSpan(
                            text: 'pendiente',
                            style: TextStyle(
                              color: scheme.onSurface,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const TextSpan(text: ' hasta que te acepten'),
                        ],
                      ),
                    ),
                    if (tournament!.inscriptionPrice != null)
                      Text(
                        formatMoneyFromMajor(
                          tournament!.inscriptionPrice!,
                          CurrencyCode.usd,
                        ),
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: scheme.onSurface,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                FilledButton.icon(
                  onPressed: state.registering ? null : cubit.register,
                  icon: state.registering
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check, size: 20),
                  label: const Text('Inscribirme'),
                ),
              ],
            ),
          );
        }

        return Container(
          decoration: BoxDecoration(
            color: scheme.surfaceContainerLow,
            border: Border(top: BorderSide(color: scheme.outlineVariant)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Column(children: footer),
        );
      },
    );
  }
}

final class _MyMatchesTab extends StatefulWidget {
  const _MyMatchesTab({
    required this.tournamentId,
    required this.tournamentsRepository,
  });

  final String tournamentId;
  final TournamentsRepository tournamentsRepository;

  @override
  State<_MyMatchesTab> createState() => _MyMatchesTabState();
}

final class _MyMatchesTabState extends State<_MyMatchesTab> {
  late Future<List<MyTournamentMatchDto>> _future;
  String? _busy;

  @override
  void initState() {
    super.initState();
    _future = widget.tournamentsRepository.listMyTournamentMatches(
      tournamentId: widget.tournamentId,
    );
  }

  Future<void> _respond(MyTournamentMatchDto match, String response) async {
    setState(() => _busy = '${match.roundNumber}.${match.matchNumber}');
    await widget.tournamentsRepository.respondToTournamentSlot(
      tournamentId: widget.tournamentId,
      roundNumber: match.roundNumber,
      matchNumber: match.matchNumber,
      response: response,
    );
    if (!mounted) return;
    setState(() {
      _busy = null;
      _future = widget.tournamentsRepository.listMyTournamentMatches(
        tournamentId: widget.tournamentId,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<MyTournamentMatchDto>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return const _InfoBox(message: 'No se pudieron cargar tus partidos.');
        }
        final matches = snapshot.data ?? const <MyTournamentMatchDto>[];
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 130),
          children: [
            Text(
              'Sólo tus partidos. El cuadro completo está en Tabla.',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 12),
            if (matches.isEmpty)
              const _InfoBox(message: 'Todavía no hay partidos asignados.'),
            for (final match in matches)
              MyTournamentMatchCard(
                match: match,
                busy: _busy == '${match.roundNumber}.${match.matchNumber}',
                onRespond: (response) => _respond(match, response),
              ),
          ],
        );
      },
    );
  }
}

final class _OrganizerBracketTab extends StatelessWidget {
  const _OrganizerBracketTab({
    required this.tournamentId,
    required this.organizerUserId,
    required this.tournamentsRepository,
  });

  final String tournamentId;
  final String? organizerUserId;
  final TournamentsRepository tournamentsRepository;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
      child: BlocBuilder<TournamentScheduleCubit, TournamentScheduleState>(
        builder: (context, scheduleState) {
          final registrationsState = context
              .watch<TournamentRegistrationsCubit>()
              .state;
          final registrations =
              registrationsState is TournamentRegistrationsLoaded
              ? registrationsState.items
                    .where((r) => r.status != 'WITHDRAWN')
                    .toList()
              : const <TournamentRegistrationDto>[];
          final pending = registrations
              .where((r) => r.status == 'PENDING')
              .length;
          final confirmedWithAccount = registrations
              .where((r) => r.status == 'CONFIRMED' && !r.isGuest)
              .length;
          final registrationsCubit = context
              .read<TournamentRegistrationsCubit>();

          return ListView(
            children: [
              if (pending > 0) ...[
                _OrganizerWarningBanner(
                  title: '$pending sin confirmar quedan fuera',
                  body:
                      'El cuadro se arma sólo con los confirmados. Confirmalos antes de generar o vas a tener que rehacerlo.',
                  actionLabel: 'Confirmar pendientes',
                  onAction: () =>
                      registrationsCubit.confirmPendingRegistrations(),
                ),
                const SizedBox(height: 14),
              ],
              switch (scheduleState) {
                TournamentScheduleLoading() || TournamentScheduleGenerating() =>
                  const Center(child: CircularProgressIndicator()),
                TournamentScheduleUnsupported() => const _InfoBox(
                  message:
                      'Este torneo no arma cuadro. El cuadro existe sólo para eliminación simple.',
                ),
                TournamentScheduleError(:final message) => _ErrorBox(
                  message: message,
                  onRetry: () => context.read<TournamentScheduleCubit>().load(),
                ),
                TournamentScheduleSuccess(:final schedule) =>
                  _OrganizerGeneratedSchedule(
                    schedule: schedule,
                    tournamentId: tournamentId,
                    tournamentsRepository: tournamentsRepository,
                  ),
                TournamentScheduleConflict() => _OrganizerGeneratedCard(
                  tournamentId: tournamentId,
                  tournamentsRepository: tournamentsRepository,
                ),
                TournamentScheduleInitial() ||
                TournamentScheduleEmpty() => _OrganizerGenerateCard(
                  confirmedWithAccount: confirmedWithAccount,
                  canGenerate:
                      _isOrganizer(
                        organizerUserId,
                        registrationsCubit.currentUserId,
                      ) &&
                      confirmedWithAccount >= 2,
                  onGenerate: () =>
                      context.read<TournamentScheduleCubit>().generate(),
                ),
              },
            ],
          );
        },
      ),
    );
  }
}

final class _OrganizerGenerateCard extends StatelessWidget {
  const _OrganizerGenerateCard({
    required this.confirmedWithAccount,
    required this.canGenerate,
    required this.onGenerate,
  });

  final int confirmedWithAccount;
  final bool canGenerate;
  final VoidCallback onGenerate;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: scheme.primary.withValues(alpha: .12),
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(
              Icons.emoji_events_outlined,
              color: scheme.primary,
              size: 26,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Generar el cuadro',
            style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            'Eliminación simple con los $confirmedWithAccount confirmados con cuenta. Los huéspedes quedan fuera del cuadro.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontSize: 13.5,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: canGenerate ? onGenerate : null,
            icon: const Icon(Icons.auto_awesome, size: 19),
            label: const Text('Generar cuadro y horarios'),
          ),
        ],
      ),
    );
  }
}

final class _OrganizerGeneratedCard extends StatelessWidget {
  const _OrganizerGeneratedCard({
    required this.tournamentId,
    required this.tournamentsRepository,
  });

  final String tournamentId;
  final TournamentsRepository tournamentsRepository;

  @override
  Widget build(BuildContext context) {
    return _OrganizerGeneratedSchedule(
      schedule: TournamentScheduleDto.empty(),
      tournamentId: tournamentId,
      tournamentsRepository: tournamentsRepository,
      generatedWithoutSchedule: true,
    );
  }
}

final class _OrganizerGeneratedSchedule extends StatelessWidget {
  const _OrganizerGeneratedSchedule({
    required this.schedule,
    required this.tournamentId,
    required this.tournamentsRepository,
    this.generatedWithoutSchedule = false,
  });

  final TournamentScheduleDto schedule;
  final String tournamentId;
  final TournamentsRepository tournamentsRepository;
  final bool generatedWithoutSchedule;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _OrganizerSuccessBanner(
          title: 'Cuadro generado',
          body: 'A cada jugador le llegó su horario para confirmar.',
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => SizedBox(
                    height: MediaQuery.sizeOf(context).height * .9,
                    child: BracketScreen(
                      tournamentId: tournamentId,
                      tournamentsRepository: tournamentsRepository,
                    ),
                  ),
                ),
                icon: const Icon(Icons.emoji_events_outlined, size: 17),
                label: const Text('Ver cuadro'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                onPressed: null,
                icon: const Icon(Icons.add, size: 17),
                label: const Text('Cargar resultado'),
              ),
            ),
          ],
        ),
        if (!generatedWithoutSchedule && schedule.rounds.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text(
            'Partidos de hoy',
            style: _sectionStyle(Theme.of(context).colorScheme),
          ),
          const SizedBox(height: 10),
          _ScheduleList(schedule: schedule),
        ] else ...[
          const SizedBox(height: 14),
          const _InfoBox(
            message: 'El calendario todavía no expone partidos de hoy.',
          ),
        ],
      ],
    );
  }
}

final class _OrganizerWarningBanner extends StatelessWidget {
  const _OrganizerWarningBanner({
    required this.title,
    required this.body,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String body;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF59E0B).withValues(alpha: .12),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: const Color(0xFFF59E0B).withValues(alpha: .45),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 3),
          Text(
            body,
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontSize: 13,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(onPressed: onAction, child: Text(actionLabel)),
          ),
        ],
      ),
    );
  }
}

final class _OrganizerSuccessBanner extends StatelessWidget {
  const _OrganizerSuccessBanner({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _InfoBox(message: '$title\n$body', accent: scheme.primary);
  }
}

final class _OrganizerPublishTab extends StatelessWidget {
  const _OrganizerPublishTab({
    required this.tournament,
    required this.tournamentId,
    required this.organizerUserId,
  });

  final TournamentListItemDto? tournament;
  final String tournamentId;
  final String? organizerUserId;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
      children: [
        Text('Quién lo ve', style: _sectionStyle(scheme)),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: scheme.outlineVariant, width: 1.5),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Torneo público',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          tournament?.visibility == 'PUBLIC'
                              ? 'Aparece en el listado de la app'
                              : 'Sólo lo ven los que invitás',
                          style: TextStyle(
                            color: scheme.onSurfaceVariant,
                            fontSize: 12.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: tournament?.visibility == 'PUBLIC',
                    onChanged: null,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (tournament != null && organizerUserId != null)
                _VisibilityControl(
                  tournamentId: tournamentId,
                  organizerUserId: organizerUserId!,
                  currentVisibility: tournament!.visibility,
                  onVisibilityChanged: () {},
                ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text('Estado de la inscripción', style: _sectionStyle(scheme)),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: scheme.outlineVariant, width: 1.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (tournament != null && organizerUserId != null)
                OrganizerStatusControl(
                  tournamentId: tournamentId,
                  organizerUserId: organizerUserId!,
                  currentStatus: tournament!.status,
                ),
              const SizedBox(height: 12),
              const Text(
                'Son dos cosas distintas: publicar no cierra la inscripción, y cerrar la inscripción no despublica el torneo.',
                style: TextStyle(fontSize: 12.5, height: 1.5),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text('Avisos', style: _sectionStyle(scheme)),
        const SizedBox(height: 10),
        const _InfoBox(
          message:
              'No hay un botón de "avisar a todos": el aviso sale solo con cada acción.',
        ),
      ],
    );
  }
}

TextStyle _sectionStyle(ColorScheme scheme) => TextStyle(
  color: scheme.onSurfaceVariant,
  fontSize: 12,
  fontWeight: FontWeight.w800,
  letterSpacing: 0.4,
);

/// Legal next statuses for the current one, mirroring the backend's
/// `tournament_status_machine.ts` (table-driven edges: DRAFT→OPEN,
/// OPEN→IN_PROGRESS, IN_PROGRESS→COMPLETED, {DRAFT,OPEN}→CANCELLED).
List<String> _legalNextStatuses(String currentStatus) {
  switch (currentStatus.toUpperCase()) {
    case 'DRAFT':
      return const ['OPEN', 'CANCELLED'];
    case 'OPEN':
      return const ['IN_PROGRESS', 'CANCELLED'];
    case 'IN_PROGRESS':
      return const ['COMPLETED'];
    default:
      return const [];
  }
}

String _statusActionLabel(String status) {
  switch (status) {
    case 'OPEN':
      return 'Abrir inscripciones';
    case 'IN_PROGRESS':
      return 'Iniciar torneo';
    case 'COMPLETED':
      return 'Finalizar torneo';
    case 'CANCELLED':
      return 'Cancelar torneo';
    default:
      return status;
  }
}

/// Organizer-only status-transition control. Only the tournament organizer
/// (`organizerUserId == currentUserId`) sees this; the backend enforces the
/// same guard independently, so this is a UX affordance, not the source of
/// authorization truth.
///
/// Public (`@visibleForTesting`) so widget tests can pump it directly without
/// dragging in the rest of [TournamentDetailBody] (see
/// `tournament_detail_screen_test.dart`).
@visibleForTesting
final class OrganizerStatusControl extends StatefulWidget {
  const OrganizerStatusControl({
    super.key,
    required this.tournamentId,
    required this.organizerUserId,
    required this.currentStatus,
    this.onStatusChanged,
  });

  final String tournamentId;
  final String organizerUserId;
  final String currentStatus;
  final VoidCallback? onStatusChanged;

  @override
  State<OrganizerStatusControl> createState() => _OrganizerStatusControlState();
}

final class _OrganizerStatusControlState extends State<OrganizerStatusControl> {
  bool _submitting = false;
  String? _error;

  Future<void> _submitSV(String nextStatus) async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await getIt<TournamentsRepository>().updateTournamentStatus(
        tournamentId: widget.tournamentId,
        status: nextStatus,
      );
      if (!mounted) return;
      setState(() => _submitting = false);
      // Notificar al padre para que actualice el estado del torneo
      widget.onStatusChanged?.call();
    } on AppFailure catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = 'No se pudo cambiar el estado del torneo.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<
      TournamentRegistrationsCubit,
      TournamentRegistrationsState
    >(
      builder: (context, state) {
        final cubit = context.read<TournamentRegistrationsCubit>();
        if (cubit.currentUserId == null ||
            cubit.currentUserId != widget.organizerUserId) {
          return const SizedBox.shrink();
        }

        final nextStatuses = _legalNextStatuses(widget.currentStatus);
        if (nextStatuses.isEmpty) {
          return const SizedBox.shrink();
        }

        final scheme = Theme.of(context).colorScheme;

        return Column(
          key: const Key('tournament.organizerStatusControl'),
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            //? Aclaración de estado para el organizador: deja claro que un
            //? torneo en DRAFT no es visible para el público hasta publicarlo.
            if (widget.currentStatus == 'DRAFT')
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'Tu torneo está en borrador: todavía no es visible para los jugadores. '
                  'Publicalo cuando esté listo.',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            if (_error != null) ...[
              Text(
                _error!,
                style: TextStyle(color: scheme.error, fontSize: 12),
              ),
              const SizedBox(height: 4),
            ],
            Row(
              children: [
                Text(
                  'Acciones',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final next in nextStatuses)
                      FilledButton.tonal(
                        //? Ancho acotado: el theme global (Size.fromHeight) no
                        //? puede usarse dentro de un Row.
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 40),
                        ),
                        onPressed: _submitting ? null : () => _submitSV(next),
                        child: Text(_statusActionLabel(next)),
                      ),
                  ],
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}

/// Organizer-only visibility toggle (PUBLIC/PRIVATE). Like
/// [OrganizerStatusControl], only rendered for the tournament organizer.
final class _VisibilityControl extends StatefulWidget {
  const _VisibilityControl({
    required this.tournamentId,
    required this.organizerUserId,
    required this.currentVisibility,
    required this.onVisibilityChanged,
  });

  final String tournamentId;
  final String organizerUserId;
  final String currentVisibility;
  final VoidCallback onVisibilityChanged;

  @override
  State<_VisibilityControl> createState() => _VisibilityControlState();
}

final class _VisibilityControlState extends State<_VisibilityControl> {
  bool _submitting = false;
  String? _error;

  Future<void> _updateSV(String visibility) async {
    if (visibility == widget.currentVisibility) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await getIt<TournamentsRepository>().updateTournamentVisibility(
        tournamentId: widget.tournamentId,
        visibility: visibility,
      );
      if (!mounted) return;
      setState(() => _submitting = false);
      // Notificar al padre para que actualice el estado del torneo
      widget.onVisibilityChanged();
    } on AppFailure catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = 'No se pudo cambiar la visibilidad del torneo.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<
      TournamentRegistrationsCubit,
      TournamentRegistrationsState
    >(
      builder: (context, state) {
        final cubit = context.read<TournamentRegistrationsCubit>();
        if (cubit.currentUserId == null ||
            cubit.currentUserId != widget.organizerUserId) {
          return const SizedBox.shrink();
        }

        final scheme = Theme.of(context).colorScheme;
        return Column(
          key: const Key('tournament.visibilityControl'),
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_error != null) ...[
              Text(
                _error!,
                style: TextStyle(color: scheme.error, fontSize: 12),
              ),
              const SizedBox(height: 4),
            ],
            Row(
              children: [
                Text(
                  'Visibilidad',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(
                      value: 'PUBLIC',
                      label: Text('Público'),
                      icon: Icon(Icons.public, size: 16),
                    ),
                    ButtonSegment(
                      value: 'PRIVATE',
                      label: Text('Privado'),
                      icon: Icon(Icons.lock_outline, size: 16),
                    ),
                  ],
                  selected: {widget.currentVisibility},
                  onSelectionChanged: _submitting
                      ? null
                      : (selection) => _updateSV(selection.first),
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}

final class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  _TabBarDelegate(this._tabBar);
  final TabBar _tabBar;

  @override
  double get minExtent => _tabBar.preferredSize.height;

  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => false;
}

// ---------------------------------------------------------------------------
// Original tab classes
// ---------------------------------------------------------------------------

final class _ScheduleTab extends StatelessWidget {
  const _ScheduleTab({
    required this.tournamentId,
    required this.organizerUserId,
  });

  final String tournamentId;
  final String? organizerUserId;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      child: BlocBuilder<TournamentScheduleCubit, TournamentScheduleState>(
        builder: (context, state) {
          return switch (state) {
            TournamentScheduleInitial() => const _InfoBox(
              message:
                  'No hay calendario disponible todavía. El organizador debe generarlo cuando haya suficientes participantes.',
            ),
            TournamentScheduleLoading() => const Center(
              child: CircularProgressIndicator(),
            ),
            TournamentScheduleGenerating() => const Center(
              child: CircularProgressIndicator(),
            ),
            TournamentScheduleUnsupported() => const _InfoBox(
              message:
                  'Este formato de torneo no permite generar el calendario automáticamente.',
            ),
            TournamentScheduleConflict() => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const _InfoBox(
                  message: 'Ya se generó el calendario del torneo.',
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 40),
                        ),
                        onPressed: () =>
                            context.read<TournamentScheduleCubit>().load(),
                        icon: const Icon(Icons.calendar_view_week_outlined),
                        label: const Text('Ver calendario'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 40),
                        ),
                        onPressed: () =>
                            context.read<TournamentScheduleCubit>().generate(),
                        icon: const Icon(Icons.refresh),
                        label: const Text('Regenerar'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            //? Esta Column no tenía scroll propio: en pantallas bajas el
            //? contador de participantes y el CTA de generar calendario
            //? desbordaban y quedaban fuera de alcance. El scroll va sólo acá
            //? — la rama de éxito ya es un ListView y anidarlo lo rompe.
            TournamentScheduleEmpty() => SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _InfoBox(
                    message:
                        'El organizador debe generar el calendario cuando haya al menos 2 participantes.',
                  ),
                  const SizedBox(height: 12),
                  BlocBuilder<
                    TournamentRegistrationsCubit,
                    TournamentRegistrationsState
                  >(
                    builder: (context, regState) {
                      final registrations =
                          regState is TournamentRegistrationsLoaded
                          ? regState.items
                          : const <TournamentRegistrationDto>[];
                      final missing = 2 - registrations.length;
                      final enoughParticipants = registrations.length >= 2;
                      final cubit = context
                          .read<TournamentRegistrationsCubit>();

                      // Si organizerUserId es null, aún no cargaron los datos del torneo
                      if (organizerUserId == null) {
                        return const Center(child: CircularProgressIndicator());
                      }

                      final isOrganizer =
                          cubit.currentUserId == organizerUserId;

                      // Solo el organizador puede generar el calendario
                      if (!isOrganizer) {
                        return const _InfoBox(
                          message:
                              'Solo el organizador puede generar el calendario.',
                        );
                      }

                      //? Mostrar contador y CTA clara
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Participantes: ${registrations.length}/2',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onSurfaceVariant,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                          const SizedBox(height: 8),
                          FilledButton(
                            onPressed: enoughParticipants
                                ? () => context
                                      .read<TournamentScheduleCubit>()
                                      .generate()
                                : null,
                            child: const Text('Generar calendario'),
                          ),
                          if (!enoughParticipants) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Se necesitan $missing participante${missing == 1 ? '' : 's'} más.',
                              style: TextStyle(
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurfaceVariant,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
            TournamentScheduleError(:final message) => _ErrorBox(
              message: message,
              onRetry: () => context.read<TournamentScheduleCubit>().load(),
            ),
            TournamentScheduleSuccess(:final schedule) => _ScheduleList(
              schedule: schedule,
            ),
          };
        },
      ),
    );
  }
}

final class _ScoreboardTab extends StatelessWidget {
  const _ScoreboardTab({
    required this.tournamentId,
    required this.tournamentsRepository,
  });

  final String tournamentId;
  final TournamentsRepository tournamentsRepository;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      child: BlocBuilder<TournamentScoreboardCubit, TournamentScoreboardState>(
        builder: (context, state) {
          return switch (state) {
            TournamentScoreboardInitial() => const Center(
              child: CircularProgressIndicator(),
            ),
            TournamentScoreboardLoading() => const Center(
              child: CircularProgressIndicator(),
            ),
            TournamentScoreboardEmpty() => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const _InfoBox(
                  message:
                      'La clasificación estará disponible cuando comience el torneo.',
                ),
                const SizedBox(height: 12),
                Text(
                  '💡 Para registrar resultados, ve a la pestaña "Calendario" y toca el partido.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            TournamentScoreboardError(:final message) => _ErrorBox(
              message: message,
              onRetry: () => context.read<TournamentScoreboardCubit>().load(),
            ),
            TournamentScoreboardSuccess(:final scoreboard) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _ScoreboardTable(scoreboard: scoreboard),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () {
                    showModalBottomSheet<void>(
                      context: context,
                      isScrollControlled: true,
                      builder: (_) => SizedBox(
                        height: MediaQuery.sizeOf(context).height * 0.9,
                        child: BracketScreen(
                          tournamentId: tournamentId,
                          tournamentsRepository: tournamentsRepository,
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.table_chart),
                  label: const Text('Ver el cuadro completo'),
                ),
              ],
            ),
          };
        },
      ),
    );
  }
}

final class _RegistrationsTab extends StatelessWidget {
  const _RegistrationsTab({
    required this.tournamentId,
    required this.organizerUserId,
    required this.tournamentStatus,
    required this.pairedRegistration,
  });

  final String tournamentId;
  final String? organizerUserId;
  final String? tournamentStatus;

  /// `true` en torneos de duplas fijas: el roster se muestra por pareja y el
  /// organizador puede emparejar. En torneo individual no cambia nada.
  final bool pairedRegistration;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      child: BlocBuilder<TournamentRegistrationsCubit, TournamentRegistrationsState>(
        builder: (context, state) {
          if (state is TournamentRegistrationsLoading ||
              state is TournamentRegistrationsInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is TournamentRegistrationsFailure) {
            return _ErrorBox(
              message: state.message,
              onRetry: () =>
                  context.read<TournamentRegistrationsCubit>().load(),
            );
          }

          final loaded = state as TournamentRegistrationsLoaded;
          final activeItems = loaded.items
              .where((r) => r.status != 'WITHDRAWN')
              .toList();
          final authenticatedItems = activeItems
              .where((r) => !r.isGuest)
              .toList();
          final guestItems = activeItems.where((r) => r.isGuest).toList();
          final cubit = context.read<TournamentRegistrationsCubit>();
          final currentUserId = cubit.currentUserId;
          final myPendingInvite = currentUserId != null
              ? loaded.pendingInvitationFor(currentUserId)
              : null;

          // Organizer-only affordance; the backend enforces the real guard
          // independently (see `assertTournamentOrganizerAccess` on every
          // guest-management use case).
          final isOrganizer = _isOrganizer(organizerUserId, currentUserId);
          // Mirrors the backend's DRAFT/OPEN guard on invite-guest, PATCH
          // confirm, and DELETE (Slice 1: tournament-guest-registration).
          // Defaults to allowed when the tournament's status isn't known
          // here (e.g. navigated to directly, without list-item `extra`).
          final guestActionsAllowed =
              tournamentStatus == null ||
              _kOrganizerManageableStatuses.contains(tournamentStatus);
          final canManageGuests = isOrganizer && guestActionsAllowed;
          final pendingCount = activeItems
              .where((r) => r.status == 'PENDING')
              .length;
          final confirmedCount = activeItems
              .where((r) => r.status == 'CONFIRMED')
              .length;

          return ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              if (canManageGuests) ...[
                _OrganizerRosterHeader(
                  total: activeItems.length,
                  confirmed: confirmedCount,
                  pending: pendingCount,
                  busy: loaded.busyRegistrationId != null,
                  onConfirmAll: pendingCount == 0
                      ? null
                      : () => cubit.confirmPendingRegistrations(),
                ),
                const SizedBox(height: 16),
              ],
              //? Error messages centralizadas arriba
              if (loaded.registerError != null ||
                  loaded.invitationError != null ||
                  loaded.registrationActionError != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(
                      context,
                    ).colorScheme.errorContainer.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Theme.of(
                        context,
                      ).colorScheme.error.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Text(
                    loaded.registerError ??
                        loaded.invitationError ??
                        loaded.registrationActionError!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              //? Pending invite banner si existe
              if (myPendingInvite != null) ...[
                _PendingInviteBanner(
                  invitation: myPendingInvite,
                  responding: loaded.responding,
                  onAccept: () => cubit.acceptInvitation(myPendingInvite.id),
                  onReject: () => cubit.rejectInvitation(myPendingInvite.id),
                ),
                const SizedBox(height: 12),
              ],
              //? Invitaciones organizador al TOP (antes de lista de participantes)
              if (loaded.canManageInvitations) ...[
                _OrganizerInvitationsSection(
                  tournamentId: tournamentId,
                  invitations: loaded.invitations
                      .where((i) => i.isPending)
                      .toList(),
                  busy: loaded.inviting,
                ),
                const SizedBox(height: 12),
              ],
              //? Header de participantes
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${activeItems.length} inscrito${activeItems.length == 1 ? '' : 's'}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  if (canManageGuests)
                    FilledButton.icon(
                      key: const Key('tournament.inviteGuestButton'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 40),
                      ),
                      onPressed: () => showInviteGuestSheet(context),
                      icon: const Icon(Icons.person_add_alt_1),
                      label: const Text('Invitar jugador'),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              //? Mostrar organizador al principio si no está en la lista de participantes
              if (organizerUserId != null &&
                  !activeItems.any((r) => r.userId == organizerUserId)) ...[
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(
                        context,
                      ).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: Theme.of(
                          context,
                        ).colorScheme.primary.withValues(alpha: 0.5),
                      ),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: Theme.of(
                            context,
                          ).colorScheme.primary,
                          child: Text(
                            '👤',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Organizador',
                                style: Theme.of(context).textTheme.labelSmall
                                    ?.copyWith(
                                      color: Theme.of(
                                        context,
                                      ).colorScheme.primary,
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                organizerUserId ?? 'Desconocido',
                                style: Theme.of(context).textTheme.bodyMedium,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              //? El calendario se arma solo con los confirmados. Enterarse de
              //? que falta gente al recibir el error es tarde: el aviso va
              //? antes, con el boton que lo resuelve al lado.
              if (canManageGuests && activeItems.isNotEmpty) ...[
                Builder(
                  builder: (context) {
                    final summary = summarizeRoster(
                      registrations: activeItems,
                      paired: pairedRegistration,
                    );
                    final warning = summary.warning;
                    if (warning == null) return const SizedBox.shrink();

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _InfoBox(message: warning),
                          if (summary.pending > 0) ...[
                            const SizedBox(height: 8),
                            FilledButton.icon(
                              key: const Key('tournament.confirmPendingButton'),
                              onPressed: loaded.busyRegistrationId != null
                                  ? null
                                  : () => context
                                        .read<TournamentRegistrationsCubit>()
                                        .confirmPendingRegistrations(),
                              icon: const Icon(AppIcons.checkCircle, size: 18),
                              label: Text(
                                'Confirmar a los ${summary.pending} pendientes',
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
              ],
              if (activeItems.isEmpty)
                const _InfoBox(
                  message:
                      'Aún no hay participantes. ¡Compartí el torneo para que más jugadores se inscriban!',
                )
              //? Torneo de duplas fijas: el roster se lee por pareja, no por
              //? persona. Cuatro filas sueltas no dicen quien juega con quien, y
              //? el organizador necesita ver a quien le falta companero antes de
              //? generar el cuadro.
              else if (pairedRegistration)
                TournamentPairingSection(
                  roster: groupRosterIntoPairs(
                    registrations: activeItems,
                    paired: true,
                  ),
                  canManage: canManageGuests,
                  busyRegistrationId: loaded.busyRegistrationId,
                  onPair: (first, second) => context
                      .read<TournamentRegistrationsCubit>()
                      .pairRegistrations(first, second),
                  onUnpair: (id) => context
                      .read<TournamentRegistrationsCubit>()
                      .unpairRegistration(id),
                )
              else ...[
                for (final reg in authenticatedItems)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _RegistrationTile(
                      registration: reg,
                      canManage: false,
                      busy: false,
                    ),
                  ),
                if (guestItems.isNotEmpty) ...[
                  if (authenticatedItems.isNotEmpty) const SizedBox(height: 4),
                  const _RegistrationsGroupHeader(label: 'Invitados'),
                  const SizedBox(height: 6),
                  for (final reg in guestItems)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _RegistrationTile(
                        registration: reg,
                        canManage: canManageGuests,
                        busy: loaded.busyRegistrationId == reg.id,
                      ),
                    ),
                ],
              ],
            ],
          );
        },
      ),
    );
  }
}

final class _RegistrationsGroupHeader extends StatelessWidget {
  const _RegistrationsGroupHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: Theme.of(context).textTheme.labelLarge?.copyWith(
        color: Theme.of(context).colorScheme.onSurfaceVariant,
        fontWeight: FontWeight.w800,
      ),
    );
  }
}

final class _OrganizerRosterHeader extends StatelessWidget {
  const _OrganizerRosterHeader({
    required this.total,
    required this.confirmed,
    required this.pending,
    required this.busy,
    required this.onConfirmAll,
  });

  final int total;
  final int confirmed;
  final int pending;
  final bool busy;
  final VoidCallback? onConfirmAll;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: _OrganizerCount(label: 'Inscriptos', value: total),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _OrganizerCount(label: 'Confirmados', value: confirmed),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _OrganizerCount(
                label: 'Pendientes',
                value: pending,
                accent: pending > 0 ? scheme.primary : null,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: busy ? null : onConfirmAll,
          icon: const Icon(Icons.check, size: 19),
          label: Text(
            pending > 0 ? 'Confirmar $pending pendientes' : 'Todos confirmados',
          ),
        ),
        const SizedBox(height: 6),
        Text(
          pending > 0
              ? 'Un toque confirma a todos y les llega el aviso solo. No hace falta mandar nada.'
              : 'Todos confirmados. Cada uno ya recibió su aviso.',
          style: TextStyle(
            color: scheme.onSurfaceVariant,
            fontSize: 12,
            height: 1.45,
          ),
        ),
      ],
    );
  }
}

final class _OrganizerCount extends StatelessWidget {
  const _OrganizerCount({
    required this.label,
    required this.value,
    this.accent,
  });

  final String label;
  final int value;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: accent ?? scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        children: [
          Text(
            '$value',
            style: TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w800,
              color: accent ?? scheme.onSurface,
            ),
          ),
          const SizedBox(height: 1),
          Text(
            label,
            style: TextStyle(fontSize: 11.5, color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

/// Translates registration status for display in Spanish.
String _registrationStatusLabel(String status) {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'CONFIRMED':
      return 'Confirmado';
    case 'WITHDRAWN':
      return 'Retirado';
    default:
      return status;
  }
}

/// A single roster row. For guests with [canManage] true, shows a confirm
/// action (PENDING only) and a remove action (any status), both organizer-
/// only and hidden once the tournament closes for guest management.
final class _RegistrationTile extends StatelessWidget {
  const _RegistrationTile({
    required this.registration,
    required this.canManage,
    required this.busy,
  });

  final TournamentRegistrationDto registration;
  final bool canManage;
  final bool busy;

  Future<void> _confirmRemoveSV(BuildContext context) async {
    final cubit = context.read<TournamentRegistrationsCubit>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Eliminar jugador'),
        content: Text(
          '¿Estás seguro que querés eliminar a ${registration.displayName} del torneo?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      cubit.removeRegistration(registration.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final label = registration.displayName;
    final statusLabel = _registrationStatusLabel(registration.status);
    final avatarLabel = label
        .substring(0, label.length >= 2 ? 2 : label.length)
        .toUpperCase();

    //? Color del badge según status
    Color statusColorSV(String status) {
      switch (status) {
        case 'PENDING':
          return Colors.orange;
        case 'CONFIRMED':
          return Colors.green;
        default:
          return Colors.grey;
      }
    }

    //? Highlight si es invitado pendiente
    final isPendingGuest =
        registration.isGuest && registration.status == 'PENDING';
    final scheme = Theme.of(context).colorScheme;

    return Container(
      key: Key('tournament.registrationTile.${registration.id}'),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isPendingGuest
            ? scheme.primaryContainer.withValues(alpha: 0.15)
            : scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: isPendingGuest
            ? Border.all(color: scheme.primary.withValues(alpha: 0.3))
            : null,
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: registration.isGuest
                ? Colors.amber.withValues(alpha: 0.3)
                : scheme.primaryContainer,
            child: Text(
              avatarLabel,
              style: TextStyle(
                color: registration.isGuest
                    ? Colors.amber[700]
                    : scheme.onPrimaryContainer,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        label,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                    //? Status badge con color
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: statusColorSV(
                          registration.status,
                        ).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        statusLabel,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: statusColorSV(registration.status),
                        ),
                      ),
                    ),
                  ],
                ),
                if (isPendingGuest) ...[
                  const SizedBox(height: 4),
                  Text(
                    '⚠️ Requiere confirmación',
                    style: TextStyle(
                      fontSize: 11,
                      color: scheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ] else
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      registration.isGuest ? 'Invitado' : 'Participante',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (canManage) ...[
            if (busy)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            else ...[
              if (registration.status == 'PENDING')
                IconButton(
                  key: Key('tournament.confirmRegistration.${registration.id}'),
                  tooltip: 'Confirmar',
                  icon: const Icon(Icons.check_circle_outline),
                  onPressed: () => context
                      .read<TournamentRegistrationsCubit>()
                      .confirmRegistration(registration.id),
                ),
              IconButton(
                key: Key('tournament.removeRegistration.${registration.id}'),
                tooltip: 'Eliminar',
                icon: const Icon(Icons.delete_outline),
                onPressed: () => _confirmRemoveSV(context),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

/// Banner shown to a player with a PENDING invitation for this tournament,
/// with accept/reject actions (spec R4: "Player sees pending invite").
final class _PendingInviteBanner extends StatelessWidget {
  const _PendingInviteBanner({
    required this.invitation,
    required this.responding,
    required this.onAccept,
    required this.onReject,
    this.onOpen,
  });

  final TournamentInvitationDto invitation;
  final bool responding;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final VoidCallback? onOpen;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      key: const Key('tournament.pendingInviteBanner'),
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.primaryContainer.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tenés una invitación pendiente para este torneo.',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              color: scheme.onPrimaryContainer,
            ),
          ),
          if (onOpen != null)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: onOpen,
                child: const Text('Ver invitación →'),
              ),
            ),
          const SizedBox(height: 10),
          Row(
            children: [
              FilledButton(
                //? Ancho acotado (dentro de un Row).
                style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
                onPressed: responding ? null : onAccept,
                child: const Text('Aceptar'),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                //? Ancho acotado (dentro de un Row).
                style: OutlinedButton.styleFrom(minimumSize: const Size(0, 40)),
                onPressed: responding ? null : onReject,
                child: const Text('Rechazar'),
              ),
              if (responding) ...[
                const SizedBox(width: 12),
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

/// Organizer-only invitation management: send a new invite and cancel
/// pending ones. Only rendered when the invitations read succeeded with
/// organizer privileges (`TournamentRegistrationsLoaded.canManageInvitations`).
final class _OrganizerInvitationsSection extends StatefulWidget {
  const _OrganizerInvitationsSection({
    required this.tournamentId,
    required this.invitations,
    required this.busy,
  });

  final String tournamentId;
  final List<TournamentInvitationDto> invitations;
  final bool busy;

  @override
  State<_OrganizerInvitationsSection> createState() =>
      _OrganizerInvitationsSectionState();
}

final class _OrganizerInvitationsSectionState
    extends State<_OrganizerInvitationsSection> {
  final _userIdController = TextEditingController();

  @override
  void dispose() {
    _userIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final cubit = context.read<TournamentRegistrationsCubit>();

    return Container(
      key: const Key('tournament.organizerInvitations'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Invitar jugador',
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _userIdController,
                  decoration: const InputDecoration(
                    hintText: 'Nombre o ID del jugador',
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                //? Ancho acotado (dentro de un Row).
                style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
                onPressed: widget.busy
                    ? null
                    : () {
                        final userId = _userIdController.text.trim();
                        if (userId.isEmpty) return;
                        cubit.invite(userId);
                        _userIdController.clear();
                      },
                child: const Text('Invitar'),
              ),
            ],
          ),
          if (widget.invitations.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              'Invitaciones enviadas',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            for (final invitation in widget.invitations)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Expanded(child: Text(invitation.invitedUserId)),
                    TextButton(
                      onPressed: widget.busy
                          ? null
                          : () => cubit.cancelInvitation(invitation.id),
                      child: const Text('Cancelar'),
                    ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}

final class _ScheduleList extends StatelessWidget {
  const _ScheduleList({required this.schedule});

  static final _dateFormat = DateFormat('dd MMM HH:mm', 'es_ES');

  final TournamentScheduleDto schedule;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      children: [
        for (final round in schedule.rounds) ...[
          Text(
            round.name.isEmpty ? 'Ronda' : round.name,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          if (round.matches.isEmpty)
            Text(
              'Sin partidos.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
              ),
            )
          else
            ...round.matches.map(
              (m) => _MatchTile(match: m, dateFormat: _dateFormat),
            ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }
}

final class _MatchTile extends StatelessWidget {
  const _MatchTile({required this.match, required this.dateFormat});

  final TournamentScheduleMatchDto match;
  final DateFormat dateFormat;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final canNavigateToLive = match.matchId != null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: canNavigateToLive
            ? () => context.push(Routes.matchLive(match.matchId!))
            : null,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: scheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      match.label.isEmpty ? 'Partido' : match.label,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    if (match.scheduledAt != null ||
                        match.courtName != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        [
                          if (match.scheduledAt != null)
                            dateFormat.format(match.scheduledAt!),
                          if (match.courtName != null) match.courtName!,
                        ].join(' · '),
                        style: TextStyle(
                          color: scheme.onSurfaceVariant,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Text(
                match.status,
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _ScoreboardTable extends StatelessWidget {
  const _ScoreboardTable({required this.scoreboard});

  final TournamentScoreboardDto scoreboard;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final rows = scoreboard.rows;
    if (rows.isEmpty) {
      return const _InfoBox(message: 'Aún no hay tabla para este torneo.');
    }
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columns: const [
          DataColumn(label: Text('Equipo')),
          DataColumn(label: Text('Pts')),
        ],
        rows: rows
            .map(
              (r) => DataRow(
                cells: [
                  DataCell(Text(r.teamName.isEmpty ? r.teamId : r.teamName)),
                  DataCell(
                    Text(
                      '${r.points}',
                      style: TextStyle(
                        color: scheme.primary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
            )
            .toList(),
      ),
    );
  }
}

final class _InfoBox extends StatelessWidget {
  const _InfoBox({required this.message, this.accent});

  final String message;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: accent ?? scheme.outlineVariant,
          width: accent == null ? 1 : 1.5,
        ),
      ),
      child: SelectableText.rich(
        TextSpan(
          text: message,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: scheme.onSurfaceVariant,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

final class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.errorContainer.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.error.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SelectableText.rich(
            TextSpan(
              text: message,
              style: TextStyle(
                color: scheme.error,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(AppIcons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }
}

/// Pestaña Info: responde "¿Puedo entrar?" con el bloque de eligibilidad.
final class _InfoTab extends StatelessWidget {
  const _InfoTab({
    required this.tournament,
    required this.playerRatings,
    required this.registration,
    required this.invited,
    this.invitation,
    this.onOpenInvitation,
  });

  final TournamentListItemDto? tournament;
  final List<UserRatingDto>? playerRatings;
  final TournamentRegistrationDto? registration;
  final bool invited;
  final TournamentInvitationDto? invitation;
  final VoidCallback? onOpenInvitation;

  @override
  Widget build(BuildContext context) {
    if (tournament == null) {
      return const Center(child: CircularProgressIndicator());
    }

    //? Convertir ratings a Map<String, String> para compatibilidad con resolver
    final ratingsMap = playerRatings?.map((r) {
      return {'categoryId': r.categoryId, 'categoryName': r.categoryName ?? ''};
    }).toList();

    final eligibility = resolveTournamentEligibilitySV(
      tournamentCategoryId: tournament!.categoryId,
      playerRatings: ratingsMap,
      playerIsInvited: invited,
    );

    //? Buscar la categoría del torneo en los ratings del jugador
    UserRatingDto? playerTournamentRating;
    if (playerRatings != null) {
      try {
        playerTournamentRating = playerRatings!.firstWhere(
          (r) => r.categoryId == tournament!.categoryId,
        );
      } catch (_) {
        // No está en los ratings del jugador
      }
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 130),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (invitation != null) ...[
            _PendingInviteBanner(
              invitation: invitation!,
              responding: false,
              onAccept: () => context
                  .read<TournamentRegistrationsCubit>()
                  .acceptInvitation(invitation!.id),
              onReject: () => context
                  .read<TournamentRegistrationsCubit>()
                  .rejectInvitation(invitation!.id),
              onOpen: onOpenInvitation,
            ),
            const SizedBox(height: 16),
          ],
          if (registration?.status == 'PENDING') ...[
            const _StatusBanner(
              tone: _BannerTone.warning,
              title: 'Te anotaste. Falta que te acepten.',
              body:
                  'El organizador confirma los inscriptos. Te avisamos apenas quedés adentro — no tenés que volver a entrar.',
            ),
            const SizedBox(height: 16),
          ],
          if (registration?.status == 'CONFIRMED') ...[
            _StatusBanner(
              tone: _BannerTone.success,
              title: 'Estás adentro',
              body: 'Inscripción confirmada.',
              action: () => DefaultTabController.of(context).animateTo(1),
            ),
            const SizedBox(height: 16),
          ],
          Text(
            '¿Puedo entrar?',
            style: _sectionStyle(Theme.of(context).colorScheme),
          ),
          const SizedBox(height: 10),
          TournamentEntryCheck(
            eligibility: eligibility,
            categoryName: tournament!.categoryName,
            playerCategoryName: playerTournamentRating?.categoryName,
            inscriptionPrice: tournament!.inscriptionPrice,
            startsAt: tournament!.startsAt,
            registrationClosesAt: tournament!.registrationClosesAt,
            venueName: tournament!.venueName,
          ),
          const SizedBox(height: 20),
          Text(
            'Cómo se juega',
            style: _sectionStyle(Theme.of(context).colorScheme),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _InfoTile(
                  label: 'Formato',
                  value: tournament!.sportName,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _InfoTile(label: 'Cuadro', value: 'Cupos no declarados'),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _InfoTile(
                  label: 'Anotados',
                  value: '${tournament!.registrationCount}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            'Inscriptos',
            style: _sectionStyle(Theme.of(context).colorScheme),
          ),
          const SizedBox(height: 10),
          _InfoBox(
            message:
                '${tournament!.registrationCount} confirmados${registration?.status == 'PENDING' ? '\nTu inscripción espera al organizador.' : ''}',
          ),
        ],
      ),
    );
  }
}

enum _BannerTone { success, warning }

final class _StatusBanner extends StatelessWidget {
  const _StatusBanner({
    required this.tone,
    required this.title,
    required this.body,
    this.action,
  });

  final _BannerTone tone;
  final String title;
  final String body;
  final VoidCallback? action;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = tone == _BannerTone.success
        ? scheme.primary
        : const Color(0xFFF59E0B);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.45), width: 1.5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            tone == _BannerTone.success ? Icons.check : Icons.schedule,
            color: color,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  body,
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    height: 1.4,
                    fontSize: 13,
                  ),
                ),
                if (action != null) ...[
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: action,
                    child: const Text('Ver mis partidos →'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

final class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      constraints: const BoxConstraints(minHeight: 78),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            value,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 11.5),
          ),
        ],
      ),
    );
  }
}
