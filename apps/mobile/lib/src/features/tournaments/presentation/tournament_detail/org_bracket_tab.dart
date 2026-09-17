part of '../tournament_detail_screen.dart';

final class _OrganizerBracketTab extends StatelessWidget {
  const _OrganizerBracketTab({
    required this.tournamentId,
    required this.organizerUserId,
    required this.tournamentsRepository,
    required this.formatPresetName,
    required this.venueId,
  });

  final String tournamentId;
  final String? organizerUserId;
  final TournamentsRepository tournamentsRepository;
  final String? formatPresetName;
  final String? venueId;

  @override
  Widget build(BuildContext context) {
    final formatPresentation = tournamentFormatPresentation(formatPresetName);
    final isSingleElimination =
        formatPresentation == TournamentFormatPresentation.bracket;
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
          final confirmedParticipants = registrations
              .where((r) => r.status == 'CONFIRMED')
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
                TournamentScheduleUnsupported() => _ScoreboardTab(
                  tournamentId: tournamentId,
                  tournamentsRepository: tournamentsRepository,
                  showBracketButton: false,
                ),
                TournamentScheduleError(:final message) => _ErrorBox(
                  message: message,
                  onRetry: () => context.read<TournamentScheduleCubit>().load(),
                ),
                TournamentScheduleSuccess(:final schedule) =>
                  switch (formatPresentation) {
                    TournamentFormatPresentation.bracket =>
                      _OrganizerGeneratedSchedule(
                        schedule: schedule,
                        tournamentId: tournamentId,
                        tournamentsRepository: tournamentsRepository,
                        isSingleElimination: true,
                        venueId: venueId,
                      ),
                    TournamentFormatPresentation.standings =>
                      _OrganizerStandingsContent(
                        schedule: schedule,
                        tournamentId: tournamentId,
                        tournamentsRepository: tournamentsRepository,
                        venueId: venueId,
                      ),
                    TournamentFormatPresentation.schedule =>
                      _OrganizerGeneratedSchedule(
                        schedule: schedule,
                        tournamentId: tournamentId,
                        tournamentsRepository: tournamentsRepository,
                        isSingleElimination: false,
                        venueId: venueId,
                        showBracketButton: false,
                      ),
                  },
                TournamentScheduleConflict() => _OrganizerGeneratedCard(
                  tournamentId: tournamentId,
                  tournamentsRepository: tournamentsRepository,
                  isSingleElimination: isSingleElimination,
                  showBracketButton: isSingleElimination,
                ),
                TournamentScheduleInitial() ||
                TournamentScheduleEmpty() => _OrganizerGenerateCard(
                  confirmedParticipants: confirmedParticipants,
                  canGenerate:
                      _isOrganizer(
                        organizerUserId,
                        registrationsCubit.currentUserId,
                      ) &&
                      confirmedParticipants >= 2,
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

final class _OrganizerStandingsContent extends StatelessWidget {
  const _OrganizerStandingsContent({
    required this.schedule,
    required this.tournamentId,
    required this.tournamentsRepository,
    required this.venueId,
  });

  final TournamentScheduleDto schedule;
  final String tournamentId;
  final TournamentsRepository tournamentsRepository;
  final String? venueId;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ScoreboardTab(
          tournamentId: tournamentId,
          tournamentsRepository: tournamentsRepository,
          showBracketButton: false,
        ),
        const SizedBox(height: 8),
        _OrganizerGeneratedSchedule(
          schedule: schedule,
          tournamentId: tournamentId,
          tournamentsRepository: tournamentsRepository,
          isSingleElimination: false,
          venueId: venueId,
          showBracketButton: false,
        ),
      ],
    );
  }
}

final class _OrganizerGenerateCard extends StatelessWidget {
  const _OrganizerGenerateCard({
    required this.confirmedParticipants,
    required this.canGenerate,
    required this.onGenerate,
  });

