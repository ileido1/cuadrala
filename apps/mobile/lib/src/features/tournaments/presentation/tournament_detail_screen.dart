import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/failures/app_failure.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../data/models/tournament_invitation_dto.dart';
import '../data/models/tournament_list_item_dto.dart';
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
import 'widgets/invite_guest_sheet.dart';

/// Tournament statuses that still allow generating/regenerating the
/// schedule and managing guest registrations (organizer confirm/remove),
/// mirroring the backend's `STATUSES_ALLOWING_SCHEDULE_GENERATION` /
/// registration guards.
const _kOrganizerManageableStatuses = {'DRAFT', 'OPEN'};

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

  TournamentListItemDto? _tournament;
  bool _loadingTournament = false;

  @override
  void initState() {
    super.initState();
    _scheduleCubit = getIt<TournamentScheduleCubit>(param1: widget.tournamentId)..load();
    _scoreboardCubit = getIt<TournamentScoreboardCubit>(param1: widget.tournamentId)..load();
    _registrationsCubit = getIt<TournamentRegistrationsCubit>(param1: widget.tournamentId)..load();

    _tournament = widget.extra as TournamentListItemDto?;
    //? Si llegamos sin `extra` (p. ej. justo después de crear el torneo vía
    //? context.go) o sin organizerUserId (el listado no lo incluye), traemos
    //? el detalle por ID para que los controles de organizador se muestren.
    if (_tournament == null || _tournament?.organizerUserId == null) {
      _loadingTournament = true;
      _fetchTournament();
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

  @override
  void dispose() {
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
            ),
    );
  }
}

/// Body of [TournamentDetailScreen], separated so it can be pumped directly
/// in widget tests against mocked cubits (see `tournament_detail_screen_test.dart`).
@visibleForTesting
final class TournamentDetailBody extends StatelessWidget {
  const TournamentDetailBody({super.key, required this.tournamentId, required this.tournament});

  final String tournamentId;
  final TournamentListItemDto? tournament;

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy', 'es_ES');

    // A `DefaultTabController` is required by the `TabBar`/`TabBarView` pair
    // below; without it, mounting this screen throws
    // "No TabController for TabBarView" (pre-existing gap fixed here since
    // it blocks every tab, including the invitations/schedule work below).
    return DefaultTabController(
      length: 3,
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
              expandedHeight: tournament?.imageUrl != null ? 220 : 136,
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
              actions: [
                IconButton(
                  onPressed: () => context.push(Routes.tournamentChat(tournamentId)),
                  icon: const Icon(AppIcons.chat),
                  tooltip: 'Chat del torneo',
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: tournament?.imageUrl != null
                    ? Stack(
                        fit: StackFit.expand,
                        children: [
                          Image.network(
                            tournament!.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => _TournamentHeaderBg(tournament: tournament),
                          ),
                          Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.transparent,
                                  Colors.black.withValues(alpha: 0.7),
                                ],
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 16,
                            left: 16,
                            right: 16,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  tournament!.name,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${tournament!.sportName} · ${tournament!.categoryName}',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      )
                    : _TournamentHeaderBg(tournament: tournament),
              ),
            ),

            // Info row
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Row(
                  children: [
                    _StatusBadge(status: tournament?.status ?? ''),
                    if (tournament?.visibility == 'PRIVATE') ...[
                      const SizedBox(width: 8),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.lock_outline,
                              size: 13,
                              color: Theme.of(context).colorScheme.onSurfaceVariant),
                          const SizedBox(width: 3),
                          Text(
                            'Privado',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color:
                                      Theme.of(context).colorScheme.onSurfaceVariant,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(width: 12),
                    if (tournament?.startsAt != null) ...[
                      Icon(Icons.calendar_today, size: 14,
                          color: Theme.of(context).colorScheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(
                        dateFormat.format(tournament!.startsAt!),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ],
                    const Spacer(),
                    _EnrollButton(tournamentId: tournamentId),
                  ],
                ),
              ),
            ),

            // Organizer-only status transition control
            if (tournament?.organizerUserId != null)
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
            if (tournament?.organizerUserId != null)
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

            // Tab bar
            SliverPersistentHeader(
              pinned: true,
              delegate: _TabBarDelegate(
                TabBar(
                  labelColor: Theme.of(context).colorScheme.primary,
                  unselectedLabelColor: Theme.of(context).colorScheme.onSurfaceVariant,
                  indicatorColor: Theme.of(context).colorScheme.primary,
                  tabs: const [
                    Tab(text: 'Calendario'),
                    Tab(text: 'Clasificación'),
                    Tab(text: 'Inscriptos'),
                  ],
                ),
              ),
            ),
          ];
        },
        body: TabBarView(
          children: [
            _ScheduleTab(
              tournamentId: tournamentId,
              organizerUserId: tournament?.organizerUserId,
            ),
            _ScoreboardTab(tournamentId: tournamentId),
            _RegistrationsTab(
              tournamentId: tournamentId,
              organizerUserId: tournament?.organizerUserId,
              tournamentStatus: tournament?.status,
            ),
          ],
        ),
      ),
      ),
    );
  }
}

