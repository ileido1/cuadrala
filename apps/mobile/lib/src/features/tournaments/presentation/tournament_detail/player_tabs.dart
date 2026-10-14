part of '../tournament_detail_screen.dart';

final class _MyMatchesTab extends StatefulWidget {
  const _MyMatchesTab({
    required this.tournamentId,
    required this.tournamentsRepository,
  });

  final String tournamentId;
  final TournamentsRepository tournamentsRepository;

  @override
  State<_MyMatchesTab> createState() => _MyMatchesTabState();
}

final class _MyMatchesTabState extends State<_MyMatchesTab> {
  late Future<List<MyTournamentMatchDto>> _future;
  String? _busy;
  String? _responseError;

  @override
  void initState() {
    super.initState();
    _future = widget.tournamentsRepository.listMyTournamentMatches(
      tournamentId: widget.tournamentId,
    );
  }

  Future<void> _respond(MyTournamentMatchDto match, String response) async {
    setState(() => _busy = '${match.roundNumber}.${match.matchNumber}');
    try {
      await widget.tournamentsRepository.respondToTournamentSlot(
        tournamentId: widget.tournamentId,
        roundNumber: match.roundNumber,
        matchNumber: match.matchNumber,
        response: response,
      );
      if (!mounted) return;
      setState(() {
        _responseError = null;
        _future = widget.tournamentsRepository.listMyTournamentMatches(
          tournamentId: widget.tournamentId,
        );
      });
    } catch (_) {
      if (mounted) {
        setState(() => _responseError = 'No se pudo guardar tu respuesta.');
      }
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<MyTournamentMatchDto>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _ErrorBox(
            message: 'No se pudieron cargar tus partidos.',
            onRetry: () => setState(() {
              _future = widget.tournamentsRepository.listMyTournamentMatches(
                tournamentId: widget.tournamentId,
              );
            }),
          );
        }
        final matches = snapshot.data ?? const <MyTournamentMatchDto>[];
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 130),
          children: [
            Text(
              'Tus partidos. Los resultados se ven en Tabla.',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 12),
            if (_responseError != null) ...[
              _ErrorBox(
                message: _responseError!,
                onRetry: () => setState(() {
                  _future = widget.tournamentsRepository
                      .listMyTournamentMatches(
                        tournamentId: widget.tournamentId,
                      );
                  _responseError = null;
                }),
              ),
              const SizedBox(height: 12),
            ],
            if (matches.isEmpty)
              const _InfoBox(message: 'Todavía no hay partidos asignados.'),
            for (final match in matches)
              MyTournamentMatchCard(
                match: match,
                busy: _busy == '${match.roundNumber}.${match.matchNumber}',
                onRespond: (response) => _respond(match, response),
              ),
          ],
        );
      },
    );
  }
}

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
            TournamentScheduleInitial() => const _InfoBox(
              message:
                  'No hay calendario disponible todavía. El organizador debe generarlo cuando haya suficientes participantes.',
            ),
            TournamentScheduleLoading() => const Center(
              child: CircularProgressIndicator(),
            ),
            TournamentScheduleGenerating() => const Center(
              child: CircularProgressIndicator(),
            ),
            TournamentScheduleUnsupported() => const _InfoBox(
              message:
                  'Este formato de torneo no permite generar el calendario automáticamente.',
            ),
            TournamentScheduleConflict() => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const _InfoBox(
                  message: 'Ya se generó el calendario del torneo.',
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 40),
                        ),
                        onPressed: () =>
                            context.read<TournamentScheduleCubit>().load(),
                        icon: const Icon(AppIcons.calendar),
                        label: const Text('Ver calendario'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, 40),
                        ),
                        onPressed: () =>
                            context.read<TournamentScheduleCubit>().generate(),
                        icon: const Icon(AppIcons.refresh),
                        label: const Text('Regenerar'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            //? Esta Column no tenía scroll propio: en pantallas bajas el
            //? contador de participantes y el CTA de generar calendario
            //? desbordaban y quedaban fuera de alcance. El scroll va sólo acá
            //? — la rama de éxito ya es un ListView y anidarlo lo rompe.
            TournamentScheduleEmpty() => SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _InfoBox(
                    message:
                        'El organizador debe generar el calendario cuando haya al menos 2 participantes.',
                  ),
                  const SizedBox(height: 12),
                  BlocBuilder<
                    TournamentRegistrationsCubit,
                    TournamentRegistrationsState
                  >(
                    builder: (context, regState) {
                      final registrations =
                          regState is TournamentRegistrationsLoaded
                          ? regState.items
                          : const <TournamentRegistrationDto>[];
                      final missing = 2 - registrations.length;
                      final enoughParticipants = registrations.length >= 2;
                      final cubit = context
                          .read<TournamentRegistrationsCubit>();

                      //? `organizerUserId` es un campo `required` no
                      //? opcional-por-carga: `null` significa que el torneo
                      //? no tiene organizador asignado (DTO nullable per
                      //? S3a), nunca "todavía no cargó". Un spinner infinito
                      //? acá bloqueaba (via `pumpAndSettle`) cualquier
                      //? interacción para un torneo sin organizador — la
                      //? igualdad de abajo ya da `false` correctamente
                      //? cuando es `null`, sin necesitar este caso especial.
                      final isOrganizer =
                          organizerUserId != null &&
                          cubit.currentUserId == organizerUserId;

                      // Solo el organizador puede generar el calendario
                      if (!isOrganizer) {
                        return const _InfoBox(
                          message:
                              'Solo el organizador puede generar el calendario.',
                        );
                      }

                      //? Mostrar contador y CTA clara
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Participantes: ${registrations.length}/2',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onSurfaceVariant,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                          const SizedBox(height: 8),
                          FilledButton(
                            onPressed: enoughParticipants
                                ? () => context
                                      .read<TournamentScheduleCubit>()
                                      .generate()
                                : null,
                            child: const Text('Generar calendario'),
                          ),
                          if (!enoughParticipants) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Se necesitan $missing participante${missing == 1 ? '' : 's'} más.',
                              style: TextStyle(
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurfaceVariant,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
            TournamentScheduleError(:final message) => _ErrorBox(
              message: message,
              onRetry: () => context.read<TournamentScheduleCubit>().load(),
            ),
            TournamentScheduleSuccess(:final schedule) => _ScheduleList(
              schedule: schedule,
            ),
          };
        },
      ),
    );
  }
}

