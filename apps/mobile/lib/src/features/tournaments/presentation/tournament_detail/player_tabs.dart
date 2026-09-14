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

  @override
  void initState() {
    super.initState();
    _future = widget.tournamentsRepository.listMyTournamentMatches(
      tournamentId: widget.tournamentId,
    );
  }

  Future<void> _respond(MyTournamentMatchDto match, String response) async {
    setState(() => _busy = '${match.roundNumber}.${match.matchNumber}');
    await widget.tournamentsRepository.respondToTournamentSlot(
      tournamentId: widget.tournamentId,
      roundNumber: match.roundNumber,
      matchNumber: match.matchNumber,
      response: response,
    );
    if (!mounted) return;
    setState(() {
      _busy = null;
      _future = widget.tournamentsRepository.listMyTournamentMatches(
        tournamentId: widget.tournamentId,
      );
    });
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
          return const _InfoBox(message: 'No se pudieron cargar tus partidos.');
        }
        final matches = snapshot.data ?? const <MyTournamentMatchDto>[];
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 130),
          children: [
            Text(
              'Sólo tus partidos. El cuadro completo está en Tabla.',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 12),
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
    required this.tournamentsRepository,
  });

  final String tournamentId;
  final TournamentsRepository tournamentsRepository;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
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
                _ScoreboardTable(scoreboard: scoreboard),
                const SizedBox(height: 16),
                FilledButton.icon(
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
              ],
            ),
          };
        },
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

