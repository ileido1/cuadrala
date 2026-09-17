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
        if (tournament != null) ...[
          _TournamentSettingsEntry(
            tournament: tournament!,
            tournamentId: tournamentId,
            tournamentsRepository: tournamentsRepository,
          ),
          const SizedBox(height: 20),
        ],
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
        const _OrganizerAvisos(),
        const SizedBox(height: 12),
        const _InfoBox(
          message:
              'No hay un botón de "avisar a todos": el aviso sale solo con cada acción.',
        ),
      ],
    );
  }
}

final class _TournamentSettingsEntry extends StatelessWidget {
  const _TournamentSettingsEntry({
    required this.tournament,
    required this.tournamentId,
    required this.tournamentsRepository,
  });

  final TournamentListItemDto tournament;
  final String tournamentId;
  final TournamentsRepository tournamentsRepository;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final format = tournamentFormatLabel(tournament.formatPresetName);
    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: const Icon(AppIcons.sliders),
        title: const Text(
          'Formato del torneo',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(
          [
            if (format.isNotEmpty) format,
            tournament.sportName,
            tournament.categoryName,
            tournament.pairedRegistration ? 'Duplas fijas' : 'Individual',
          ].where((value) => value.isNotEmpty).join(' · '),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: scheme.onSurfaceVariant),
        ),
        trailing: const Icon(AppIcons.chevronRight),
        onTap: () => showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          builder: (_) => SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                bottom: MediaQuery.viewInsetsOf(context).bottom,
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                child: BlocProvider(
                  create: (_) => TournamentPublishCubit(
                    tournamentsRepository: tournamentsRepository,
                    tournamentId: tournamentId,
                    status: tournament.status,
                    visibility: tournament.visibility,
                  ),
                  child: _TournamentSettingsEditor(tournament: tournament),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

final class _TournamentSettingsEditor extends StatefulWidget {
  const _TournamentSettingsEditor({required this.tournament});
  final TournamentListItemDto tournament;

  @override
  State<_TournamentSettingsEditor> createState() =>
      _TournamentSettingsEditorState();
}

final class _TournamentSettingsEditorState
    extends State<_TournamentSettingsEditor> {
  late final TextEditingController _name;
  late final TextEditingController _price;
  late final TextEditingController _slots;
  DateTime? _startsAt;
  DateTime? _endsAt;
  DateTime? _registrationClosesAt;
  String? _gender;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.tournament.name);
    _price = TextEditingController(
      text: widget.tournament.inscriptionPrice?.toString() ?? '',
    );
    _slots = TextEditingController(
      text: widget.tournament.maxSlots?.toString() ?? '',
    );
    _startsAt = widget.tournament.startsAt;
    _endsAt = widget.tournament.endsAt;
    _registrationClosesAt = widget.tournament.registrationClosesAt;
    _gender = widget.tournament.gender;
  }

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    _slots.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final locked = widget.tournament.status != 'DRAFT';
    return BlocBuilder<TournamentPublishCubit, TournamentPublishState>(
      builder: (context, state) => Container(
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
                const Icon(AppIcons.sliders, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    tournamentFormatLabel(
                          widget.tournament.formatPresetName,
                        ).isEmpty
                        ? 'Formato no informado'
                        : tournamentFormatLabel(
                            widget.tournament.formatPresetName,
                          ),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                if (locked)
                  Text(
                    'Formato bloqueado',
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Deporte: ${widget.tournament.sportName} · Categoría: ${widget.tournament.categoryName}',
              style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12.5),
            ),
            const SizedBox(height: 4),
            Text(
              'Modalidad: ${widget.tournament.pairedRegistration ? 'Duplas fijas' : 'Individual'}',
              style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12.5),
            ),
            if (widget.tournament.formatParameters != null) ...[
              const SizedBox(height: 6),
              Text(
                'Configuración del formato: ${widget.tournament.formatParameters!.entries.map((entry) => '${entry.key}: ${entry.value}').join(' · ')}',
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontSize: 12.5,
                ),
              ),
            ],
            const SizedBox(height: 14),
            TextField(
              controller: _name,
              enabled: !state.submitting,
              decoration: const InputDecoration(labelText: 'Nombre'),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _price,
                    enabled: !state.submitting,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Precio'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _slots,
                    enabled: !state.submitting,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Cupo máximo'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              enabled: !state.submitting,
              title: const Text('Inicio'),
              subtitle: Text(
                _startsAt == null
                    ? 'Sin fecha'
                    : MaterialLocalizations.of(
                        context,
                      ).formatMediumDate(_startsAt!),
              ),
              trailing: const Icon(AppIcons.calendar),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 730)),
                  initialDate: _startsAt ?? DateTime.now(),
                );
                if (picked != null) setState(() => _startsAt = picked);
              },
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              enabled: !state.submitting,
              title: const Text('Fin'),
              subtitle: Text(
                _endsAt == null
                    ? 'Sin fecha'
                    : MaterialLocalizations.of(
                        context,
                      ).formatMediumDate(_endsAt!),
              ),
              trailing: const Icon(AppIcons.calendar),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  firstDate: _startsAt ?? DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 730)),
                  initialDate: _endsAt ?? _startsAt ?? DateTime.now(),
                );
                if (picked != null) setState(() => _endsAt = picked);
              },
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              enabled: !state.submitting,
              title: const Text('Cierre de inscripción'),
              subtitle: Text(
                _registrationClosesAt == null
                    ? 'Manual'
                    : MaterialLocalizations.of(
                        context,
                      ).formatMediumDate(_registrationClosesAt!),
              ),
              trailing: const Icon(AppIcons.calendarBusy),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 730)),
                  initialDate: _registrationClosesAt ?? DateTime.now(),
                );
                if (picked != null) {
                  setState(() => _registrationClosesAt = picked);
                }
              },
            ),
            const SizedBox(height: 4),
            Text('Género', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 6),
            SegmentedControl<String?>(
              value: _gender,
              options: const [
                SegmentedOption(value: null, label: 'Todos'),
                SegmentedOption(value: 'MALE', label: 'Masculino'),
                SegmentedOption(value: 'FEMALE', label: 'Femenino'),
                SegmentedOption(value: 'MIXED', label: 'Mixto'),
              ],
              onChanged: (value) => setState(() => _gender = value),
            ),
            if (widget.tournament.venueName != null) ...[
              const SizedBox(height: 6),
              Text(
                'Sede: ${widget.tournament.venueName}',
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontSize: 12.5,
                ),
              ),
            ],
            const SizedBox(height: 14),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton(
                onPressed: state.submitting
                    ? null
                    : () {
                        final settings = <String, Object?>{
                          'name': _name.text.trim(),
                          'inscriptionPrice': double.tryParse(_price.text),
                          'maxSlots': int.tryParse(_slots.text),
                          'startsAt': _startsAt?.toUtc().toIso8601String(),
                          'endsAt': _endsAt?.toUtc().toIso8601String(),
                          'registrationClosesAt': _registrationClosesAt
                              ?.toUtc()
                              .toIso8601String(),
                          'gender': _gender,
                        };
                        context.read<TournamentPublishCubit>().updateSettings(
                          settings,
                        );
                      },
                child: state.submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Guardar cambios'),
              ),
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