final class _ScoreboardTab extends StatelessWidget {
  const _ScoreboardTab({
    required this.tournamentId,
    required this.tournament,
    required this.tournamentsRepository,
    this.showBracketButton = true,
  });

  final String tournamentId;
  final TournamentListItemDto? tournament;
  final TournamentsRepository tournamentsRepository;
  final bool showBracketButton;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      child: SingleChildScrollView(
        child: BlocBuilder<TournamentScoreboardCubit, TournamentScoreboardState>(
          builder: (context, state) {
            return switch (state) {
              TournamentScoreboardInitial() => const Center(
                child: CircularProgressIndicator(),
              ),
              TournamentScoreboardLoading() => const Center(
                child: CircularProgressIndicator(),
              ),
              TournamentScoreboardEmpty() => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _InfoBox(
                    message:
                        'La clasificación estará disponible cuando comience el torneo.',
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '💡 Para registrar resultados, ve a la pestaña "Calendario" y toca el partido.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              TournamentScoreboardError(:final message) => _ErrorBox(
                message: message,
                onRetry: () => context.read<TournamentScoreboardCubit>().load(),
              ),
              TournamentScoreboardSuccess(:final scoreboard) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  BlocBuilder<TournamentScheduleCubit, TournamentScheduleState>(
                    builder: (context, scheduleState) => _ScoreboardTable(
                      scoreboard: scoreboard,
                      tournament: tournament,
                      schedule: scheduleState is TournamentScheduleSuccess
                          ? scheduleState.schedule
                          : null,
                      currentUserId: context
                          .read<TournamentRegistrationsCubit>()
                          .currentUserId,
                    ),
                  ),
                  BlocBuilder<TournamentScheduleCubit, TournamentScheduleState>(
                    builder: (context, scheduleState) {
                      final schedule =
                          scheduleState is TournamentScheduleSuccess
                          ? scheduleState.schedule
                          : null;
                      if (!showBracketButton ||
                          (!_scoreboardHasResults(scoreboard) &&
                              !_scheduleHasResults(schedule))) {
                        return const SizedBox.shrink();
                      }
                      return Padding(
                        padding: const EdgeInsets.only(top: 16),
                        child: FilledButton.icon(
                          onPressed: () {
                            showModalBottomSheet<void>(
                              context: context,
                              isScrollControlled: true,
                              builder: (_) => SizedBox(
                                height: MediaQuery.sizeOf(context).height * 0.9,
                                child: BracketScreen(
                                  tournamentId: tournamentId,
                                  tournamentsRepository: tournamentsRepository,
                                ),
                              ),
                            );
                          },
                          icon: const Icon(AppIcons.scoreboard),
                          label: const Text('Ver el cuadro completo'),
                        ),
                      );
                    },
                  ),
                ],
              ),
            };
          },
        ),
      ),
    );
  }
}