  final int confirmedParticipants;
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
            child: Icon(AppIcons.trophy, color: scheme.primary, size: 26),
          ),
          const SizedBox(height: 12),
          const Text(
            'Generar el cuadro',
            style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            'Eliminación simple con los $confirmedParticipants confirmados, incluidos los invitados.',
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
            icon: const Icon(AppIcons.sparkle, size: 19),
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
    required this.isSingleElimination,
    required this.showBracketButton,
  });

  final String tournamentId;
  final TournamentsRepository tournamentsRepository;
  final bool isSingleElimination;
  final bool showBracketButton;

  @override
  Widget build(BuildContext context) {
    return _OrganizerGeneratedSchedule(
      schedule: TournamentScheduleDto.empty(),
      tournamentId: tournamentId,
      tournamentsRepository: tournamentsRepository,
      isSingleElimination: isSingleElimination,
      venueId: null,
      showBracketButton: showBracketButton,
      generatedWithoutSchedule: true,
    );
  }
}

final class _OrganizerGeneratedSchedule extends StatelessWidget {
  const _OrganizerGeneratedSchedule({
    required this.schedule,
    required this.tournamentId,
    required this.tournamentsRepository,
    required this.isSingleElimination,
    required this.venueId,
    this.showBracketButton = true,
    this.generatedWithoutSchedule = false,
  });

  final TournamentScheduleDto schedule;
  final String tournamentId;
  final TournamentsRepository tournamentsRepository;
  final bool isSingleElimination;
  final String? venueId;
  final bool showBracketButton;
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
        if (showBracketButton)
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
                  icon: const Icon(AppIcons.trophy, size: 17),
                  label: const Text('Ver cuadro'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: null,
                  icon: const Icon(AppIcons.add, size: 17),
                  label: const Text('Cargar resultado'),
                ),
              ),
            ],
          ),
        //? Org Cuadro — result caption (spec; D12): verbatim, SE-only, always
        //? visible on tab render — not gated behind opening a sheet.
        if (isSingleElimination) ...[
          const SizedBox(height: 8),
          Text(
            'El ganador pasa de ronda automáticamente y a los dos les llega el resultado.',
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontSize: 12,
            ),
          ),
        ],
        if (!generatedWithoutSchedule && schedule.rounds.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text(
            'Partidos programados',
            style: _sectionStyle(Theme.of(context).colorScheme),
          ),
          const SizedBox(height: 10),
          _OrganizerScheduleList(schedule: schedule, venueId: venueId),
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

/// Renders the organizer's "Partidos de hoy" section (`cuadrala-torneo-org.jsx:150-170`):
/// a single card listing every scheduled match across all rounds (flat, no
/// per-round headers), each row carrying its own uppercase round caption
/// plus a status-dependent subtitle and trailing action, driven by M11a's
/// enriched fields (`matchStatus`/`decision`/`rejectedByName`/`sides`/`scores`).
final class _OrganizerScheduleList extends StatelessWidget {
  const _OrganizerScheduleList({required this.schedule, required this.venueId});

  static final _timeFormat = DateFormat('dd MMM HH:mm', 'es_ES');

  final TournamentScheduleDto schedule;
  final String? venueId;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    //? 1. Flatten every round's matches into one ordered list — the handoff
    //? shows a single card mixing rounds ("Cuartos 1", "Semi 1"…), not one
    //? card per round.
    final rows = <({String roundName, TournamentScheduleMatchDto match})>[
      for (final round in schedule.rounds)
        for (final match in round.matches)
          (roundName: round.name, match: match),
    ];

    if (rows.isEmpty) {
      return const _InfoBox(
        message: 'El calendario todavía no expone partidos de hoy.',
      );
    }

    //? 2. Render as a bordered card with a divider between rows.
    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            _OrganizerMatchRow(
              roundName: rows[i].roundName,
              match: rows[i].match,
              timeFormat: _timeFormat,
              venueId: venueId,
            ),
            if (i < rows.length - 1)
              Divider(height: 1, color: scheme.outlineVariant),
          ],
        ],
      ),
    );
  }
}

/// A single "Partidos de hoy" row. Trailing content and subtitle depend on
/// the match's enriched state:
/// - `decision == REJECTED`: amber "{who} no puede a las {hh:mm}" subtitle
///   plus a "Mover" action (wired in M11d).
/// - `matchStatus == IN_PROGRESS`: normal time/court subtitle plus a
///   "Cargar" action (wired in M11c).
/// - `matchStatus == FINISHED` with recorded scores: the per-side score
///   total, e.g. "6-3".
/// - anything else: just the time/court subtitle, no trailing action.
final class _OrganizerMatchRow extends StatelessWidget {
  const _OrganizerMatchRow({
    required this.roundName,
    required this.match,
    required this.timeFormat,
    required this.venueId,
  });

