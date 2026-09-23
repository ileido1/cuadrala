import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'cubit/quick_match_cubit.dart';
import 'cubit/quick_match_state.dart';
import '../data/models/quick_match_search_dto.dart';
import '../../../router/routes.dart';

final class QuickMatchScreen extends StatefulWidget {
  const QuickMatchScreen({super.key});

  @override
  State<QuickMatchScreen> createState() => _QuickMatchScreenState();
}

final class _QuickMatchScreenState extends State<QuickMatchScreen> {
  @override
  void initState() {
    super.initState();
    context.read<QuickMatchCubit>().load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      leading: IconButton(
        tooltip: 'Volver',
        onPressed: () => context.go(Routes.home),
        icon: const Icon(Icons.arrow_back_rounded),
      ),
      title: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Encontrar partida'),
          Text('Matchmaking por horario y nivel'),
        ],
      ),
    ),
    body: SafeArea(
      child: BlocBuilder<QuickMatchCubit, QuickMatchState>(
        builder: (context, state) => switch (state) {
          QuickMatchInitial() || QuickMatchLoading() => const Center(
            child: CircularProgressIndicator(),
          ),
          QuickMatchFailure(:final message) => _Failure(message: message),
          QuickMatchIdle() => const _StartSearch(),
          QuickMatchActive(:final search)
              when search.status == 'PROPOSAL' &&
                  search.proposal?.status == 'PENDING' =>
            _Proposal(),
          QuickMatchActive(:final search) when search.status == 'CONFIRMED' =>
            _Confirmed(
              isNewGroup: search.proposal?.type == 'NEW_GROUP',
              matchId: search.proposal?.matchId,
            ),
          QuickMatchActive(:final search) when search.status == 'EXPIRED' =>
            const _Expired(),
          QuickMatchActive(:final search) => _Searching(search: search),
        },
      ),
    ),
  );
}

final class _StartSearch extends StatelessWidget {
  const _StartSearch();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return FutureBuilder(
      future: context.read<QuickMatchCubit>().defaultConfiguration(),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        final configuration = snapshot.data;
        if (configuration == null) {
          return const _Failure(
            message: 'Completá tu deporte y categoría para buscar una partida.',
          );
        }
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: scheme.primary,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: scheme.primary.withValues(alpha: .22),
                    blurRadius: 22,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.bolt_rounded, color: scheme.onPrimary, size: 34),
                  const SizedBox(height: 18),
                  Text(
                    'Jugá hoy sin armar grupo',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: scheme.onPrimary,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Buscamos primero partidas abiertas y después jugadores compatibles con tu horario.',
                    style: TextStyle(
                      color: scheme.onPrimary.withValues(alpha: .86),
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            _InfoRow(
              icon: Icons.sports_tennis_rounded,
              label: 'Deporte',
              value: configuration.sportName,
            ),
            _InfoRow(
              icon: Icons.bar_chart_rounded,
              label: 'Nivel',
              value: configuration.categoryName,
            ),
            const SizedBox(height: 10),
            FilledButton.icon(
              key: const Key('quick-match.start'),
              onPressed: () => _showConfiguration(context, configuration),
              icon: const Icon(Icons.search_rounded),
              label: const Text('Buscar partida'),
            ),
            const SizedBox(height: 12),
            Text(
              'No reservamos cancha ni cobramos nada hasta que confirmes una opción.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: scheme.onSurfaceVariant,
                fontSize: 12,
                height: 1.35,
              ),
            ),
          ],
        );
      },
    );
  }

  void _showConfiguration(
    BuildContext context,
    ({String sportId, String sportName, String categoryId, String categoryName})
    config,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => _ConfigurationSheet(config: config),
    );
  }
}

final class _ConfigurationSheet extends StatefulWidget {
  const _ConfigurationSheet({required this.config});
  final ({
    String sportId,
    String sportName,
    String categoryId,
    String categoryName,
  })
  config;

  @override
  State<_ConfigurationSheet> createState() => _ConfigurationSheetState();
}

