part of '../tournament_detail_screen.dart';

final class _RegistrationsTab extends StatelessWidget {
  const _RegistrationsTab({
    required this.tournamentId,
    required this.organizerUserId,
    required this.organizerName,
    required this.tournamentStatus,
    required this.categoryName,
    required this.pairedRegistration,
  });

  final String tournamentId;
  final String? organizerUserId;
  final String? organizerName;
  final String? tournamentStatus;
  final String? categoryName;
  final bool pairedRegistration;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      child:
          BlocBuilder<
            TournamentRegistrationsCubit,
            TournamentRegistrationsState
          >(
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
                  .where((registration) => registration.status != 'WITHDRAWN')
                  .toList();
              final pendingItems = activeItems
                  .where((registration) => registration.status == 'PENDING')
                  .toList();
              final confirmedItems = activeItems
                  .where((registration) => registration.status == 'CONFIRMED')
                  .toList();
              final cubit = context.read<TournamentRegistrationsCubit>();
              final currentUserId = cubit.currentUserId;
              final myPendingInvite = currentUserId != null
                  ? loaded.pendingInvitationFor(currentUserId)
                  : null;
              final isOrganizer = _isOrganizer(organizerUserId, currentUserId);
              final guestActionsAllowed =
                  tournamentStatus == null ||
                  _kOrganizerManageableStatuses.contains(tournamentStatus);
              final canManageGuests = isOrganizer && guestActionsAllowed;
              final canInvitePlayers =
                  isOrganizer && loaded.canManageInvitations;

              return ListView(
                padding: const EdgeInsets.only(bottom: 24),
                children: [
                  if (canManageGuests) ...[
                    _OrganizerRosterHeader(
                      total: activeItems.length,
                      confirmed: confirmedItems.length,
                      pending: pendingItems.length,
                      busy: loaded.busyRegistrationId != null,
                      onConfirmAll: pendingItems.isEmpty
                          ? null
                          : () => cubit.confirmPendingRegistrations(),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (loaded.registerError != null ||
                      loaded.invitationError != null ||
                      loaded.registrationActionError != null) ...[
                    _RosterError(
                      message:
                          loaded.registerError ??
                          loaded.invitationError ??
                          loaded.registrationActionError!,
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (myPendingInvite != null) ...[
                    _PendingInviteBanner(
                      invitation: myPendingInvite,
                      responding: loaded.responding,
                      onAccept: () =>
                          cubit.acceptInvitation(myPendingInvite.id),
                      onReject: () =>
                          cubit.rejectInvitation(myPendingInvite.id),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (organizerUserId != null &&
                      !activeItems.any(
                        (registration) =>
                            registration.userId == organizerUserId,
                      )) ...[
                    _OrganizerRosterOwner(
                      userId: organizerUserId!,
                      name: organizerName,
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (activeItems.isEmpty)
                    const _InfoBox(
                      message:
                          'Aún no hay participantes. ¡Compartí el torneo para que más jugadores se inscriban!',
                    )
                  else if (pairedRegistration)
                    TournamentPairingSection(
                      roster: groupRosterIntoPairs(
                        registrations: activeItems,
                        paired: true,
                      ),
                      categoryName: categoryName,
                      canManage: canManageGuests,
                      busyRegistrationId: loaded.busyRegistrationId,
                      onPair: (first, second) =>
                          cubit.pairRegistrations(first, second),
                      onUnpair: cubit.unpairRegistration,
                    )
                  else ...[
                    _OrganizerRosterCard(
                      pendingItems: pendingItems,
                      confirmedItems: confirmedItems,
                      categoryName: categoryName,
                      pairedRegistration: pairedRegistration,
                      canManage: canManageGuests,
                      busyRegistrationId: loaded.busyRegistrationId,
                    ),
                  ],
                  if (canManageGuests) ...[
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            key: const Key('tournament.inviteGuestButton'),
                            onPressed: () => showInviteGuestSheet(context),
                            icon: const Icon(AppIcons.add, size: 18),
                            label: const Text('Invitado'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        if (canInvitePlayers)
                          Expanded(
                            child: OutlinedButton.icon(
                              key: const Key('tournament.invitePlayerButton'),
                              onPressed: () => showInvitePlayerSheet(context),
                              icon: const Icon(AppIcons.mail, size: 18),
                              label: const Text('Invitar'),
                            ),
                          )
                        else
                          const Spacer(),
                      ],
                    ),
                  ],
                  if (pairedRegistration &&
                      activeItems.isNotEmpty &&
                      canManageGuests)
                    const SizedBox(height: 0),
                  if (loaded.canManageInvitations) ...[
                    const SizedBox(height: 22),
                    _OrganizerInvitationsSection(
                      invitations: loaded.invitations
                          .where(
                            (invitation) =>
                                invitation.isPending || invitation.isRejected,
                          )
                          .toList(),
                      busy: loaded.inviting,
                    ),
                  ],
                ],
              );
            },
          ),
    );
  }
}

final class _RosterError extends StatelessWidget {
  const _RosterError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.errorContainer.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.error.withValues(alpha: 0.35)),
      ),
      child: Text(
        message,
        style: TextStyle(color: scheme.error, fontWeight: FontWeight.w800),
      ),
    );
  }
}