  final String roundName;
  final TournamentScheduleMatchDto match;
  final DateFormat timeFormat;
  final String? venueId;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isRejected = match.decision == 'REJECTED';
    final isLive = match.matchStatus == 'IN_PROGRESS';
    final isDone = match.matchStatus == 'FINISHED' && match.scores.isNotEmpty;
    //? Registrations are the canonical identity, so invited-only sides are
    //? also eligible for result entry.
    final hasGuestOnlySide = match.sides.any(
      (side) =>
          side.registrationIds.isEmpty &&
          side.userIds.isNotEmpty &&
          side.userIds.every((id) => id == null),
    );
    const rejectColor = Color(0xFFF59E0B);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  roundName.toUpperCase(),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: .3,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  match.label.isEmpty ? 'Partido' : match.label,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  isRejected
                      ? _rejectedSubtitle(match, timeFormat)
                      : _scheduledSubtitle(match, timeFormat),
                  style: TextStyle(
                    fontSize: 12.5,
                    color: isRejected ? rejectColor : scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          if (isDone)
            Text(
              _scoreLabel(match),
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
            )
          else if (isLive)
            FilledButton(
              onPressed: hasGuestOnlySide || match.matchId == null
                  ? null
                  : () => showResultEntrySheet(
                      context,
                      match: match,
                      roundName: roundName,
                      onSubmit: (scores) => context
                          .read<TournamentScheduleCubit>()
                          .submitMatchResult(
                            matchId: match.matchId!,
                            scores: scores,
                          ),
                    ),
              style: FilledButton.styleFrom(
                minimumSize: const Size(0, 34),
                padding: const EdgeInsets.symmetric(horizontal: 12),
              ),
              child: const Text('Cargar'),
            )
          else if (isRejected)
            OutlinedButton(
              onPressed:
                  venueId == null ||
                      match.roundNumber == null ||
                      match.matchNumber == null
                  ? null
                  : () => _openRescheduleSheet(context),
              style: OutlinedButton.styleFrom(minimumSize: const Size(0, 34)),
              child: const Text('Mover'),
            ),
        ],
      ),
    );
  }

  Future<void> _openRescheduleSheet(BuildContext context) async {
    try {
      final courts = await getIt<VenuesRepository>().listVenueCourts(
        venueId: venueId!,
        status: 'ACTIVE',
      );
      if (!context.mounted) return;
      await showRescheduleSheet(
        context,
        courts: courts,
        onSubmit: ({required courtId, required scheduledAt}) =>
            context.read<TournamentScheduleCubit>().rescheduleMatch(
              roundNumber: match.roundNumber!,
              matchNumber: match.matchNumber!,
              courtId: courtId,
              scheduledAt: scheduledAt,
            ),
      );
    } on AppFailure catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    }
  }
}

/// "{time} · {court}", omitting whichever part is unavailable.
String _scheduledSubtitle(
  TournamentScheduleMatchDto match,
  DateFormat timeFormat,
) {
  final parts = [
    if (match.scheduledAt != null) timeFormat.format(match.scheduledAt!),
    if (match.courtName != null) match.courtName!,
  ];
  return parts.isEmpty ? 'Sin horario' : parts.join(' · ');
}

/// "{rejectedByName} no puede a las {hh:mm}" (`cuadrala-torneo-org.jsx:162`).
String _rejectedSubtitle(
  TournamentScheduleMatchDto match,
  DateFormat timeFormat,
) {
  final time = match.scheduledAt != null
      ? ' a las ${timeFormat.format(match.scheduledAt!)}'
      : '';
  final who = match.rejectedByName ?? 'Un jugador';
  return '$who no puede$time';
}

/// Sums each side's recorded points and joins them with "-" (e.g. "6-3"),
/// mirroring the winner rule (D4/D13): total points per side, not sets.
String _scoreLabel(TournamentScheduleMatchDto match) {
  return match.sides
      .map(
        (side) => match.scores
            .where(
              (score) =>
                  side.registrationIds.contains(
                    score.tournamentRegistrationId,
                  ) ||
                  side.userIds.contains(score.userId),
            )
            .fold<int>(0, (sum, score) => sum + score.points),
      )
      .join('-');
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
