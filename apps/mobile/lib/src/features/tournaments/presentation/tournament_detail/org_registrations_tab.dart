part of '../tournament_detail_screen.dart';

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
          // Org Inscriptos groups by status, not by guest/authenticated
          // (spec "Org Inscriptos — grouping and per-row actions"): guests
          // and authenticated players interleave inside the same "Pendientes"
          // / "Confirmados" sections.
          final pendingItems = activeItems
              .where((r) => r.status == 'PENDING')
              .toList();
          final confirmedItems = activeItems
              .where((r) => r.status == 'CONFIRMED')
              .toList();
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
          final pendingCount = pendingItems.length;
          final confirmedCount = confirmedItems.length;

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
                  //? Rejected invitations render with a "Rechazó" label
                  //? instead of being filtered out (spec "Org Inscriptos —
                  //? grouping and per-row actions"; M10b). Accepted ones
                  //? became a registration already; cancelled ones are gone.
                  invitations: loaded.invitations
                      .where((i) => i.isPending || i.isRejected)
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
                      '${activeItems.length} ${activeItems.length == 1 ? 'inscripto' : 'inscriptos'}',
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
                      icon: const Icon(AppIcons.personAdd),
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
              //? Agrupa por status (Pendientes primero, Confirmados después),
              //? guests y jugadores autenticados intercalados: cada fila
              //? PENDING (guest o autenticada) muestra las mismas acciones
              //? ✕/✓, así el organizador ve todo lo que le falta resolver
              //? arriba de lo que ya está resuelto.
              else ...[
                if (pendingItems.isNotEmpty) ...[
                  const _RegistrationsGroupHeader(
                    key: Key('tournament.registrationsGroup.pending'),
                    label: 'Pendientes',
                  ),
                  const SizedBox(height: 6),
                  for (final reg in pendingItems)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _RegistrationTile(
                        registration: reg,
                        canManage: canManageGuests,
                        busy: loaded.busyRegistrationId == reg.id,
                      ),
                    ),
                ],
                if (confirmedItems.isNotEmpty) ...[
                  if (pendingItems.isNotEmpty) const SizedBox(height: 4),
                  const _RegistrationsGroupHeader(
                    key: Key('tournament.registrationsGroup.confirmed'),
                    label: 'Confirmados',
                  ),
                  const SizedBox(height: 6),
                  for (final reg in confirmedItems)
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
  const _RegistrationsGroupHeader({super.key, required this.label});

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
          icon: const Icon(AppIcons.check, size: 19),
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
              //? 38px por fila: mismo tamaño para el ✓ de PENDING (guest o
              //? autenticada) y el ✕ que aplica a cualquier status, así el
              //? organizador resuelve todo el roster con el mismo gesto.
              if (registration.status == 'PENDING')
                IconButton(
                  key: Key('tournament.confirmRegistration.${registration.id}'),
                  tooltip: 'Confirmar',
                  icon: const Icon(AppIcons.check, size: 18),
                  style: IconButton.styleFrom(
                    minimumSize: const Size(38, 38),
                    fixedSize: const Size(38, 38),
                    padding: EdgeInsets.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  onPressed: () => context
                      .read<TournamentRegistrationsCubit>()
                      .confirmRegistration(registration.id),
                ),
              IconButton(
                key: Key('tournament.removeRegistration.${registration.id}'),
                tooltip: 'Eliminar',
                icon: const Icon(AppIcons.close, size: 18),
                style: IconButton.styleFrom(
                  minimumSize: const Size(38, 38),
                  fixedSize: const Size(38, 38),
                  padding: EdgeInsets.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
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
                    //? Invitee display name from S3a's `invitedUserName`,
                    //? falling back to the raw id when it's unavailable.
                    Expanded(child: Text(invitation.invitedDisplayName)),
                    const SizedBox(width: 8),
                    //? "Sin responder" while PENDING, "Rechazó" once
                    //? REJECTED — rejected invitations are shown here
                    //? instead of being filtered out (M10b).
                    Text(
                      invitation.isPending ? 'Sin responder' : 'Rechazó',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: invitation.isPending
                            ? scheme.onSurfaceVariant
                            : scheme.error,
                      ),
                    ),
                    if (invitation.isPending)
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