final class _TournamentHeaderBg extends StatelessWidget {
  const _TournamentHeaderBg({required this.tournament});
  final TournamentListItemDto? tournament;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: tournament != null
          ? Padding(
              padding: const EdgeInsets.fromLTRB(16, 56, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    tournament!.name,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${tournament!.sportName} · ${tournament!.categoryName}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ],
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
    final color = _statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        _label(status),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s.toUpperCase()) {
      case 'REGISTRATION_OPEN':
        return Colors.green;
      case 'REGISTRATION_CLOSED':
        return Colors.orange;
      case 'IN_PROGRESS':
        return Colors.blue;
      case 'FINISHED':
        return Colors.indigo;
      case 'CANCELLED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _label(String s) {
    switch (s.toUpperCase()) {
      case 'DRAFT':
        return 'Borrador';
      case 'REGISTRATION_OPEN':
        return 'Inscripciones abiertas';
      case 'REGISTRATION_CLOSED':
        return 'Inscripciones cerradas';
      case 'IN_PROGRESS':
        return 'En curso';
      case 'FINISHED':
        return 'Finalizado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return s;
    }
  }
}

final class _EnrollButton extends StatelessWidget {
  const _EnrollButton({required this.tournamentId});
  final String tournamentId;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<TournamentRegistrationsCubit, TournamentRegistrationsState>(
      builder: (context, state) {
        if (state is! TournamentRegistrationsLoaded) {
          return const SizedBox.shrink();
        }
        final cubit = context.read<TournamentRegistrationsCubit>();
        final isRegistered = cubit.isCurrentUserRegistered;
        final isLoading = state.registering;
        final status = state.registerError;

        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (status != null)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Text(
                  status,
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ),
            FilledButton.icon(
              //? El theme global usa Size.fromHeight(48) (ancho mínimo = ∞),
              //? que revienta dentro de un Row (ancho sin límite). Acá se
              //? acota para que el botón se ajuste a su contenido.
              style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
              onPressed: isLoading
                  ? null
                  : () {
                      if (isRegistered) {
                        cubit.withdraw();
                      } else {
                        cubit.register();
                      }
                    },
              icon: isLoading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(isRegistered ? Icons.person_remove : Icons.person_add),
              label: Text(isRegistered ? 'Cancelar inscripción' : 'Inscribirse'),
            ),
          ],
        );
      },
    );
  }
}

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
    return BlocBuilder<TournamentRegistrationsCubit, TournamentRegistrationsState>(
      builder: (context, state) {
        final cubit = context.read<TournamentRegistrationsCubit>();
        if (cubit.currentUserId == null || cubit.currentUserId != widget.organizerUserId) {
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
                        style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
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
    return BlocBuilder<TournamentRegistrationsCubit, TournamentRegistrationsState>(
      builder: (context, state) {
        final cubit = context.read<TournamentRegistrationsCubit>();
        if (cubit.currentUserId == null || cubit.currentUserId != widget.organizerUserId) {
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
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
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
            TournamentScheduleInitial() => const Center(child: CircularProgressIndicator()),
            TournamentScheduleLoading() => const Center(child: CircularProgressIndicator()),
            TournamentScheduleGenerating() => const Center(child: CircularProgressIndicator()),
            TournamentScheduleUnsupported() => const _InfoBox(
                message: 'Este formato de torneo no permite generar el calendario automáticamente.',
              ),
            TournamentScheduleConflict() => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _InfoBox(message: 'Ya se generó el calendario del torneo.'),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    //? Ancho acotado (el theme global no aplica en Column stretch).
                    style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
                    onPressed: () =>
                        context.read<TournamentScheduleCubit>().load(),
                    icon: const Icon(Icons.calendar_view_week_outlined),
                    label: const Text('Ver calendario'),
                  ),
                ],
              ),
            TournamentScheduleEmpty() => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _InfoBox(
                    message:
                        'El organizador debe generar el calendario cuando haya al menos 2 participantes.',
                  ),
                  const SizedBox(height: 12),
                  BlocBuilder<TournamentRegistrationsCubit, TournamentRegistrationsState>(
                    builder: (context, regState) {
                      final registrations = regState is TournamentRegistrationsLoaded
                          ? regState.items
                          : const <TournamentRegistrationDto>[];
                      final missing = 2 - registrations.length;
                      final enoughParticipants = registrations.length >= 2;
                      final cubit = context.read<TournamentRegistrationsCubit>();

                      // Si organizerUserId es null, aún no cargaron los datos del torneo
                      if (organizerUserId == null) {
                        return const Center(child: CircularProgressIndicator());
                      }

                      final isOrganizer = cubit.currentUserId == organizerUserId;

                      // Solo el organizador puede generar el calendario
                      if (!isOrganizer) {
                        return const _InfoBox(
                          message: 'Solo el organizador puede generar el calendario.',
                        );
                      }

                      return FilledButton(
                        onPressed: enoughParticipants
                            ? () => context.read<TournamentScheduleCubit>().generate()
                            : null,
                        child: Text(
                          enoughParticipants
                              ? 'Generar calendario'
                              : 'Faltan $missing participante${missing == 1 ? '' : 's'}',
                        ),
                      );
                    },
                  ),
                ],
              ),
            TournamentScheduleError(:final message) => _ErrorBox(
                message: message,
                onRetry: () => context.read<TournamentScheduleCubit>().load(),
              ),
            TournamentScheduleSuccess(:final schedule) => _ScheduleList(schedule: schedule),
          };
        },
      ),
    );
  }
}