final class _ConfigurationSheetState extends State<_ConfigurationSheet> {
  String _day = 'TODAY';
  final Set<String> _slots = {'EVENING'};
  bool _widenLevel = false;
  bool _includeOpenMatches = true;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      20,
      4,
      20,
      20 + MediaQuery.viewInsetsOf(context).bottom,
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Configurá tu búsqueda',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          '${widget.config.sportName} · ${widget.config.categoryName}',
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          '¿Cuándo querés jugar?',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: ['TODAY', 'TOMORROW']
              .map(
                (value) => ChoiceChip(
                  label: Text(value == 'TODAY' ? 'Hoy' : 'Mañana'),
                  selected: _day == value,
                  onSelected: (_) => setState(() => _day = value),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 18),
        const Text(
          'Franja horaria',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children:
              const [
                    ('MORNING', 'Mañana'),
                    ('AFTERNOON', 'Tarde'),
                    ('EVENING', 'Noche'),
                  ]
                  .map(
                    (entry) => FilterChip(
                      label: Text(entry.$2),
                      selected: _slots.contains(entry.$1),
                      onSelected: (selected) => setState(() {
                        if (selected) {
                          _slots.add(entry.$1);
                        } else if (_slots.length > 1) {
                          _slots.remove(entry.$1);
                        }
                      }),
                    ),
                  )
                  .toList(),
        ),
        const SizedBox(height: 12),
        SwitchListTile.adaptive(
          contentPadding: EdgeInsets.zero,
          title: const Text('Incluir partidas abiertas'),
          subtitle: const Text(
            'Las priorizamos antes de armar una nueva cola.',
          ),
          value: _includeOpenMatches,
          onChanged: (value) => setState(() => _includeOpenMatches = value),
        ),
        SwitchListTile.adaptive(
          contentPadding: EdgeInsets.zero,
          title: const Text('Ampliar nivel si hace falta'),
          value: _widenLevel,
          onChanged: (value) => setState(() => _widenLevel = value),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () {
            Navigator.pop(context);
            context.read<QuickMatchCubit>().start({
              'sportId': widget.config.sportId,
              'categoryId': widget.config.categoryId,
              'day': _day,
              'slots': _slots.toList(),
              'widenLevel': _widenLevel,
              'zoneKm': 10,
              'includeOpenMatches': _includeOpenMatches,
            });
          },
          child: const Text('Entrar a la cola'),
        ),
      ],
    ),
  );
}

final class _Proposal extends StatefulWidget {
  const _Proposal();

  @override
  State<_Proposal> createState() => _ProposalState();
}

final class _ProposalState extends State<_Proposal> {
  int? _selectedOption;

  @override
  Widget build(BuildContext context) {
    final proposal =
        (context.watch<QuickMatchCubit>().state as QuickMatchActive)
            .search
            .proposal!;
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: scheme.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.groups_rounded,
                color: scheme.onPrimaryContainer,
                size: 36,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              proposal.type == 'NEW_GROUP'
                  ? '¡Encontramos jugadores!'
                  : '¡Encontramos una partida!',
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(
              proposal.type == 'NEW_GROUP'
                  ? 'Tres jugadores compatibles quieren jugar. Confirmá tu disponibilidad antes de que venza el hold.'
                  : 'Hay un cupo disponible para vos. Confirmalo antes de que venza el hold.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            _Countdown(expiresAt: proposal.expiresAt),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: scheme.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: scheme.outlineVariant),
              ),
              child: Row(
                children: [
                  Icon(Icons.groups_rounded, color: scheme.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      proposal.type == 'NEW_GROUP'
                          ? 'Grupo compatible listo para confirmar'
                          : 'Hay un lugar disponible en una partida cercana',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
            if (proposal.type == 'NEW_GROUP' &&
                proposal.venueOptions.isNotEmpty) ...[
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Elegí sede y horario',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              ...proposal.venueOptions.asMap().entries.map((entry) {
                final option = entry.value;
                final selected = _selectedOption == entry.key;
                final price = (option.pricePerPlayerCents / 100)
                    .toStringAsFixed(2);
                return Card(
                  child: ListTile(
                    onTap: () => setState(() => _selectedOption = entry.key),
                    leading: Icon(
                      selected
                          ? Icons.radio_button_checked
                          : Icons.radio_button_off,
                      color: selected
                          ? scheme.primary
                          : scheme.onSurfaceVariant,
                    ),
                    title: Text(option.venueName),
                    subtitle: Text(
                      '${option.courtName} · ${_formatOptionDate(option.scheduledAt)}',
                    ),
                    trailing: Text('US\$ $price'),
                  ),
                );
              }),
            ] else if (proposal.type == 'NEW_GROUP') ...[
              const SizedBox(height: 16),
              Text(
                'Estamos buscando cancha cerca de vos. Te avisaremos antes de reservar.',
                textAlign: TextAlign.center,
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed:
                  proposal.type == 'NEW_GROUP' &&
                      proposal.venueOptions.isNotEmpty &&
                      _selectedOption == null
                  ? null
                  : () => context.read<QuickMatchCubit>().confirmProposal(
                      option: _selectedOption == null
                          ? null
                          : proposal.venueOptions[_selectedOption!],
                    ),
              child: Text(
                proposal.type == 'NEW_GROUP'
                    ? 'Confirmar disponibilidad'
                    : 'Confirmar partida',
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () =>
                  context.read<QuickMatchCubit>().dismissProposal(),
              child: const Text('Seguir buscando'),
            ),
            const SizedBox(height: 14),
            Text(
              proposal.type == 'NEW_GROUP'
                  ? 'La cancha y el pago se eligen solo cuando estén los cuatro.'
                  : 'Confirmar te une a la partida; el pago sigue el flujo habitual.',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
            ),
          ],
        ),
      ],
    );
  }
}

