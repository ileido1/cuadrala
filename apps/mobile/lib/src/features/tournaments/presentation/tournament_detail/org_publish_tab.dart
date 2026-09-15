part of '../tournament_detail_screen.dart';

final class _OrganizerPublishTab extends StatelessWidget {
  const _OrganizerPublishTab({
    required this.tournament,
    required this.tournamentId,
    required this.organizerUserId,
    required this.tournamentsRepository,
  });

  final TournamentListItemDto? tournament;
  final String tournamentId;
  final String? organizerUserId;
  final TournamentsRepository tournamentsRepository;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
      children: [
        Text('Quién lo ve', style: _sectionStyle(scheme)),
        const SizedBox(height: 10),
        if (tournament != null)
          BlocProvider(
            create: (_) => TournamentPublishCubit(
              tournamentsRepository: tournamentsRepository,
              tournamentId: tournamentId,
              status: tournament!.status,
              visibility: tournament!.visibility,
            ),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: scheme.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: scheme.outlineVariant, width: 1.5),
              ),
              child:
                  BlocBuilder<TournamentPublishCubit, TournamentPublishState>(
                    builder: (context, state) => Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Torneo público',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    state.visibility == 'PUBLIC'
                                        ? 'Aparece en el listado de la app'
                                        : 'Sólo lo ven los que invitás',
                                    style: TextStyle(
                                      color: scheme.onSurfaceVariant,
                                      fontSize: 12.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IgnorePointer(
                              ignoring: state.submitting,
                              child: PillToggle(
                                key: const Key('tournament.visibilityControl'),
                                value: state.visibility == 'PUBLIC',
                                onChanged: (isPublic) => context
                                    .read<TournamentPublishCubit>()
                                    .setVisibility(
                                      isPublic ? 'PUBLIC' : 'PRIVATE',
                                    ),
                              ),
                            ),
                          ],
                        ),
                        if (state.error != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            state.error!,
                            style: TextStyle(color: scheme.error, fontSize: 12),
                          ),
                        ],
                      ],
                    ),
                  ),
            ),
          ),
        const SizedBox(height: 20),
        Text('Estado de la inscripción', style: _sectionStyle(scheme)),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: scheme.outlineVariant, width: 1.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (tournament != null && organizerUserId != null)
                OrganizerStatusControl(
                  tournamentId: tournamentId,
                  organizerUserId: organizerUserId!,
                  currentStatus: tournament!.status,
                  tournamentsRepository: tournamentsRepository,
                ),
              const SizedBox(height: 12),
              const Text(
                'Son dos cosas distintas: publicar no cierra la inscripción, y cerrar la inscripción no despublica el torneo.',
                style: TextStyle(fontSize: 12.5, height: 1.5),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text('Avisos', style: _sectionStyle(scheme)),
        const SizedBox(height: 10),
        const _InfoBox(
          message:
              'No hay un botón de "avisar a todos": el aviso sale solo con cada acción.',
        ),
      ],
    );
  }
}

TextStyle _sectionStyle(ColorScheme scheme) => TextStyle(
  color: scheme.onSurfaceVariant,
  fontSize: 12,
  fontWeight: FontWeight.w800,
  letterSpacing: 0.4,
);

/// Organizer-only status-transition control. Only the tournament organizer
/// (`organizerUserId == currentUserId`) sees this; the backend enforces the
/// same guard independently, so this is a UX affordance, not the source of
/// authorization truth.
///
/// Public (`@visibleForTesting`) so widget tests can pump it directly without
/// dragging in the rest of [TournamentDetailBody] (see
/// `tournament_detail_screen_test.dart`).
@visibleForTesting
final class OrganizerStatusControl extends StatelessWidget {
  const OrganizerStatusControl({
    super.key,
    required this.tournamentId,
    required this.organizerUserId,
    required this.currentStatus,
    required this.tournamentsRepository,
  });

  final String tournamentId;
  final String organizerUserId;
  final String currentStatus;
  final TournamentsRepository tournamentsRepository;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<
      TournamentRegistrationsCubit,
      TournamentRegistrationsState
    >(
      builder: (context, state) {
        final cubit = context.read<TournamentRegistrationsCubit>();
        if (cubit.currentUserId == null ||
            cubit.currentUserId != organizerUserId) {
          return const SizedBox.shrink();
        }

        return BlocProvider(
          create: (_) => TournamentPublishCubit(
            tournamentsRepository: tournamentsRepository,
            tournamentId: tournamentId,
            status: currentStatus,
            visibility: 'PUBLIC',
          ),
          child: const _OrganizerStatusSegmented(),
        );
      },
    );
  }
}

final class _OrganizerStatusSegmented extends StatelessWidget {
  const _OrganizerStatusSegmented();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return BlocBuilder<TournamentPublishCubit, TournamentPublishState>(
      builder: (context, state) {
        final enabled = enabledStatusOptions(state.status);
        final explanation = _statusExplanation(state.status);

        return Column(
          key: const Key('tournament.organizerStatusControl'),
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            IgnorePointer(
              ignoring: state.submitting,
              child: SegmentedControl<String>(
                key: const Key('tournament.statusControl'),
                value: state.status,
                options: [
                  SegmentedOption(
                    value: 'DRAFT',
                    label: 'Borrador',
                    enabled: enabled.contains('DRAFT'),
                  ),
                  SegmentedOption(
                    value: 'OPEN',
                    label: 'Abierta',
                    enabled: enabled.contains('OPEN'),
                  ),
                  SegmentedOption(
                    value: 'IN_PROGRESS',
                    label: 'En juego',
                    enabled: enabled.contains('IN_PROGRESS'),
                  ),
                ],
                onChanged: context.read<TournamentPublishCubit>().updateStatus,
              ),
            ),
            if (explanation != null) ...[
              const SizedBox(height: 12),
              Text(
                explanation,
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontSize: 12.5,
                  height: 1.5,
                ),
              ),
            ],
            if (state.error != null) ...[
              const SizedBox(height: 8),
              Text(
                state.error!,
                style: TextStyle(color: scheme.error, fontSize: 12),
              ),
            ],
          ],
        );
      },
    );
  }
}

String? _statusExplanation(String status) => switch (status) {
  'DRAFT' => 'Podés seguir cargando gente, pero nadie se anota solo.',
  'OPEN' => 'Cualquiera de la categoría puede anotarse. Entra como pendiente.',
  'IN_PROGRESS' =>
    'Se cierran las inscripciones: ya no entra ni sale nadie del plantel.',
  _ => null,
};