final class _ScoreboardTab extends StatelessWidget {
  const _ScoreboardTab({required this.tournamentId});

  final String tournamentId;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      child: BlocBuilder<TournamentScoreboardCubit, TournamentScoreboardState>(
        builder: (context, state) {
          return switch (state) {
            TournamentScoreboardInitial() => const Center(child: CircularProgressIndicator()),
            TournamentScoreboardLoading() => const Center(child: CircularProgressIndicator()),
            TournamentScoreboardEmpty() => const _InfoBox(
                message: 'La clasificación estará disponible cuando comience el torneo.',
              ),
            TournamentScoreboardError(:final message) => _ErrorBox(
                message: message,
                onRetry: () => context.read<TournamentScoreboardCubit>().load(),
              ),
            TournamentScoreboardSuccess(:final scoreboard) =>
              _ScoreboardTable(scoreboard: scoreboard),
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
  });

  final String tournamentId;
  final String? organizerUserId;
  final String? tournamentStatus;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      child: BlocBuilder<TournamentRegistrationsCubit, TournamentRegistrationsState>(
        builder: (context, state) {
          if (state is TournamentRegistrationsLoading || state is TournamentRegistrationsInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is TournamentRegistrationsFailure) {
            return _ErrorBox(
              message: state.message,
              onRetry: () => context.read<TournamentRegistrationsCubit>().load(),
            );
          }

          final loaded = state as TournamentRegistrationsLoaded;
          final activeItems = loaded.items.where((r) => r.status != 'WITHDRAWN').toList();
          final authenticatedItems = activeItems.where((r) => !r.isGuest).toList();
          final guestItems = activeItems.where((r) => r.isGuest).toList();
          final cubit = context.read<TournamentRegistrationsCubit>();
          final currentUserId = cubit.currentUserId;
          final myPendingInvite =
              currentUserId != null ? loaded.pendingInvitationFor(currentUserId) : null;

          // Organizer-only affordance; the backend enforces the real guard
          // independently (see `assertTournamentOrganizerAccess` on every
          // guest-management use case).
          final isOrganizer = organizerUserId != null && currentUserId == organizerUserId;
          // Mirrors the backend's DRAFT/OPEN guard on invite-guest, PATCH
          // confirm, and DELETE (Slice 1: tournament-guest-registration).
          // Defaults to allowed when the tournament's status isn't known
          // here (e.g. navigated to directly, without list-item `extra`).
          final guestActionsAllowed =
              tournamentStatus == null || _kOrganizerManageableStatuses.contains(tournamentStatus);
          final canManageGuests = isOrganizer && guestActionsAllowed;

          return ListView(
            children: [
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
                      //? Ancho acotado: el theme global (Size.fromHeight) no
                      //? puede usarse dentro de un Row.
                      style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
                      onPressed: () => showInviteGuestSheet(context),
                      icon: const Icon(Icons.person_add_alt_1),
                      label: const Text('Invitar jugador'),
                    ),
                ],
              ),
              if (loaded.registerError != null) ...[
                const SizedBox(height: 8),
                Text(
                  loaded.registerError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              if (loaded.invitationError != null) ...[
                const SizedBox(height: 8),
                Text(
                  loaded.invitationError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              if (loaded.registrationActionError != null) ...[
                const SizedBox(height: 8),
                Text(
                  loaded.registrationActionError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              if (myPendingInvite != null) ...[
                const SizedBox(height: 12),
                _PendingInviteBanner(
                  invitation: myPendingInvite,
                  responding: loaded.responding,
                  onAccept: () => cubit.acceptInvitation(myPendingInvite.id),
                  onReject: () => cubit.rejectInvitation(myPendingInvite.id),
                ),
              ],
              if (loaded.canManageInvitations) ...[
                const SizedBox(height: 12),
                _OrganizerInvitationsSection(
                  tournamentId: tournamentId,
                  invitations: loaded.invitations.where((i) => i.isPending).toList(),
                  busy: loaded.inviting,
                ),
              ],
              const SizedBox(height: 12),
              if (activeItems.isEmpty)
                const _InfoBox(
                  message:
                      'Aún no hay participantes. ¡Compartí el torneo para que más jugadores se inscriban!',
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
        content: Text('¿Estás seguro que querés eliminar a ${registration.displayName} del torneo?'),
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
    final avatarLabel = label.substring(0, label.length >= 2 ? 2 : label.length).toUpperCase();

    return Container(
      key: Key('tournament.registrationTile.${registration.id}'),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
            child: Text(
              avatarLabel,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onPrimaryContainer,
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
                Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(
                  statusLabel,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
          if (registration.isGuest && canManage) ...[
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
  });

  final TournamentInvitationDto invitation;
  final bool responding;
  final VoidCallback onAccept;
  final VoidCallback onReject;

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
            style: TextStyle(fontWeight: FontWeight.w800, color: scheme.onPrimaryContainer),
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
  State<_OrganizerInvitationsSection> createState() => _OrganizerInvitationsSectionState();
}

final class _OrganizerInvitationsSectionState extends State<_OrganizerInvitationsSection> {
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
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
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
                      onPressed:
                          widget.busy ? null : () => cubit.cancelInvitation(invitation.id),
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

  final TournamentScheduleDto schedule;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      children: [
        for (final round in schedule.rounds) ...[
          Text(
            round.name.isEmpty ? 'Ronda' : round.name,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
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
              (m) {
                final canNavigateToLive = m.matchId != null;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: canNavigateToLive
                        ? () => context.push(Routes.matchLive(m.matchId!))
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
                                  m.label.isEmpty ? 'Partido' : m.label,
                                  style: const TextStyle(fontWeight: FontWeight.w900),
                                ),
                                if (m.scheduledAt != null || m.courtName != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    [
                                      if (m.scheduledAt != null)
                                        DateFormat('dd MMM HH:mm', 'es_ES').format(m.scheduledAt!),
                                      if (m.courtName != null) m.courtName!,
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
                            m.status,
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
              },
            ),
          const SizedBox(height: 16),
        ],
      ],
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
  const _InfoBox({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant),
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