String _formatOptionDate(DateTime value) {
  final local = value.toLocal();
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}

final class _Countdown extends StatelessWidget {
  const _Countdown({required this.expiresAt});
  final DateTime expiresAt;
  @override
  Widget build(BuildContext context) => StreamBuilder<int>(
    stream: Stream.periodic(const Duration(seconds: 1), (value) => value),
    builder: (context, _) {
      final seconds = expiresAt
          .difference(DateTime.now())
          .inSeconds
          .clamp(0, 120);
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.errorContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          'Reservado por ${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}',
          style: TextStyle(
            color: Theme.of(context).colorScheme.onErrorContainer,
            fontWeight: FontWeight.w900,
          ),
        ),
      );
    },
  );
}

final class _Searching extends StatelessWidget {
  const _Searching({required this.search});
  final QuickMatchSearchDto search;
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
    children: [
      _PulseIcon(
        icon: search.noMatchYet
            ? Icons.notifications_none_rounded
            : Icons.search_rounded,
      ),
      const SizedBox(height: 18),
      Text(
        search.noMatchYet ? 'Seguimos buscando' : 'Buscando jugadores',
        textAlign: TextAlign.center,
        style: Theme.of(
          context,
        ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 8),
      Text(
        search.noMatchYet
            ? 'Todavía no encontramos una opción compatible. Te avisamos cuando aparezca.'
            : 'Estamos revisando partidas abiertas y jugadores con tu mismo horario.',
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 22),
      _StepCard(noMatchYet: search.noMatchYet),
      const SizedBox(height: 16),
      if (search.noMatchYet) ...[
        _ActionRow(
          icon: Icons.schedule_rounded,
          title: 'Cambiar horario',
          onTap: () => _showScheduleSheet(context),
        ),
        _ActionRow(
          icon: Icons.location_on_outlined,
          title: 'Ampliar zona (${search.zoneKm} km)',
          onTap: search.zoneKm >= 100
              ? null
              : () => context.read<QuickMatchCubit>().expandZone(),
        ),
        _ActionRow(
          icon: Icons.sports_tennis_rounded,
          title: 'Explorar partidas abiertas',
          onTap: () => context.go(Routes.discoverMatches),
        ),
      ],
      const SizedBox(height: 20),
      FilledButton(
        onPressed: () => context.go(Routes.home),
        child: const Text('Listo, avisame'),
      ),
      TextButton(
        onPressed: () => context.read<QuickMatchCubit>().cancel(),
        child: const Text('Salir de la cola'),
      ),
    ],
  );

  void _showScheduleSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) => _ScheduleSheet(search: search),
    );
  }
}

final class _ScheduleSheet extends StatefulWidget {
  const _ScheduleSheet({required this.search});
  final QuickMatchSearchDto search;
  @override
  State<_ScheduleSheet> createState() => _ScheduleSheetState();
}

final class _ScheduleSheetState extends State<_ScheduleSheet> {
  late String _day;
  late final Set<String> _slots;

  @override
  void initState() {
    super.initState();
    final date = widget.search.targetDate.toLocal();
    final now = DateTime.now();
    final target = DateTime(date.year, date.month, date.day);
    final today = DateTime(now.year, now.month, now.day);
    _day = target.difference(today).inDays == 1 ? 'TOMORROW' : 'TODAY';
    _slots = {...widget.search.slots};
    if (_slots.isEmpty) _slots.add('EVENING');
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Cambiar horario', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          children: ['TODAY', 'TOMORROW']
              .map(
                (day) => ChoiceChip(
                  label: Text(day == 'TODAY' ? 'Hoy' : 'Mañana'),
                  selected: _day == day,
                  onSelected: (_) => setState(() => _day = day),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children:
              const [
                    ('MORNING', 'Mañana'),
                    ('AFTERNOON', 'Tarde'),
                    ('EVENING', 'Noche'),
                  ]
                  .map(
                    (entry) => FilterChip(
                      label: Text(entry.$2),
                      selected: _slots.contains(entry.$1),
                      onSelected: (selected) => setState(() {
                        if (selected) {
                          _slots.add(entry.$1);
                        } else if (_slots.length > 1) {
                          _slots.remove(entry.$1);
                        }
                      }),
                    ),
                  )
                  .toList(),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: () {
            Navigator.pop(context);
            context.read<QuickMatchCubit>().changeSchedule(
              day: _day,
              slots: _slots.toList(),
            );
          },
          child: const Text('Actualizar búsqueda'),
        ),
      ],
    ),
  );
}

