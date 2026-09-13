part of '../tournament_detail_screen.dart';

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
              icon: const Icon(AppIcons.calendar, size: 19),
              label: const Text('Ver cuándo y dónde juego'),
            ),
          );
        } else if (!open) {
          footer.add(
            OutlinedButton.icon(
              onPressed: null,
              icon: const Icon(AppIcons.clock),
              label: const Text('Inscripción cerrada'),
            ),
          );
        } else if (eligibility == TournamentEligibility.wrongCategory &&
            !invited) {
          footer.add(
            OutlinedButton.icon(
              onPressed: null,
              icon: const Icon(AppIcons.lock),
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
          child: Column(children: footer),
        );
      },
    );
  }
}

