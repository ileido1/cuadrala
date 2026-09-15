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

/// Legal next statuses for the current one, mirroring the backend's
/// `tournament_status_machine.ts` (table-driven edges: DRAFT→OPEN,
/// OPEN→IN_PROGRESS, IN_PROGRESS→COMPLETED, {DRAFT,OPEN}→CANCELLED).
List<String> _legalNextStatuses(String currentStatus) {
  switch (currentStatus.toUpperCase()) {
    case 'DRAFT':
      return const ['OPEN', 'CANCELLED'];
    case 'OPEN':
      return const ['IN_PROGRESS', 'CANCELLED'];
    case 'IN_PROGRESS':
      return const ['COMPLETED'];
    default:
      return const [];
  }
}

String _statusActionLabel(String status) {
  switch (status) {
    case 'OPEN':
      return 'Abrir inscripciones';
    case 'IN_PROGRESS':
      return 'Iniciar torneo';
    case 'COMPLETED':
      return 'Finalizar torneo';
    case 'CANCELLED':
      return 'Cancelar torneo';
    default:
      return status;
  }
}

/// Organizer-only status-transition control. Only the tournament organizer
/// (`organizerUserId == currentUserId`) sees this; the backend enforces the
/// same guard independently, so this is a UX affordance, not the source of
/// authorization truth.
///
/// Public (`@visibleForTesting`) so widget tests can pump it directly without
/// dragging in the rest of [TournamentDetailBody] (see
/// `tournament_detail_screen_test.dart`).
@visibleForTesting
final class OrganizerStatusControl extends StatefulWidget {
  const OrganizerStatusControl({
    super.key,
    required this.tournamentId,
    required this.organizerUserId,
    required this.currentStatus,
    this.onStatusChanged,
  });

  final String tournamentId;
  final String organizerUserId;
  final String currentStatus;
  final VoidCallback? onStatusChanged;

  @override
  State<OrganizerStatusControl> createState() => _OrganizerStatusControlState();
}

final class _OrganizerStatusControlState extends State<OrganizerStatusControl> {
  bool _submitting = false;
  String? _error;

  Future<void> _submitSV(String nextStatus) async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await getIt<TournamentsRepository>().updateTournamentStatus(
        tournamentId: widget.tournamentId,
        status: nextStatus,
      );
      if (!mounted) return;
      setState(() => _submitting = false);
      // Notificar al padre para que actualice el estado del torneo
      widget.onStatusChanged?.call();
    } on AppFailure catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = 'No se pudo cambiar el estado del torneo.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<
      TournamentRegistrationsCubit,
      TournamentRegistrationsState
    >(
      builder: (context, state) {
        final cubit = context.read<TournamentRegistrationsCubit>();
        if (cubit.currentUserId == null ||
            cubit.currentUserId != widget.organizerUserId) {
          return const SizedBox.shrink();
        }

        final nextStatuses = _legalNextStatuses(widget.currentStatus);
        if (nextStatuses.isEmpty) {
          return const SizedBox.shrink();
        }

        final scheme = Theme.of(context).colorScheme;

        return Column(
          key: const Key('tournament.organizerStatusControl'),
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            //? Aclaración de estado para el organizador: deja claro que un
            //? torneo en DRAFT no es visible para el público hasta publicarlo.
            if (widget.currentStatus == 'DRAFT')
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'Tu torneo está en borrador: todavía no es visible para los jugadores. '
                  'Publicalo cuando esté listo.',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            if (_error != null) ...[
              Text(
                _error!,
                style: TextStyle(color: scheme.error, fontSize: 12),
              ),
              const SizedBox(height: 4),
            ],
            Row(
              children: [
                Text(
                  'Acciones',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final next in nextStatuses)
                      FilledButton.tonal(
                        //? Ancho acotado: el theme global (Size.fromHeight) no
                        //? puede usarse dentro de un Row.
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 40),
                        ),
                        onPressed: _submitting ? null : () => _submitSV(next),
                        child: Text(_statusActionLabel(next)),
                      ),
                  ],
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}