final class _Expired extends StatelessWidget {
  const _Expired();

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(20, 36, 20, 28),
    children: [
      _PulseIcon(icon: Icons.schedule_rounded),
      const SizedBox(height: 20),
      Text(
        'La propuesta expiró',
        textAlign: TextAlign.center,
        style: Theme.of(
          context,
        ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 10),
      const Text(
        'Pasaron los 2 minutos y el cupo se liberó. No se cobró nada.',
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 20),
      const _SurfaceMessage(
        text:
            'Tu búsqueda sigue activa y podés volver a intentarlo cuando quieras.',
      ),
      const SizedBox(height: 24),
      FilledButton(
        onPressed: () => context.read<QuickMatchCubit>().continueSearching(),
        child: const Text('Seguir buscando'),
      ),
      OutlinedButton(
        onPressed: () => context.read<QuickMatchCubit>().cancel(),
        child: const Text('Salir de la cola'),
      ),
    ],
  );
}

final class _PulseIcon extends StatelessWidget {
  const _PulseIcon({required this.icon});
  final IconData icon;
  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    return Center(
      child: Container(
        width: 116,
        height: 116,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: color.withValues(alpha: .28), width: 10),
          color: color.withValues(alpha: .12),
        ),
        child: Container(
          margin: const EdgeInsets.all(14),
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
          child: Icon(
            icon,
            color: Theme.of(context).colorScheme.onPrimary,
            size: 34,
          ),
        ),
      ),
    );
  }
}

final class _StepCard extends StatelessWidget {
  const _StepCard({required this.noMatchYet});
  final bool noMatchYet;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            noMatchYet ? 'Seguimos atentos' : 'Así funciona',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          const _Step(label: 'Revisamos partidas abiertas'),
          const _Step(label: 'Buscamos jugadores compatibles'),
          const _Step(label: 'Te avisamos cuando haya una opción'),
        ],
      ),
    ),
  );
}

final class _Step extends StatelessWidget {
  const _Step({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      children: [
        Icon(
          Icons.check_circle_rounded,
          color: Theme.of(context).colorScheme.primary,
          size: 18,
        ),
        const SizedBox(width: 10),
        Text(label),
      ],
    ),
  );
}

final class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.icon,
    required this.title,
    required this.onTap,
  });
  final IconData icon;
  final String title;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      leading: Icon(icon),
      title: Text(title),
      trailing: const Icon(Icons.chevron_right_rounded),
      onTap: onTap,
    ),
  );
}

final class _SurfaceMessage extends StatelessWidget {
  const _SurfaceMessage({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Text(text, textAlign: TextAlign.center),
    ),
  );
}

final class _Confirmed extends StatelessWidget {
  const _Confirmed({required this.isNewGroup, required this.matchId});
  final bool isNewGroup;
  final String? matchId;

  @override
  Widget build(BuildContext context) {
    final hasMatch = matchId != null && matchId!.isNotEmpty;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 42, 20, 28),
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Theme.of(
                      context,
                    ).colorScheme.primary.withValues(alpha: .35),
                    blurRadius: 26,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Icon(
                Icons.check_rounded,
                color: Theme.of(context).colorScheme.onPrimary,
                size: 44,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              isNewGroup ? '¡Participación confirmada!' : '¡Cupo confirmado!',
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(
              isNewGroup
                  ? hasMatch
                        ? 'La partida ya está lista. Consultá la sede y los próximos pasos.'
                        : 'Te avisamos cuando los cuatro confirmen y la cancha quede reservada.'
                  : 'Ya estás dentro. Consultá los detalles y pagá tu parte desde la partida.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 26),
            if (hasMatch)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  key: const Key('quick-match.open-match'),
                  onPressed: () => context.go(Routes.matchDetail(matchId!)),
                  icon: const Icon(Icons.sports_tennis_rounded),
                  label: const Text('Ver partida'),
                ),
              ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => context.go(Routes.home),
                child: const Text('Volver al inicio'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

final class _Failure extends StatelessWidget {
  const _Failure({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline_rounded, size: 48),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => context.read<QuickMatchCubit>().load(),
            child: const Text('Reintentar'),
          ),
        ],
      ),
    ),
  );
}

final class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });
  final IconData icon;
  final String label, value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      children: [
        Icon(icon, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 12),
        Text(label),
        const Spacer(),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
      ],
    ),
  );
}
