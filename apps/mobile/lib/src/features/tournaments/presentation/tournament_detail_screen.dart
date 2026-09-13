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
part 'tournament_detail/header_footer.dart';
part 'tournament_detail/player_tabs.dart';
part 'tournament_detail/org_bracket_tab.dart';
part 'tournament_detail/org_publish_tab.dart';
part 'tournament_detail/org_registrations_tab.dart';

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