final class _ScheduleList extends StatelessWidget {
  const _ScheduleList({required this.schedule});

  static final _dateFormat = DateFormat('dd MMM HH:mm', 'es_ES');

  final TournamentScheduleDto schedule;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      children: [
        for (final round in schedule.rounds) ...[
          Text(
            round.name.isEmpty ? 'Ronda' : round.name,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
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
              (m) => _MatchTile(match: m, dateFormat: _dateFormat),
            ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }
}

final class _MatchTile extends StatelessWidget {
  const _MatchTile({required this.match, required this.dateFormat});

  final TournamentScheduleMatchDto match;
  final DateFormat dateFormat;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final canNavigateToLive = match.matchId != null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: canNavigateToLive
            ? () => context.push(Routes.matchLive(match.matchId!))
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
                      match.label.isEmpty ? 'Partido' : match.label,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    if (match.scheduledAt != null ||
                        match.courtName != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        [
                          if (match.scheduledAt != null)
                            dateFormat.format(match.scheduledAt!),
                          if (match.courtName != null) match.courtName!,
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
                match.status,
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
  }
}

bool _scoreboardHasResults(TournamentScoreboardDto scoreboard) =>
    scoreboard.rows.any(
      (row) =>
          row.gamesPlayed > 0 ||
          row.gamesWon > 0 ||
          row.gamesLost > 0 ||
          row.gamesDrawn > 0 ||
          row.pointsFor != 0 ||
          row.pointsAgainst != 0 ||
          row.difference != 0 ||
          row.points != 0,
    );

bool _scheduleHasResults(TournamentScheduleDto? schedule) =>
    schedule?.rounds.any(
      (round) => round.matches.any((match) => match.scores.isNotEmpty),
    ) ??
    false;

final class _ScoreboardTable extends StatelessWidget {
  const _ScoreboardTable({
    required this.scoreboard,
    this.schedule,
    this.tournament,
    this.currentUserId,
  });

  final TournamentScoreboardDto scoreboard;
  final TournamentScheduleDto? schedule;
  final TournamentListItemDto? tournament;
  final String? currentUserId;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final rows = scoreboard.rows;
    if (rows.isEmpty) {
      return const _InfoBox(message: 'Aún no hay tabla para este torneo.');
    }
    final hasScoreboardMetrics = _scoreboardHasResults(scoreboard);
    final hasScheduleResults = _scheduleHasResults(schedule);
    if (!hasScoreboardMetrics) {
      final matches =
          schedule?.rounds.expand((round) => round.matches).toList() ??
          const <TournamentScheduleMatchDto>[];
      final courts = matches
          .map((match) => match.courtName)
          .whereType<String>()
          .toSet()
          .length;
      final rounds = schedule?.rounds.take(2).toList() ?? const [];
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: scheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: scheme.outlineVariant),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(AppIcons.scoreboard, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${tournament?.formatPresetName == null ? 'Torneo' : tournamentFormatLabel(tournament!.formatPresetName)} · ${tournament?.registrationCount ?? rows.length} jugadores',
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${schedule?.rounds.length ?? 0} rondas · ${matches.length} partidos · $courts canchas',
                ),
                const SizedBox(height: 12),
                Text(
                  hasScheduleResults
                      ? 'Hay resultados cargados; la clasificación espera las métricas oficiales.'
                      : 'La tabla aparece con el primer resultado cargado. Con todos en cero no ordena nada.',
                ),
              ],
            ),
          ),
          if (rounds.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'Primeras rondas',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            for (var index = 0; index < rounds.length; index++)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            rounds[index].name.isEmpty
                                ? 'Ronda ${index + 1}'
                                : rounds[index].name,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          if (rounds[index].matches.isNotEmpty &&
                              rounds[index].matches.every(
                                (match) =>
                                    match.scheduledAt ==
                                    rounds[index].matches.first.scheduledAt,
                              ) &&
                              rounds[index].matches.first.scheduledAt != null)
                            Text(
                              DateFormat('HH:mm').format(
                                rounds[index].matches.first.scheduledAt!,
                              ),
                              style: Theme.of(context).textTheme.labelSmall,
                            ),
                        ],
                      ),
                      for (final match in rounds[index].matches)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 58,
                                child: Text(
                                  match.courtName ?? '',
                                  style: Theme.of(context).textTheme.labelSmall,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  match.label.isEmpty ? 'Partido' : match.label,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
          ],
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              border: Border.all(color: scheme.outlineVariant),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cómo se ordena la tabla',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
                SizedBox(height: 6),
                Text(
                  '1 · Puntos (games ganados) → 2 · Diferencia de games → 3 · Enfrentamiento directo',
                ),
              ],
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: scheme.primary,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'Se actualiza sola al cargarse cada resultado',
              style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: rows.map<Widget>((row) {
              final isViewerRow =
                  currentUserId != null && row.userId == currentUserId;
              final isGuest =
                  row.userId == null && row.tournamentRegistrationId != null;
              final name = row.name.isEmpty
                  ? (row.userId ?? row.tournamentRegistrationId ?? 'Invitado')
                  : row.name;
              return Container(
                key: Key(
                  'tournament.scoreboard.row.${row.userId ?? row.tournamentRegistrationId ?? name}',
                ),
                color: isViewerRow
                    ? scheme.primaryContainer.withValues(alpha: .35)
                    : null,
                child: ExpansionTile(
                  key: PageStorageKey(
                    'scoreboard-${row.userId ?? row.tournamentRegistrationId ?? name}',
                  ),
                  initiallyExpanded: isViewerRow,
                  leading: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 20,
                        child: Text(
                          '${row.rank}',
                          style: TextStyle(
                            color: row.rank <= 3
                                ? scheme.primary
                                : scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      CircleAvatar(
                        radius: 16,
                        child: Text(
                          _scoreboardInitials(name),
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  title: Row(
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontWeight: isViewerRow
                                ? FontWeight.w800
                                : FontWeight.w600,
                          ),
                        ),
                      ),
                      if (isViewerRow)
                        _ScoreTag(label: 'VOS', color: scheme.primary),
                      if (isGuest)
                        _ScoreTag(
                          label: 'HUÉSPED',
                          color: scheme.onSurfaceVariant,
                        ),
                    ],
                  ),
                  subtitle: Text(
                    '${row.gamesPlayed} PJ · ${row.gamesWon}G-${row.gamesLost}P · dif ${row.difference >= 0 ? '+' : ''}${row.difference}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '${row.points}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const Text(
                            'PTS',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 4),
                      const Icon(AppIcons.chevronRight, size: 18),
                    ],
                  ),
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                      child: Row(
                        children: [
                          _ScoreMetric(
                            label: 'PJ',
                            value: '${row.gamesPlayed}',
                          ),
                          _ScoreMetric(
                            label: 'G-P',
                            value: '${row.gamesWon}-${row.gamesLost}',
                          ),
                          _ScoreMetric(
                            label: 'Games',
                            value: '${row.pointsFor}:${row.pointsAgainst}',
                          ),
                          _ScoreMetric(
                            label: 'Dif',
                            value:
                                '${row.difference >= 0 ? '+' : ''}${row.difference}',
                          ),
                        ],
                      ),
                    ),
                    if (schedule != null)
                      _ScoreRounds(row: row, schedule: schedule!, rows: rows),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

String _scoreboardInitials(String name) => name
    .trim()
    .split(RegExp(r'\s+'))
    .where((part) => part.isNotEmpty)
    .take(2)
    .map((part) => part.substring(0, 1).toUpperCase())
    .join();

final class _ScoreTag extends StatelessWidget {
  const _ScoreTag({required this.label, required this.color});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(left: 4),
    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
    decoration: BoxDecoration(
      color: color.withValues(alpha: .13),
      borderRadius: BorderRadius.circular(5),
    ),
    child: Text(
      label,
      style: TextStyle(
        fontSize: 8.5,
        fontWeight: FontWeight.w800,
        color: color,
      ),
    ),
  );
}

final class _ScoreRounds extends StatelessWidget {
  const _ScoreRounds({
    required this.row,
    required this.schedule,
    required this.rows,
  });
  final TournamentScoreboardRowDto row;
  final TournamentScheduleDto schedule;
  final List<TournamentScoreboardRowDto> rows;
  @override
  Widget build(BuildContext context) {
    final identity = _scoreIdentity(row);
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: Column(
        children: [
          for (var i = 0; i < schedule.rounds.length; i++)
            _ScoreRoundCard(
              roundLabel: 'R${i + 1}',
              matches: schedule.rounds[i].matches,
              identity: identity,
              rows: rows,
            ),
          const SizedBox(height: 6),
          Text(
            'Abajo de cada ronda, con quién jugó. Los puntos son del jugador, no de la dupla.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

final class _ScoreRoundCard extends StatelessWidget {
  const _ScoreRoundCard({
    required this.roundLabel,
    required this.matches,
    required this.identity,
    required this.rows,
  });
  final String roundLabel;
  final List<TournamentScheduleMatchDto> matches;
  final Set<String> identity;
  final List<TournamentScoreboardRowDto> rows;
  @override
  Widget build(BuildContext context) {
    final match = matches
        .where(
          (item) => item.sides.any(
            (side) => _sideIdentity(side).intersection(identity).isNotEmpty,
          ),
        )
        .firstOrNull;
    final ownSide = match?.sides
        .where((side) => _sideIdentity(side).intersection(identity).isNotEmpty)
        .firstOrNull;
    final opponentSide = match?.sides
        .where((side) => !identical(side, ownSide))
        .firstOrNull;
    final result = match == null || ownSide == null || opponentSide == null
        ? null
        : '${_pointsForSide(match, ownSide) ?? '—'}-${_pointsForSide(match, opponentSide) ?? '—'}';
    final partners = ownSide == null
        ? const <String>[]
        : _sideIdentity(ownSide)
              .difference(identity)
              .map((key) => _nameForIdentity(rows, key))
              .whereType<String>()
              .toList();
    return Container(
      margin: const EdgeInsets.only(top: 7),
      padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 6),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              roundLabel,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
            ),
          ),
          Expanded(
            child: Text(
              result ?? '—',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
            ),
          ),
          Expanded(
            child: Text(
              partners.isEmpty ? '—' : partners.join(' · '),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ),
        ],
      ),
    );
  }
}

Set<String> _scoreIdentity(TournamentScoreboardRowDto row) => {
  if (row.userId != null) 'user:${row.userId}',
  if (row.tournamentRegistrationId != null)
    'registration:${row.tournamentRegistrationId}',
};
Set<String> _sideIdentity(TournamentScheduleMatchSideDto side) => {
  ...side.userIds.whereType<String>().map((id) => 'user:$id'),
  ...side.registrationIds.map((id) => 'registration:$id'),
};
String? _nameForIdentity(
  List<TournamentScoreboardRowDto> rows,
  String identity,
) {
  for (final row in rows) {
    if (_scoreIdentity(row).contains(identity) && row.name.isNotEmpty) {
      return row.name;
    }
  }
  return null;
}

String? _pointsForSide(
  TournamentScheduleMatchDto match,
  TournamentScheduleMatchSideDto side,
) {
  final sideIdentities = _sideIdentity(side);
  final values = match.scores
      .where((score) {
        final identity = score.userId != null
            ? 'user:${score.userId}'
            : score.tournamentRegistrationId == null
            ? null
            : 'registration:${score.tournamentRegistrationId}';
        return identity != null && sideIdentities.contains(identity);
      })
      .map((score) => score.points)
      .toSet();
  return values.length == 1 ? '${values.single}' : null;
}

final class _ScoreMetric extends StatelessWidget {
  const _ScoreMetric({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Expanded(
    child: Column(
      children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
      ],
    ),
  );
}
