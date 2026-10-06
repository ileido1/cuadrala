part of '../tournament_detail_screen.dart';

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
  const _TournamentFooter({required this.tournament});

  final TournamentListItemDto? tournament;

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
        final invitation = state.pendingInvitationFor(userId);
        final scheme = Theme.of(context).colorScheme;
        final open = tournament!.status == 'OPEN';
        final activeRegistrationCount = state.items
            .where((item) => item.status != 'WITHDRAWN')
            .length;
        final footer = <Widget>[];

        if (state.registerError != null) {
          footer.add(_RosterError(message: state.registerError!));
        }

        if (invitation != null) {
          footer.add(
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: state.registering
                        ? null
                        : () => cubit.rejectInvitation(invitation.id),
                    child: const Text('Rechazar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: state.registering
                        ? null
                        : () => cubit.acceptInvitation(invitation.id),
                    icon: const Icon(AppIcons.check),
                    label: const Text('Aceptar'),
                  ),
                ),
              ],
            ),
          );
        } else if (registration?.status == 'PENDING') {
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
                        const Flexible(
                          child: Text(
                            'Esperando confirmación',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
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
              onPressed: () => DefaultTabController.of(context).index = 1,
              icon: const Icon(AppIcons.calendar, size: 19),
              label: const Text('Cuándo y dónde juego'),
            ),
          );
          if (tournament!.status != 'IN_PROGRESS' &&
              tournament!.status != 'COMPLETED') {
            footer.add(
              OutlinedButton(
                onPressed: state.registering ? null : cubit.withdraw,
                child: const Text('Darme de baja'),
              ),
            );
          }
        } else if (!open) {
          footer.add(
            OutlinedButton.icon(
              key: const Key('tournament.detail.closedRegistration'),
              onPressed: null,
              icon: const Icon(AppIcons.clock),
              label: Text(
                tournament!.status == 'DRAFT'
                    ? 'Todavía no abrió la inscripción'
                    : 'Inscripción cerrada',
              ),
            ),
          );
        } else if (tournament!.maxSlots != null &&
            activeRegistrationCount >= tournament!.maxSlots!) {
          footer.add(
            OutlinedButton.icon(
              key: const Key('tournament.detail.fullRegistration'),
              onPressed: null,
              icon: const Icon(AppIcons.eventBusy),
              label: Text(
                'Cupo completo · $activeRegistrationCount/${tournament!.maxSlots} inscriptos',
              ),
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
                  key: const Key('tournament.detail.register'),
                  onPressed: state.registering ? null : cubit.register,
                  icon: state.registering
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(AppIcons.check, size: 20),
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
          //? Sin `mainAxisSize: min` esta Column se expande a toda la
          //? altura disponible (el Scaffold le da una constraint suelta
          //? como `bottomNavigationBar`), tapando el resto de la pantalla
          //? y absorbiendo los toques de todo lo que está arriba (M5b lo
          //? expuso: bloqueaba el tap en la SegmentedControl para un
          //? usuario con inscripción CONFIRMED).
          child: Column(mainAxisSize: MainAxisSize.min, children: footer),
        );
      },
    );
  }
}