final class _OrganizerAvisos extends StatelessWidget {
  const _OrganizerAvisos();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<
      TournamentRegistrationsCubit,
      TournamentRegistrationsState
    >(
      builder: (context, registrationsState) {
        final registrations = switch (registrationsState) {
          TournamentRegistrationsLoaded(:final items) => items,
          _ => const <TournamentRegistrationDto>[],
        };
        final invitations = switch (registrationsState) {
          TournamentRegistrationsLoaded(:final invitations) => invitations,
          _ => const <TournamentInvitationDto>[],
        };
        final confirmedCount = registrations
            .where((registration) => registration.status == 'CONFIRMED')
            .length;
        final pendingInvitees = invitations
            .where((invitation) => invitation.isPending)
            .map(
              (invitation) => _shortInviteeName(invitation.invitedDisplayName),
            )
            .toList();

        return BlocBuilder<TournamentScheduleCubit, TournamentScheduleState>(
          builder: (context, scheduleState) {
            final sentSchedules = _sentScheduleCount(scheduleState);

            return Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: Theme.of(context).colorScheme.outlineVariant,
                  width: 1.5,
                ),
              ),
              child: Column(
                children: [
                  _OrganizerAvisosRow(
                    icon: AppIcons.check,
                    title: 'Confirmaste a $confirmedCount jugadores',
                    subtitle: 'Cada uno recibió su aviso al confirmarlo',
                  ),
                  _OrganizerAvisosRow(
                    icon: AppIcons.calendar,
                    title: 'Se enviaron $sentSchedules horarios',
                    subtitle: 'Los jugadores aceptan o piden cambio',
                  ),
                  _OrganizerAvisosRow(
                    icon: AppIcons.people,
                    title:
                        '${pendingInvitees.length} invitaciones sin responder',
                    subtitle: _joinInviteeNames(pendingInvitees),
                    showDivider: false,
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

final class _OrganizerAvisosRow extends StatelessWidget {
  const _OrganizerAvisosRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.showDivider = true,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: showDivider
          ? BoxDecoration(
              border: Border(bottom: BorderSide(color: scheme.outlineVariant)),
            )
          : null,
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: scheme.primary.withValues(alpha: .12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: scheme.primary, size: 17),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String _shortInviteeName(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  if (parts.length < 2) return name;
  return '${parts.first} ${parts.last[0]}.';
}

String _joinInviteeNames(List<String> names) => switch (names.length) {
  0 => '',
  1 => names.single,
  2 => '${names.first} y ${names.last}',
  _ => '${names.sublist(0, names.length - 1).join(', ')} y ${names.last}',
};

int _sentScheduleCount(TournamentScheduleState state) => switch (state) {
  TournamentScheduleSuccess(:final schedule) =>
    schedule.rounds
        .expand((round) => round.matches)
        .where((match) => match.scheduledAt != null)
        .length,
  _ => 0,
};