final class _OrganizerRosterOwner extends StatelessWidget {
  const _OrganizerRosterOwner({required this.userId, this.name});

  final String userId;
  final String? name;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.45)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 19,
            backgroundColor: scheme.primary,
            child: Icon(AppIcons.person, color: scheme.onPrimary, size: 19),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              name ?? userId,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          Text(
            'Organizador',
            style: TextStyle(
              color: scheme.primary,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

final class _OrganizerRosterCard extends StatelessWidget {
  const _OrganizerRosterCard({
    required this.pendingItems,
    required this.confirmedItems,
    required this.categoryName,
    required this.pairedRegistration,
    required this.canManage,
    required this.busyRegistrationId,
  });

  final List<TournamentRegistrationDto> pendingItems;
  final List<TournamentRegistrationDto> confirmedItems;
  final String? categoryName;
  final bool pairedRegistration;
  final bool canManage;
  final String? busyRegistrationId;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      key: const Key('tournament.registrationsCard'),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (pendingItems.isNotEmpty) ...[
            _RegistrationsGroupHeader(
              key: const Key('tournament.registrationsGroup.pending'),
              label: 'PENDIENTES',
            ),
            for (final registration in pendingItems)
              _RegistrationTile(
                registration: registration,
                categoryName: categoryName,
                pairedRegistration: pairedRegistration,
                canManage: canManage,
                busy: busyRegistrationId == registration.id,
              ),
          ],
          _RegistrationsGroupHeader(
            key: const Key('tournament.registrationsGroup.confirmed'),
            label: 'CONFIRMADOS',
          ),
          if (confirmedItems.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Text(
                'Todavía no hay confirmados.',
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontSize: 12.5,
                ),
              ),
            )
          else
            for (final registration in confirmedItems)
              _RegistrationTile(
                registration: registration,
                categoryName: categoryName,
                pairedRegistration: pairedRegistration,
                canManage: canManage,
                busy: busyRegistrationId == registration.id,
              ),
        ],
      ),
    );
  }
}

