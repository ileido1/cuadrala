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
                        formatPresetName: formatPresetName,
                        confirmedParticipants: confirmedParticipants,
                        venueId: venueId,
                      ),
                    TournamentFormatPresentation.groupsPlusKnockout =>
                      _OrganizerStandingsContent(
                        schedule: schedule,
                        tournamentId: tournamentId,
                        tournamentsRepository: tournamentsRepository,
                        formatPresetName: formatPresetName,
                        confirmedParticipants: confirmedParticipants,
                        venueId: venueId,
                        showFinalBracketAction: true,
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
                  formatPresentation: formatPresentation,
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
    required this.formatPresetName,
    required this.confirmedParticipants,
    required this.venueId,
    this.showFinalBracketAction = false,
  });

  final TournamentScheduleDto schedule;
  final String tournamentId;
  final TournamentsRepository tournamentsRepository;
  final String? formatPresetName;
  final int confirmedParticipants;
  final String? venueId;
  final bool showFinalBracketAction;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _OrganizerStandingsSummary(
          formatPresetName: formatPresetName,
          playerCount: confirmedParticipants,
          rounds: schedule.rounds.length,
          matches: schedule.rounds.fold<int>(
            0,
            (total, round) => total + round.matches.length,
          ),
          courts: schedule.rounds
              .expand((round) => round.matches)
              .map((match) => match.courtName)
              .whereType<String>()
              .toSet()
              .length,
        ),
        BlocBuilder<TournamentScoreboardCubit, TournamentScoreboardState>(
          builder: (context, state) => switch (state) {
            TournamentScoreboardSuccess(:final scoreboard)
                when scoreboard.rows.isNotEmpty =>
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: _ScoreboardTable(
                  scoreboard: scoreboard,
                  currentUserId: context
                      .read<TournamentRegistrationsCubit>()
                      .currentUserId,
                ),
              ),
            _ => const SizedBox.shrink(),
          },
        ),
        if (showFinalBracketAction &&
            _canAdvanceGroupsPlusKnockout(schedule)) ...[
          const SizedBox(height: 16),
          _OrganizerFinalBracketAction(onAdvance: () => _advance(context)),
        ],
        const SizedBox(height: 22),
        Text(
          'PRIMERAS RONDAS',
          style: _sectionStyle(Theme.of(context).colorScheme),
        ),
        const SizedBox(height: 10),
        _OrganizerScheduleList(schedule: schedule, venueId: venueId),
      ],
    );
  }

  Future<void> _advance(BuildContext context) async {
    try {
      await context.read<TournamentScheduleCubit>().advanceGroupsPlusKnockout();
      if (!context.mounted) return;
      await context.read<TournamentScoreboardCubit>().load();
    } on AppFailure catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    }
  }
}

/// The schedule view currently exposes round order, rather than a stage field.
/// GROUPS_PLUS_KNOCKOUT v1 always ends with semifinals and a final, so the
/// preceding rounds are the complete group phase.
bool _canAdvanceGroupsPlusKnockout(TournamentScheduleDto schedule) {
  if (schedule.rounds.length < 3) return false;

  final groupMatches = schedule.rounds
      .sublist(0, schedule.rounds.length - 2)
      .expand((round) => round.matches)
      .toList(growable: false);
  final semifinals = schedule.rounds[schedule.rounds.length - 2].matches;

  return groupMatches.isNotEmpty &&
      groupMatches.every(
        (match) => match.matchStatus == 'FINISHED' && match.scores.isNotEmpty,
      ) &&
      semifinals.isNotEmpty &&
      semifinals.every((match) => match.matchId == null);
}

final class _OrganizerFinalBracketAction extends StatelessWidget {
  const _OrganizerFinalBracketAction({required this.onAdvance});

  final Future<void> Function() onAdvance;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.primaryContainer.withValues(alpha: .35),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.primary.withValues(alpha: .35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Fase de grupos finalizada',
            style: TextStyle(
              color: scheme.onSurface,
              fontSize: 15.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Generá las semifinales con las posiciones finales de cada grupo.',
            style: TextStyle(color: scheme.onSurfaceVariant, height: 1.35),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton(
              onPressed: onAdvance,
              child: const Text('Generar cuadro final'),
            ),
          ),
        ],
      ),
    );
  }
}

