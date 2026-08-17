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
import '../data/models/tournament_schedule_dto.dart';
import '../data/models/tournament_scoreboard_dto.dart';
import '../data/tournaments_repository.dart';
import 'cubit/tournament_registrations_cubit.dart';
import 'cubit/tournament_registrations_state.dart';
import 'cubit/tournament_schedule_cubit.dart';
import 'cubit/tournament_schedule_state.dart';
import 'cubit/tournament_scoreboard_cubit.dart';
import 'cubit/tournament_scoreboard_state.dart';

final class TournamentDetailScreen extends StatelessWidget {
  const TournamentDetailScreen({
    super.key,
    required this.tournamentId,
    this.extra,
  });

  final String tournamentId;
  final Object? extra;

  TournamentListItemDto? get tournament => extra as TournamentListItemDto?;

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) => getIt<TournamentScheduleCubit>(param1: tournamentId)..load(),
        ),
        BlocProvider(
          create: (_) => getIt<TournamentScoreboardCubit>(param1: tournamentId)..load(),
        ),
        BlocProvider(
          create: (_) => getIt<TournamentRegistrationsCubit>(param1: tournamentId)..load(),
        ),
      ],
      child: TournamentDetailBody(tournamentId: tournamentId, tournament: tournament),
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
              expandedHeight: tournament?.imageUrl != null ? 220 : 120,
              pinned: true,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.pop(),
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
                            errorBuilder: (_, __, ___) => _TournamentHeaderBg(tournament: tournament),
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
                    Tab(text: 'Fixture'),
                    Tab(text: 'Tabla'),
                    Tab(text: 'Inscripciones'),
                  ],
                ),
              ),
            ),
          ];
        },
        body: TabBarView(
          children: [
            _ScheduleTab(tournamentId: tournamentId),
            _ScoreboardTab(tournamentId: tournamentId),
            _RegistrationsTab(tournamentId: tournamentId),
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
              label: Text(isRegistered ? 'Desinscribirse' : 'Inscribirse'),
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
  });

  final String tournamentId;
  final String organizerUserId;
  final String currentStatus;

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
      if (context.mounted) {
        context.read<TournamentScheduleCubit>().load();
        context.read<TournamentRegistrationsCubit>().load();
      }
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

        return Column(
          key: const Key('tournament.organizerStatusControl'),
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_error != null) ...[
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12),
              ),
              const SizedBox(height: 4),
            ],
            Wrap(
              spacing: 8,
              children: [
                for (final next in nextStatuses)
                  OutlinedButton(
                    onPressed: _submitting ? null : () => _submitSV(next),
                    child: Text(_statusActionLabel(next)),
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
  const _ScheduleTab({required this.tournamentId});

  final String tournamentId;

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
                message: 'Este torneo no soporta generación automática de fixture.',
              ),
            TournamentScheduleConflict() => const _InfoBox(
                message: 'Ya existe un fixture generado. Refresca para verlo.',
              ),
            TournamentScheduleEmpty() => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _InfoBox(message: 'Aún no hay fixture para este torneo.'),
                  const SizedBox(height: 12),
                  BlocBuilder<TournamentRegistrationsCubit, TournamentRegistrationsState>(
                    builder: (context, regState) {
                      final participantIds = regState is TournamentRegistrationsLoaded
                          ? regState.items.map((r) => r.userId).toList()
                          : <String>[];
                      return FilledButton.icon(
                        onPressed: participantIds.length >= 2
                            ? () => context.read<TournamentScheduleCubit>().generate(
                                  participantUserIds: participantIds,
                                )
                            : null,
                        icon: const Icon(AppIcons.sparkle),
                        label: Text(
                          participantIds.length >= 2
                              ? 'Generar fixture'
                              : 'Se necesitan al menos 2 inscritos',
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
                message: 'Aún no hay tabla para este torneo.',
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
  const _RegistrationsTab({required this.tournamentId});

  final String tournamentId;

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
          final cubit = context.read<TournamentRegistrationsCubit>();
          final currentUserId = cubit.currentUserId;
          final myPendingInvite =
              currentUserId != null ? loaded.pendingInvitationFor(currentUserId) : null;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                '${activeItems.length} inscrito${activeItems.length == 1 ? '' : 's'}',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
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
              Expanded(
                child: activeItems.isEmpty
                    ? const _InfoBox(message: 'Aún no hay inscritos en este torneo.')
                    : ListView.separated(
                        itemCount: activeItems.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final reg = activeItems[index];
                          return Container(
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
                                    reg.userId.substring(0, 2).toUpperCase(),
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
                                      Text(
                                        reg.userId,
                                        style: const TextStyle(fontWeight: FontWeight.w600),
                                      ),
                                      Text(
                                        reg.status,
                                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
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
            'Tienes una invitación pendiente para este torneo.',
            style: TextStyle(fontWeight: FontWeight.w800, color: scheme.onPrimaryContainer),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              FilledButton(
                onPressed: responding ? null : onAccept,
                child: const Text('Aceptar'),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
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
                    hintText: 'ID de usuario a invitar',
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
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
              'Invitaciones pendientes',
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