final class _RegistrationsGroupHeader extends StatelessWidget {
  const _RegistrationsGroupHeader({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      color: scheme.surfaceContainerHighest,
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: scheme.onSurfaceVariant,
          fontWeight: FontWeight.w800,
          letterSpacing: .5,
        ),
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
              child: _OrganizerCount(
                key: const Key('tournament.organizer.stats.total'),
                label: 'Inscritos',
                value: total,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _OrganizerCount(
                key: const Key('tournament.organizer.stats.confirmed'),
                label: 'Confirmados',
                value: confirmed,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _OrganizerCount(
                key: const Key('tournament.organizer.stats.pending'),
                label: 'Pendientes',
                value: pending,
                accent: pending > 0 ? scheme.primary : null,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (pending > 0)
          FilledButton.icon(
            key: const Key('tournament.confirmPendingButton'),
            onPressed: busy ? null : onConfirmAll,
            icon: const Icon(AppIcons.check, size: 19),
            label: Text('Confirmar $pending pendientes'),
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
    super.key,
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

/// A compact roster row shared by guest and authenticated registrations.
final class _RegistrationTile extends StatelessWidget {
  const _RegistrationTile({
    required this.registration,
    required this.categoryName,
    required this.pairedRegistration,
    required this.canManage,
    required this.busy,
  });

  final TournamentRegistrationDto registration;
  final String? categoryName;
  final bool pairedRegistration;
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
    if (confirmed == true) cubit.removeRegistration(registration.id);
  }

  String _subtitle() {
    if (registration.isGuest) {
      return registration.guestPhone?.trim().isNotEmpty == true
          ? registration.guestPhone!
          : 'Invitado sin teléfono';
    }
    return _categorySubtitle() ?? 'Jugador registrado';
  }

  String? _categorySubtitle() {
    final category = categoryName?.trim();
    if (registration.status == 'CONFIRMED' && pairedRegistration) {
      final pairingLabel = registration.hasPartner ? 'en dupla' : 'sin dupla';
      return category?.isNotEmpty == true
          ? '$category · $pairingLabel'
          : pairingLabel;
    }
    return category?.isNotEmpty == true ? category : null;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final label = registration.displayName;
    final avatarLabel = label
        .substring(0, label.length >= 2 ? 2 : label.length)
        .toUpperCase();
    final isPending = registration.status == 'PENDING';

    return Container(
      key: Key('tournament.registrationTile.${registration.id}'),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: scheme.outlineVariant)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 19,
            backgroundColor: registration.isGuest
                ? Colors.amber.withValues(alpha: .22)
                : scheme.primaryContainer,
            child: Text(
              avatarLabel,
              style: TextStyle(
                color: registration.isGuest
                    ? Colors.amber.shade300
                    : scheme.onPrimaryContainer,
                fontWeight: FontWeight.w800,
                fontSize: 11,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (registration.isGuest) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: scheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: const Text(
                          'INVITADO',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _subtitle(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12.5,
                  ),
                ),
                if (registration.isGuest &&
                    registration.status == 'CONFIRMED' &&
                    _categorySubtitle() != null)
                  Text(
                    _categorySubtitle()!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 12.5,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (!isPending && registration.status == 'CONFIRMED')
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(AppIcons.check, size: 16, color: scheme.primary),
                const SizedBox(width: 3),
                Text(
                  'Adentro',
                  style: TextStyle(
                    color: scheme.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          if (canManage) ...[
            if (!isPending) const SizedBox(width: 6),
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
              if (isPending)
                IconButton(
                  key: Key('tournament.confirmRegistration.${registration.id}'),
                  tooltip: 'Confirmar',
                  icon: const Icon(AppIcons.check, size: 18),
                  style: _rosterActionStyle(scheme.primary),
                  onPressed: () => context
                      .read<TournamentRegistrationsCubit>()
                      .confirmRegistration(registration.id),
                ),
              IconButton(
                key: Key('tournament.removeRegistration.${registration.id}'),
                tooltip: isPending ? 'Rechazar' : 'Eliminar',
                icon: const Icon(AppIcons.close, size: 18),
                style: _rosterActionStyle(scheme.surfaceContainerHighest),
                onPressed: () => _confirmRemoveSV(context),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

ButtonStyle _rosterActionStyle(Color background) {
  return IconButton.styleFrom(
    backgroundColor: background,
    foregroundColor: Colors.white,
    minimumSize: const Size(38, 38),
    fixedSize: const Size(38, 38),
    padding: EdgeInsets.zero,
    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
  );
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

/// Organizer-only list of sent invitations. The invite action itself lives in
/// [InvitePlayerSheet], keeping this section focused on delivery status.
final class _OrganizerInvitationsSection extends StatelessWidget {
  const _OrganizerInvitationsSection({
    required this.invitations,
    required this.busy,
  });

  final List<TournamentInvitationDto> invitations;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final cubit = context.read<TournamentRegistrationsCubit>();

    return Column(
      key: const Key('tournament.organizerInvitations'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'INVITACIONES ENVIADAS',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: scheme.onSurfaceVariant,
            fontWeight: FontWeight.w800,
            letterSpacing: .5,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant, width: 1.5),
          ),
          child: invitations.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(14),
                  child: Text(
                    'Todavía no enviaste invitaciones.',
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 12.5,
                    ),
                  ),
                )
              : Column(
                  children: [
                    for (var index = 0; index < invitations.length; index++)
                      _SentInvitationTile(
                        invitation: invitations[index],
                        busy: busy,
                        showDivider: index < invitations.length - 1,
                        onCancel: () =>
                            cubit.cancelInvitation(invitations[index].id),
                      ),
                  ],
                ),
        ),
      ],
    );
  }
}

final class _SentInvitationTile extends StatelessWidget {
  const _SentInvitationTile({
    required this.invitation,
    required this.busy,
    required this.showDivider,
    required this.onCancel,
  });

  final TournamentInvitationDto invitation;
  final bool busy;
  final bool showDivider;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final name = invitation.invitedDisplayName;
    return Container(
      key: Key('tournament.sentInvitation.${invitation.id}'),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        border: showDivider
            ? Border(bottom: BorderSide(color: scheme.outlineVariant))
            : null,
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: scheme.primaryContainer,
            child: Text(
              name.substring(0, 1).toUpperCase(),
              style: TextStyle(
                color: scheme.onPrimaryContainer,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            invitation.isPending ? 'Sin responder' : 'Rechazó',
            style: TextStyle(
              color: invitation.isPending
                  ? scheme.onSurfaceVariant
                  : scheme.error,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (invitation.isPending)
            IconButton(
              tooltip: 'Cancelar',
              onPressed: busy ? null : onCancel,
              icon: const Icon(AppIcons.close, size: 16),
              visualDensity: VisualDensity.compact,
            ),
        ],
      ),
    );
  }
}
