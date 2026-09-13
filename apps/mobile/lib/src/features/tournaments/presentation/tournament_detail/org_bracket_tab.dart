part of '../tournament_detail_screen.dart';

final class _OrganizerBracketTab extends StatelessWidget {
  const _OrganizerBracketTab({
    required this.tournamentId,
    required this.organizerUserId,
    required this.tournamentsRepository,
  });

  final String tournamentId;
  final String? organizerUserId;
  final TournamentsRepository tournamentsRepository;

  @override
  Widget build(BuildContext context) {
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
          final confirmedWithAccount = registrations
              .where((r) => r.status == 'CONFIRMED' && !r.isGuest)
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
                TournamentScheduleUnsupported() => const _InfoBox(
                  message:
                      'Este torneo no arma cuadro. El cuadro existe sólo para eliminación simple.',
                ),
                TournamentScheduleError(:final message) => _ErrorBox(
                  message: message,
                  onRetry: () => context.read<TournamentScheduleCubit>().load(),
                ),
                TournamentScheduleSuccess(:final schedule) =>
                  _OrganizerGeneratedSchedule(
                    schedule: schedule,
                    tournamentId: tournamentId,
                    tournamentsRepository: tournamentsRepository,
                  ),
                TournamentScheduleConflict() => _OrganizerGeneratedCard(
                  tournamentId: tournamentId,
                  tournamentsRepository: tournamentsRepository,
                ),
                TournamentScheduleInitial() ||
                TournamentScheduleEmpty() => _OrganizerGenerateCard(
                  confirmedWithAccount: confirmedWithAccount,
                  canGenerate:
                      _isOrganizer(
                        organizerUserId,
                        registrationsCubit.currentUserId,
                      ) &&
                      confirmedWithAccount >= 2,
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

final class _OrganizerGenerateCard extends StatelessWidget {
  const _OrganizerGenerateCard({
    required this.confirmedWithAccount,
    required this.canGenerate,
    required this.onGenerate,
  });

  final int confirmedWithAccount;
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
            child: Icon(
              Icons.emoji_events_outlined,
              color: scheme.primary,
              size: 26,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Generar el cuadro',
            style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            'Eliminación simple con los $confirmedWithAccount confirmados con cuenta. Los huéspedes quedan fuera del cuadro.',
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
            icon: const Icon(Icons.auto_awesome, size: 19),
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
  });

  final String tournamentId;
  final TournamentsRepository tournamentsRepository;

  @override
  Widget build(BuildContext context) {
    return _OrganizerGeneratedSchedule(
      schedule: TournamentScheduleDto.empty(),
      tournamentId: tournamentId,
      tournamentsRepository: tournamentsRepository,
      generatedWithoutSchedule: true,
    );
  }
}

final class _OrganizerGeneratedSchedule extends StatelessWidget {
  const _OrganizerGeneratedSchedule({
    required this.schedule,
    required this.tournamentId,
    required this.tournamentsRepository,
    this.generatedWithoutSchedule = false,
  });

  final TournamentScheduleDto schedule;
  final String tournamentId;
  final TournamentsRepository tournamentsRepository;
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
                icon: const Icon(Icons.emoji_events_outlined, size: 17),
                label: const Text('Ver cuadro'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                onPressed: null,
                icon: const Icon(Icons.add, size: 17),
                label: const Text('Cargar resultado'),
              ),
            ),
          ],
        ),
        if (!generatedWithoutSchedule && schedule.rounds.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text(
            'Partidos de hoy',
            style: _sectionStyle(Theme.of(context).colorScheme),
          ),
          const SizedBox(height: 10),
          _ScheduleList(schedule: schedule),
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

