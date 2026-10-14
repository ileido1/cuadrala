part of '../tournament_detail_screen.dart';

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
    required this.registrationsState,
    required this.invited,
    this.invitation,
    this.onOpenInvitation,
  });

  final TournamentListItemDto? tournament;
  final List<UserRatingDto>? playerRatings;
  final TournamentRegistrationDto? registration;

  /// Fuente de los confirmados/pendientes del resumen de Inscritos
  /// (diseño D17): la sección se oculta hasta que este estado sea
  /// [TournamentRegistrationsLoaded], para no mostrar un conteo a medio
  /// cargar.
  final TournamentRegistrationsState registrationsState;
  final bool invited;
  final TournamentInvitationDto? invitation;
  final VoidCallback? onOpenInvitation;

  @override
  Widget build(BuildContext context) {
    if (tournament == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final eligibility = invited
        ? TournamentEligibility.invited
        : TournamentEligibility.eligible;

    //? Variable local para que el analizador promueva el tipo dentro del
    //? `if` de la lista de hijos más abajo (un campo `final` no siempre se
    //? promueve igual que una variable local).

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
              title: 'Te anotaste. Falta que te confirmen.',
              body:
                  'El organizador confirma cada inscripción. Cuando quedes confirmado vas a ver el calendario y la tabla.',
            ),
            const SizedBox(height: 16),
          ],
          if (registration?.status == 'CONFIRMED') ...[
            _StatusBanner(
              tone: _BannerTone.success,
              title: 'Inscripción confirmada',
              body:
                  'Cuando el organizador genere el calendario, tus partidos aparecen en Calendario.',
              action: () => DefaultTabController.of(context).animateTo(1),
            ),
            const SizedBox(height: 16),
          ],
          if (registration == null &&
              const {
                'IN_PROGRESS',
                'COMPLETED',
              }.contains(tournament!.status)) ...[
            const _StatusBanner(
              tone: _BannerTone.success,
              title: 'No participás en este torneo',
              body:
                  'Ya está en juego: podés seguir el calendario y la tabla, pero no inscribirte.',
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
            endsAt: tournament!.endsAt,
            registrationClosesAt: tournament!.registrationClosesAt,
            venueName: tournament!.venueName,
            organizerName: tournament!.organizerName,
          ),
          const SizedBox(height: 20),
          Text(
            'Cómo se juega',
            style: _sectionStyle(Theme.of(context).colorScheme),
          ),
          const SizedBox(height: 10),
          _ComoSeJuegaTiles(tournament: tournament!),
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
        : BrandColors.warningAmber;
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
            tone == _BannerTone.success ? AppIcons.check : AppIcons.clock,
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
                    child: const Text('Ir a Calendario →'),
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

/// Formato, modalidad y cupos declarados por el torneo.
final class _ComoSeJuegaTiles extends StatelessWidget {
  const _ComoSeJuegaTiles({required this.tournament});

  final TournamentListItemDto tournament;

  @override
  Widget build(BuildContext context) {
    final maxSlots = tournament.maxSlots;
    final tiles = <_InfoTile>[
      _InfoTile(
        label: 'Formato',
        value: tournamentFormatLabel(tournament.formatPresetName),
      ),
      _InfoTile(
        label: 'Modalidad',
        value: tournament.pairedRegistration ? 'Dupla fija' : 'Individual',
      ),
      _InfoTile(
        label: 'Cupos',
        value: maxSlots == null
            ? '${tournament.registrationCount} · sin tope'
            : '${tournament.registrationCount} de $maxSlots',
      ),
    ];

    return Column(
      children: [
        Row(
          children: [
            for (var i = 0; i < tiles.length; i++) ...[
              if (i > 0) const SizedBox(width: 10),
              Expanded(child: tiles[i]),
            ],
          ],
        ),
        if (maxSlots != null) ...[
          const SizedBox(height: 12),
          TournamentCupoBar(
            count: tournament.registrationCount,
            capacity: maxSlots,
          ),
        ],
      ],
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