final class _OrganizerStandingsSummary extends StatelessWidget {
  const _OrganizerStandingsSummary({
    required this.formatPresetName,
    required this.playerCount,
    required this.rounds,
    required this.matches,
    required this.courts,
  });

  final String? formatPresetName;
  final int playerCount;
  final int rounds;
  final int matches;
  final int courts;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: .14),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(AppIcons.trophy, color: scheme.primary, size: 19),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  '${tournamentFormatLabel(formatPresetName)} · $playerCount jugadores',
                  style: const TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 3),
          Padding(
            padding: const EdgeInsets.only(left: 48),
            child: Text(
              '$rounds rondas · $matches partidos · $courts canchas',
              style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12.5),
            ),
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: scheme.primaryContainer.withValues(alpha: .45),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text.rich(
              TextSpan(
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontSize: 12.5,
                  height: 1.35,
                ),
                children: [
                  const TextSpan(text: 'La tabla aparece con el '),
                  TextSpan(
                    text: 'primer resultado cargado',
                    style: TextStyle(
                      color: scheme.onSurface,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const TextSpan(text: '. El orden no cambia antes.'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

final class _OrganizerGenerateCard extends StatelessWidget {
  const _OrganizerGenerateCard({
    required this.confirmedParticipants,
    required this.formatPresentation,
    required this.canGenerate,
    required this.onGenerate,
  });

  final int confirmedParticipants;
  final TournamentFormatPresentation formatPresentation;
  final bool canGenerate;
  final VoidCallback onGenerate;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isGroupsPlusKnockout =
        formatPresentation == TournamentFormatPresentation.groupsPlusKnockout;
    final title = isGroupsPlusKnockout
        ? 'Generar fase de grupos'
        : 'Generar el cuadro';
    final description = isGroupsPlusKnockout
        ? 'La fase de grupos se arma con los $confirmedParticipants '
              'confirmados. El cuadro de eliminación se genera después, '
              'a partir de las posiciones.'
        : 'Eliminación simple con los $confirmedParticipants confirmados, '
              'incluidos los invitados.';
    final actionLabel = isGroupsPlusKnockout
        ? 'Generar fase de grupos'
        : 'Generar cuadro y horarios';
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
          Text(
            title,
            style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            description,
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
            label: Text(actionLabel),
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
            message: 'El calendario todavía no tiene partidos programados.',
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
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(AppIcons.info, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
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
                TextButton(
                  onPressed: onAction,
                  style: TextButton.styleFrom(padding: EdgeInsets.zero),
                  child: Text(actionLabel),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Renders the organizer's grouped first-round schedule.
final class _OrganizerScheduleList extends StatelessWidget {
  const _OrganizerScheduleList({required this.schedule, required this.venueId});

  static final _timeFormat = DateFormat('dd MMM HH:mm', 'es_ES');

  final TournamentScheduleDto schedule;
  final String? venueId;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    if (schedule.rounds.every((round) => round.matches.isEmpty)) {
      return const _InfoBox(
        message: 'El calendario todavía no tiene partidos programados.',
      );
    }

    final sections = <Widget>[];
    for (final round in schedule.rounds) {
      if (round.matches.isEmpty) continue;
      sections.addAll([
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: scheme.surfaceContainerHighest,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                round.name.toUpperCase(),
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: .3,
                ),
              ),
              Text(
                _roundTime(round.matches.first),
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: const BorderRadius.vertical(
              bottom: Radius.circular(16),
            ),
            border: Border.all(color: scheme.outlineVariant, width: 1.5),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              for (var i = 0; i < round.matches.length; i++) ...[
                _OrganizerMatchRow(
                  roundName: round.name,
                  match: round.matches[i],
                  timeFormat: _timeFormat,
                  venueId: venueId,
                ),
                if (i < round.matches.length - 1)
                  Divider(height: 1, color: scheme.outlineVariant),
              ],
            ],
          ),
        ),
        const SizedBox(height: 10),
      ]);
    }
    return Column(children: sections);
  }
}

String _roundTime(TournamentScheduleMatchDto match) => match.scheduledAt == null
    ? '--:--'
    : DateFormat('HH:mm').format(match.scheduledAt!);

/// A single "Partidos de hoy" row. Trailing content and subtitle depend on
/// the match's enriched state:
/// - `decision == REJECTED`: amber "{who} no puede a las {hh:mm}" subtitle
///   plus a "Mover" action (wired in M11d).
/// - `matchStatus == IN_PROGRESS`: normal time/court subtitle plus a
///   "Cargar" action (wired in M11c).
/// - `matchStatus == FINISHED` with recorded scores: the per-side score
///   total, e.g. "6-3".
/// - anything else: just the time/court subtitle, no trailing action.
final class _OrganizerMatchRow extends StatefulWidget {
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
  State<_OrganizerMatchRow> createState() => _OrganizerMatchRowState();
}

final class _OrganizerMatchRowState extends State<_OrganizerMatchRow> {
  bool _starting = false;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final roundName = widget.roundName;
    final match = widget.match;
    final timeFormat = widget.timeFormat;
    final venueId = widget.venueId;
    final isRejected = match.decision == 'REJECTED';
    final isLive = match.matchStatus == 'IN_PROGRESS';
    final isDone = match.matchStatus == 'FINISHED' && match.scores.isNotEmpty;
    //? Registrations are the canonical identity, so invited-only sides are
    //? also eligible for result entry.
    const rejectColor = Color(0xFFF59E0B);
    final isScheduled = match.matchStatus == 'SCHEDULED';
    final isCancelled = match.matchStatus == 'CANCELLED';
    final statusLabel = switch (match.matchStatus) {
      'SCHEDULED' => 'Programado',
      'IN_PROGRESS' => 'Activo',
      'FINISHED' => 'Finalizado',
      'CANCELLED' => 'Cancelado',
      _ => 'Sin estado',
    };
    final statusColor = isCancelled
        ? scheme.error
        : isLive
        ? scheme.primary
        : isDone
        ? scheme.onSurfaceVariant
        : scheme.onSurfaceVariant;

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
                  match.label.isEmpty
                      ? 'Partido'
                      : match.label.split(' vs ').first,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  match.label.contains(' vs ')
                      ? 'vs ${match.label.split(' vs ').skip(1).join(' vs ')}'
                      : (isRejected
                            ? _rejectedSubtitle(match, timeFormat)
                            : _scheduledSubtitle(match, timeFormat)),
                  style: TextStyle(
                    fontSize: 12.5,
                    color: isRejected ? rejectColor : scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  match.courtName == null
                      ? statusLabel
                      : '${match.courtName!.toUpperCase()} · $statusLabel',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: statusColor,
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
              onPressed: match.matchId == null
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
          else if (isScheduled || isRejected)
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (isScheduled && match.matchId != null)
                  OutlinedButton.icon(
                    onPressed: _starting ? null : () => _startMatch(context),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 34),
                    ),
                    icon: _starting
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(AppIcons.play, size: 15),
                    label: const Text('Iniciar'),
                  ),
                OutlinedButton(
                  onPressed:
                      venueId == null ||
                          match.roundNumber == null ||
                          match.matchNumber == null
                      ? null
                      : () => _openRescheduleSheet(context),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 34),
                  ),
                  child: const Text('Mover'),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Future<void> _startMatch(BuildContext context) async {
    final matchId = widget.match.matchId;
    if (matchId == null) return;
    setState(() => _starting = true);
    try {
      await getIt<MatchesRepository>().startMatch(matchId);
      if (!context.mounted) return;
      await context.read<TournamentScheduleCubit>().load();
    } on AppFailure catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  Future<void> _openRescheduleSheet(BuildContext context) async {
    try {
      final courts = await getIt<VenuesRepository>().listVenueCourts(
        venueId: widget.venueId!,
        status: 'ACTIVE',
      );
      if (!context.mounted) return;
      await showRescheduleSheet(
        context,
        courts: courts,
        onSubmit: ({required courtId, required scheduledAt}) =>
            context.read<TournamentScheduleCubit>().rescheduleMatch(
              roundNumber: widget.match.roundNumber!,
              matchNumber: widget.match.matchNumber!,
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
