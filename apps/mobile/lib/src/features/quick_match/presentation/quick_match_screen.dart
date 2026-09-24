import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'cubit/quick_match_cubit.dart';
import 'cubit/quick_match_state.dart';
import '../data/models/quick_match_search_dto.dart';
import '../../matches/data/matches_repository.dart';
import '../../matches/data/models/match_detail_dto.dart';
import '../../../core/di/service_locator.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/date_strip.dart';
import '../../../shared/widgets/segmented_control.dart';

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
      toolbarHeight: 58,
      leading: IconButton(
        tooltip: 'Volver al inicio',
        onPressed: () => context.go(Routes.home),
        icon: const Icon(AppIcons.chevronDown),
      ),
      title: BlocBuilder<QuickMatchCubit, QuickMatchState>(
        builder: (context, state) {
          final search = state is QuickMatchActive ? state.search : null;
          final isProposal = search?.status == 'PROPOSAL';
          if (isProposal) return const Text('Propuesta para ti');
          if (search != null) {
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                const Text('Búsqueda activa'),
              ],
            );
          }
          return const Text('Encontrar partida');
        },
      ),
      actions: [
        BlocBuilder<QuickMatchCubit, QuickMatchState>(
          builder: (context, state) {
            if (state is! QuickMatchActive ||
                state.search.status != 'SEARCHING') {
              return const SizedBox(width: 48);
            }
            return TextButton(
              onPressed: () => _showScheduleSheet(context, state.search),
              child: const Text('Editar'),
            );
          },
        ),
      ],
    ),
    body: SafeArea(
      top: false,
      child: BlocBuilder<QuickMatchCubit, QuickMatchState>(
        builder: (context, state) => switch (state) {
          QuickMatchInitial() || QuickMatchLoading() => const Center(
            child: CircularProgressIndicator(),
          ),
          QuickMatchFailure(:final message) => _Failure(message: message),
          QuickMatchIdle() => _IdleQuickMatch(
            onOpenConfiguration: _showInitialConfiguration,
          ),
          QuickMatchActive(:final search)
              when search.status == 'PROPOSAL' &&
                  search.proposal?.status == 'PENDING' =>
            _Proposal(search: search),
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

  void _showScheduleSheet(BuildContext context, QuickMatchSearchDto search) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          _QuickMatchSheetFrame(child: _ScheduleSheet(search: search)),
    );
  }

  Future<void> _showInitialConfiguration() async {
    final started = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BlocProvider.value(
        value: context.read<QuickMatchCubit>(),
        child: const _QuickMatchConfigurationLoader(),
      ),
    );
    if (!mounted) return;
    if (started != true &&
        context.read<QuickMatchCubit>().state is QuickMatchIdle) {
      context.go(Routes.home);
    }
  }
}

final class _IdleQuickMatch extends StatefulWidget {
  const _IdleQuickMatch({required this.onOpenConfiguration});

  final Future<void> Function() onOpenConfiguration;

  @override
  State<_IdleQuickMatch> createState() => _IdleQuickMatchState();
}

class _IdleQuickMatchState extends State<_IdleQuickMatch> {
  var _opened = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _opened) return;
      _opened = true;
      widget.onOpenConfiguration();
    });
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

/// Opens the same Quick Match preferences flow from Home before entering the
/// full search-status screen. The temporary Cubit owns only the submission;
/// after a successful start the route creates a fresh Cubit and loads state.
Future<void> showQuickMatchConfigurationSheet(BuildContext context) async {
  final started = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => BlocProvider<QuickMatchCubit>(
      create: (_) => getIt<QuickMatchCubit>(),
      child: const _QuickMatchConfigurationLoader(),
    ),
  );

  if (started == true && context.mounted) {
    context.push(Routes.quickMatch);
  }
}

final class _QuickMatchConfigurationLoader extends StatelessWidget {
  const _QuickMatchConfigurationLoader();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: context.read<QuickMatchCubit>().defaultConfiguration(),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const _QuickMatchSheetFrame(
            child: Center(child: CircularProgressIndicator()),
          );
        }
        final configuration = snapshot.data;
        if (configuration == null) {
          return const _QuickMatchSheetFrame(
            child: _QuickMatchSetupError(
              message:
                  'Completá tu deporte y categoría para buscar una partida.',
            ),
          );
        }
        return _QuickMatchSetupSheet(config: configuration);
      },
    );
  }
}

final class _QuickMatchSetupError extends StatelessWidget {
  const _QuickMatchSetupError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(24),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(AppIcons.warning, color: Theme.of(context).colorScheme.error),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center),
      ],
    ),
  );
}

final class _QuickMatchSetupSheet extends StatelessWidget {
  const _QuickMatchSetupSheet({required this.config});

  final QuickMatchConfiguration config;

  @override
  Widget build(BuildContext context) =>
      _QuickMatchSheetFrame(child: _ConfigurationSheet(config: config));
}

final class _QuickMatchSheetFrame extends StatelessWidget {
  const _QuickMatchSheetFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return FractionallySizedBox(
      heightFactor: .93,
      alignment: Alignment.bottomCenter,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: scheme.surfaceContainerLow,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
        ),
        child: SafeArea(top: false, child: child),
      ),
    );
  }
}

final class _ConfigurationSheet extends StatefulWidget {
  const _ConfigurationSheet({required this.config});
  final QuickMatchConfiguration config;

  @override
  State<_ConfigurationSheet> createState() => _ConfigurationSheetState();
}

final class _ConfigurationSheetState extends State<_ConfigurationSheet> {
  final List<DateStripDay> _days = buildDateStripDays(14);
  String _day = 'TODAY';
  late String _customDate = _days[3].key;
  final Set<String> _slots = {'EVENING'};
  bool _widenLevel = false;
  bool _includeOpenMatches = true;
  int _zoneKm = 10;
  bool _submitting = false;
  String? _error;
  late QuickMatchSportOption _selectedSport = widget.config.sports.first;

  void _selectSport(String sportId) {
    final selected = widget.config.sports.firstWhere(
      (option) => option.sport.id == sportId,
    );
    setState(() => _selectedSport = selected);
  }

  List<SegmentedOption<String>> _sportOptions() => widget.config.sports
      .map(
        (option) =>
            SegmentedOption(value: option.sport.id, label: option.sport.name),
      )
      .toList();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        const SizedBox(height: 8),
        Container(
          width: 40,
          height: 5,
          decoration: BoxDecoration(
            color: scheme.outline,
            borderRadius: BorderRadius.circular(99),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 12, 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '¿Cuándo quieres jugar?',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.4,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Nosotros buscamos jugadores de tu nivel.',
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontSize: 13.5,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Cerrar',
                onPressed: _submitting ? null : () => Navigator.pop(context),
                icon: const Icon(AppIcons.close),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            children: [
              _SectionLabel(label: 'Deporte'),
              SegmentedControl<String>(
                value: _selectedSport.sport.id,
                onChanged: _selectSport,
                options: _sportOptions(),
              ),
              _SectionLabel(label: 'Día'),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _ChoicePill(
                    label: 'Hoy',
                    selected: _day == 'TODAY',
                    onTap: () => setState(() => _day = 'TODAY'),
                  ),
                  _ChoicePill(
                    label: 'Mañana',
                    selected: _day == 'TOMORROW',
                    onTap: () => setState(() => _day = 'TOMORROW'),
                  ),
                  _ChoicePill(
                    label: 'Elegir fecha',
                    icon: AppIcons.calendar,
                    selected: _day == 'CUSTOM',
                    onTap: () => setState(() => _day = 'CUSTOM'),
                  ),
                ],
              ),
              if (_day == 'CUSTOM') ...[
                const SizedBox(height: 14),
                DateStrip(
                  days: _days,
                  value: _customDate,
                  onChanged: (value) => setState(() => _customDate = value),
                  horizontalPadding: 0,
                ),
              ],
              _SectionLabel(label: 'Horario'),
              Row(
                children: [
                  _TimeSlot(
                    label: 'Mañana',
                    hours: '7–11 am',
                    icon: AppIcons.sun,
                    selected: _slots.contains('MORNING'),
                    onTap: () => _toggleSlot('MORNING'),
                  ),
                  const SizedBox(width: 8),
                  _TimeSlot(
                    label: 'Tarde',
                    hours: '12–5 pm',
                    icon: AppIcons.sunset,
                    selected: _slots.contains('AFTERNOON'),
                    onTap: () => _toggleSlot('AFTERNOON'),
                  ),
                  const SizedBox(width: 8),
                  _TimeSlot(
                    label: 'Noche',
                    hours: '6–10 pm',
                    icon: AppIcons.moon,
                    selected: _slots.contains('EVENING'),
                    onTap: () => _toggleSlot('EVENING'),
                  ),
                ],
              ),
              const SizedBox(height: 7),
              Text(
                'Sugerido según tu disponibilidad guardada. Puedes marcar más de uno.',
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
              ),
              _SectionLabel(label: 'Nivel'),
              _PreferenceCard(
                child: Row(
                  children: [
                    _LevelTag(label: _selectedSport.categories.first.name),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _widenLevel ? 'Rango ampliado' : 'Tu categoría',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Incluye niveles cercanos para más opciones.',
                            style: TextStyle(
                              color: scheme.onSurfaceVariant,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch.adaptive(
                      value: _widenLevel,
                      onChanged: (value) => setState(() => _widenLevel = value),
                    ),
                  ],
                ),
              ),
              _SectionLabel(label: 'Zona'),
              Text(
                'Cerca de tu ubicación guardada',
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _ZoneChoice(label: '5 km', value: 5),
                  _ZoneChoice(label: '10 km', value: 10),
                  _ZoneChoice(label: 'Toda Caracas', value: 100),
                ],
              ),
              const SizedBox(height: 18),
              _PreferenceCard(
                child: Row(
                  children: [
                    Icon(AppIcons.people, color: scheme.primary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Sumarme a partidas ya armadas',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Si a una partida abierta le falta gente, te la proponemos primero.',
                            style: TextStyle(
                              color: scheme.onSurfaceVariant,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch.adaptive(
                      value: _includeOpenMatches,
                      onChanged: (value) =>
                          setState(() => _includeOpenMatches = value),
                    ),
                  ],
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: TextStyle(color: scheme.error, fontSize: 13),
                ),
              ],
            ],
          ),
        ),
        DecoratedBox(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: scheme.outlineVariant)),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: Column(
              children: [
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    key: const Key('quick-match.configure.submit'),
                    onPressed: _submitting ? null : _submit,
                    icon: _submitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(AppIcons.bolt, size: 18),
                    label: Text(
                      _submitting ? 'Buscando...' : 'Entrar a la cola',
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Sin cobro ni reserva hasta que confirmes.',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _toggleSlot(String slot) {
    setState(() {
      if (_slots.contains(slot)) {
        if (_slots.length > 1) _slots.remove(slot);
      } else {
        _slots.add(slot);
      }
    });
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    final cubit = context.read<QuickMatchCubit>();
    await cubit.start({
      'sportId': _selectedSport.sport.id,
      'categoryId': _selectedSport.categories.first.id,
      'day': _day,
      if (_day == 'CUSTOM') 'date': _customDate,
      'slots': _slots.toList(),
      'widenLevel': _widenLevel,
      'zoneKm': _zoneKm,
      'includeOpenMatches': _includeOpenMatches,
    });
    if (!mounted) return;
    final state = cubit.state;
    if (state is QuickMatchActive) {
      Navigator.pop(context, true);
      return;
    }
    setState(() {
      _submitting = false;
      _error = state is QuickMatchFailure
          ? state.message
          : 'No pudimos iniciar la búsqueda.';
    });
  }

  Widget _ZoneChoice({required String label, required int value}) =>
      _ChoicePill(
        label: label,
        selected: _zoneKm == value,
        onTap: () => setState(() => _zoneKm = value),
      );
}

final class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 18, bottom: 9),
    child: Text(
      label,
      style: TextStyle(
        color: Theme.of(context).colorScheme.onSurfaceVariant,
        fontSize: 13,
        fontWeight: FontWeight.w700,
        letterSpacing: .3,
      ),
    ),
  );
}

final class _PreferenceCard extends StatelessWidget {
  const _PreferenceCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(
        color: Theme.of(context).colorScheme.outlineVariant,
        width: 1.5,
      ),
    ),
    child: child,
  );
}

final class _LevelTag extends StatelessWidget {
  const _LevelTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.tertiary,
      borderRadius: BorderRadius.circular(6),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      child: Text(
        label,
        style: TextStyle(
          color: Theme.of(context).colorScheme.onTertiary,
          fontSize: 12,
          fontWeight: FontWeight.w800,
        ),
      ),
    ),
  );
}

final class _ChoicePill extends StatelessWidget {
  const _ChoicePill({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: selected ? scheme.primaryContainer : scheme.surface,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          height: 38,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? scheme.primary : scheme.outlineVariant,
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 15,
                  color: selected ? scheme.primary : scheme.onSurfaceVariant,
                ),
                const SizedBox(width: 5),
              ],
              Text(
                label,
                style: TextStyle(
                  color: selected ? scheme.primary : scheme.onSurface,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _TimeSlot extends StatelessWidget {
  const _TimeSlot({
    required this.label,
    required this.hours,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String hours;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Expanded(
      child: Material(
        color: selected ? scheme.primaryContainer : scheme.surface,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            height: 104,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected ? scheme.primary : scheme.outlineVariant,
                width: 1.5,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  icon,
                  color: selected ? scheme.primary : scheme.onSurfaceVariant,
                ),
                const Spacer(),
                Text(
                  label,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 2),
                Text(
                  hours,
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

final class _Proposal extends StatelessWidget {
  const _Proposal({required this.search});

  final QuickMatchSearchDto search;

  @override
  Widget build(BuildContext context) {
    final proposal = search.proposal!;
    if (proposal.type == 'OPEN_MATCH') {
      return _OpenMatchProposal(search: search, proposal: proposal);
    }
    return _NewGroupProposal(proposal: proposal);
  }
}

final class _OpenMatchProposal extends StatelessWidget {
  const _OpenMatchProposal({required this.search, required this.proposal});

  final QuickMatchSearchDto search;
  final QuickMatchProposalDto proposal;

  @override
  Widget build(BuildContext context) {
    final matchId = proposal.matchId;
    final match = matchId != null && getIt.isRegistered<MatchesRepository>()
        ? getIt<MatchesRepository>().getMatchDetail(matchId)
        : Future<MatchDetailDto?>.value(null);

    return FutureBuilder<MatchDetailDto?>(
      future: match,
      builder: (context, snapshot) => _OpenMatchProposalLayout(
        search: search,
        proposal: proposal,
        match: snapshot.data,
      ),
    );
  }
}

final class _OpenMatchProposalLayout extends StatelessWidget {
  const _OpenMatchProposalLayout({
    required this.search,
    required this.proposal,
    required this.match,
  });

  final QuickMatchSearchDto search;
  final QuickMatchProposalDto proposal;
  final MatchDetailDto? match;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final title = match == null
        ? 'Una partida compatible está lista'
        : '${match!.clubName ?? 'Club'} · ${match!.courtName ?? 'Cancha'}';
    final location = match?.locationLabel;
    final date = match?.scheduledAt ?? search.targetDate;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
            children: [
              _ProposalEyebrow(),
              const SizedBox(height: 12),
              Text(
                '¡Partida encontrada!',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  letterSpacing: -.6,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Falta un jugador. ¿Te sumas?',
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 15),
              ),
              const SizedBox(height: 18),
              _OpenMatchCard(
                match: match,
                title: title,
                location: location,
                date: date,
              ),
              const SizedBox(height: 12),
              _ProposalHold(expiresAt: proposal.expiresAt),
              const SizedBox(height: 14),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(AppIcons.shield, color: scheme.primary, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Nada se cobra hasta que confirmes. Después pagas tu parte desde la partida.',
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontSize: 12.5,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        _ProposalFooter(
          onConfirm: () => context.read<QuickMatchCubit>().confirmProposal(),
          onContinue: () => context.read<QuickMatchCubit>().dismissProposal(),
        ),
      ],
    );
  }
}

final class _ProposalEyebrow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Align(
      alignment: Alignment.centerLeft,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: scheme.primary.withValues(alpha: .14),
          borderRadius: BorderRadius.circular(9),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(AppIcons.people, color: scheme.primary, size: 15),
              const SizedBox(width: 6),
              Text(
                'Partida abierta con cupo',
                style: TextStyle(
                  color: scheme.primary,
                  fontSize: 12,
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

final class _OpenMatchCard extends StatelessWidget {
  const _OpenMatchCard({
    required this.match,
    required this.title,
    required this.location,
    required this.date,
  });

  final MatchDetailDto? match;
  final String title;
  final String? location;
  final DateTime date;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final participants = match?.participants ?? const <MatchParticipantDto>[];
    final maxParticipants = match?.maxParticipants ?? 4;
    final openSpots = match?.openSpots ?? 1;
    final category = match?.categoryName ?? 'Tu categoría';

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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  _formatProposalDate(date),
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
              ),
              if (match != null)
                _ProposalPrice(
                  amountCents: match!.pricePerPlayerCents,
                  currency: match!.displayCurrency ?? match!.pricingCurrency,
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(AppIcons.pin, size: 15, color: scheme.onSurfaceVariant),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          if (location != null && location!.isNotEmpty) ...[
            const SizedBox(height: 2),
            Padding(
              padding: const EdgeInsets.only(left: 21),
              child: Text(
                location!,
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _ProposalTag(label: category, emphasized: true),
              _ProposalTag(
                label:
                    '$openSpots cupo${openSpots == 1 ? '' : 's'} disponible${openSpots == 1 ? '' : 's'}',
              ),
            ],
          ),
          const SizedBox(height: 12),
          Divider(color: scheme.outlineVariant, height: 1),
          const SizedBox(height: 14),
          _ParticipantRow(
            participants: participants,
            maxParticipants: maxParticipants,
          ),
          const SizedBox(height: 8),
          Text(
            participants.isEmpty
                ? 'Confirmá para ver a los demás jugadores.'
                : 'Solo falta completar el último cupo.',
            style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

final class _ProposalPrice extends StatelessWidget {
  const _ProposalPrice({required this.amountCents, required this.currency});

  final int amountCents;
  final String? currency;

  @override
  Widget build(BuildContext context) {
    final symbol = currency == 'USD' ? 'US\$' : (currency ?? '');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          '$symbol${(amountCents / 100).toStringAsFixed(2)} p/p',
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        Text(
          'Precio por jugador',
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

final class _ProposalTag extends StatelessWidget {
  const _ProposalTag({required this.label, this.emphasized = false});

  final String label;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: emphasized ? scheme.tertiary : scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Text(
          label,
          style: TextStyle(
            color: emphasized ? scheme.onTertiary : scheme.onSurfaceVariant,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

final class _ParticipantRow extends StatelessWidget {
  const _ParticipantRow({
    required this.participants,
    required this.maxParticipants,
  });

  final List<MatchParticipantDto> participants;
  final int maxParticipants;

  @override
  Widget build(BuildContext context) {
    final displayed = participants.take(maxParticipants).toList();
    final openCount = (maxParticipants - displayed.length).clamp(
      0,
      maxParticipants,
    );
    return Row(
      children: [
        ...displayed.map(
          (participant) => Padding(
            padding: const EdgeInsets.only(right: 10),
            child: _ParticipantAvatar(
              name: participant.displayName ?? 'Jugador',
            ),
          ),
        ),
        ...List<Widget>.generate(
          openCount,
          (_) => Padding(
            padding: const EdgeInsets.only(right: 10),
            child: _OpenParticipantAvatar(),
          ),
        ),
      ],
    );
  }
}

final class _ParticipantAvatar extends StatelessWidget {
  const _ParticipantAvatar({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final initials = name
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part[0].toUpperCase())
        .join();
    return SizedBox(
      width: 48,
      child: Column(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: Theme.of(context).colorScheme.primary,
            child: Text(
              initials,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            name.split(' ').first,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

final class _OpenParticipantAvatar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      width: 48,
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: scheme.primary, width: 2),
            ),
            child: Icon(AppIcons.add, color: scheme.primary, size: 20),
          ),
          const SizedBox(height: 4),
          Text(
            'Tu lugar',
            style: TextStyle(
              color: scheme.primary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

final class _ProposalHold extends StatelessWidget {
  const _ProposalHold({required this.expiresAt});

  final DateTime expiresAt;

  @override
  Widget build(BuildContext context) => StreamBuilder<int>(
    stream: Stream.periodic(const Duration(seconds: 1), (value) => value),
    builder: (context, _) {
      final seconds = expiresAt
          .difference(DateTime.now())
          .inSeconds
          .clamp(0, 120);
      final scheme = Theme.of(context).colorScheme;
      return Container(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Icon(AppIcons.clock, color: scheme.primary, size: 17),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Reservamos tu cupo por',
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ),
                Text(
                  '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')} min',
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: seconds / 120,
              minHeight: 3,
              borderRadius: BorderRadius.circular(99),
            ),
          ],
        ),
      );
    },
  );
}

final class _ProposalFooter extends StatelessWidget {
  const _ProposalFooter({required this.onConfirm, required this.onContinue});

  final VoidCallback onConfirm;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      border: Border(
        top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
      ),
    ),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
        child: Column(
          children: [
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onConfirm,
                icon: const Icon(AppIcons.check),
                label: const Text('Confirmar cupo'),
              ),
            ),
            TextButton(
              onPressed: onContinue,
              child: const Text('Seguir buscando'),
            ),
          ],
        ),
      ),
    ),
  );
}

final class _NewGroupProposal extends StatefulWidget {
  const _NewGroupProposal({required this.proposal});

  final QuickMatchProposalDto proposal;

  @override
  State<_NewGroupProposal> createState() => _NewGroupProposalState();
}

final class _NewGroupProposalState extends State<_NewGroupProposal> {
  int? _selectedOption;

  @override
  Widget build(BuildContext context) {
    final proposal = widget.proposal;
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
      children: [
        Text(
          '¡Encontramos jugadores!',
          style: Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 8),
        const Text(
          'Tres jugadores compatibles quieren jugar. Confirmá tu disponibilidad antes de que venza el hold.',
        ),
        const SizedBox(height: 20),
        _Countdown(expiresAt: proposal.expiresAt),
        if (proposal.venueOptions.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            'Elegí sede y horario',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          ...proposal.venueOptions.asMap().entries.map((entry) {
            final option = entry.value;
            final selected = _selectedOption == entry.key;
            return Card(
              child: ListTile(
                onTap: () => setState(() => _selectedOption = entry.key),
                leading: Icon(
                  selected ? AppIcons.checkCircle : AppIcons.pending,
                  color: selected ? scheme.primary : scheme.onSurfaceVariant,
                ),
                title: Text(option.venueName),
                subtitle: Text(
                  '${option.courtName} · ${_formatOptionDate(option.scheduledAt)}',
                ),
                trailing: Text(
                  'US\$ ${(option.pricePerPlayerCents / 100).toStringAsFixed(2)}',
                ),
              ),
            );
          }),
        ],
        const SizedBox(height: 20),
        FilledButton(
          onPressed: proposal.venueOptions.isNotEmpty && _selectedOption == null
              ? null
              : () => context.read<QuickMatchCubit>().confirmProposal(
                  option: _selectedOption == null
                      ? null
                      : proposal.venueOptions[_selectedOption!],
                ),
          child: const Text('Confirmar disponibilidad'),
        ),
        OutlinedButton(
          onPressed: () => context.read<QuickMatchCubit>().dismissProposal(),
          child: const Text('Seguir buscando'),
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

String _formatProposalDate(DateTime value) {
  final local = value.toLocal();
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final date = DateTime(local.year, local.month, local.day);
  final day = date == today
      ? 'Hoy'
      : date == today.add(const Duration(days: 1))
      ? 'Mañana'
      : '${local.day}/${local.month}';
  final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final suffix = local.hour >= 12 ? 'pm' : 'am';
  return '$day · $hour:${local.minute.toString().padLeft(2, '0')} $suffix';
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
  Widget build(BuildContext context) {
    final noMatch = search.noMatchYet;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 32, 20, 20),
            children: [
              _PulseIcon(icon: noMatch ? AppIcons.bell : AppIcons.search),
              const SizedBox(height: 22),
              Text(
                noMatch ? 'Seguimos buscando' : 'Buscando jugadores',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  letterSpacing: -.5,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                _searchSummary(search),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                _zoneSummary(search.zoneKm),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontSize: 12.5,
                ),
              ),
              const SizedBox(height: 22),
              _QueueProgressCard(search: search),
              const SizedBox(height: 14),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    AppIcons.bell,
                    size: 17,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Puedes cerrar la app. Te enviamos una notificación.',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 12.5,
                      ),
                    ),
                  ),
                ],
              ),
              if (noMatch) ...[
                const SizedBox(height: 20),
                _NoMatchActions(search: search),
              ],
            ],
          ),
        ),
        _QueueFooter(
          onEdit: () => _showScheduleSheet(context),
          onLeave: () => context.read<QuickMatchCubit>().cancel(),
        ),
      ],
    );
  }

  void _showScheduleSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          _QuickMatchSheetFrame(child: _ScheduleSheet(search: search)),
    );
  }
}

String _searchSummary(QuickMatchSearchDto search) {
  final date = search.targetDate.toLocal();
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final target = DateTime(date.year, date.month, date.day);
  final day = switch (target.difference(today).inDays) {
    0 => 'Hoy',
    1 => 'Mañana',
    _ => '${date.day}/${date.month}',
  };
  final slots = <String, String>{
    'MORNING': 'mañana',
    'AFTERNOON': 'tarde',
    'EVENING': 'noche',
  };
  final selected = search.slots
      .map((slot) => slots[slot] ?? slot.toLowerCase())
      .join(', ');
  return '$day · ${selected.isEmpty ? 'tu horario' : selected}';
}

String _zoneSummary(int zoneKm) =>
    zoneKm >= 100 ? 'En toda Caracas' : 'Hasta $zoneKm km de tu ubicación';

final class _QueueProgressCard extends StatelessWidget {
  const _QueueProgressCard({required this.search});

  final QuickMatchSearchDto search;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
    ),
    child: Column(
      children: [
        _QueueProgressStep(
          state: search.includeOpenMatches
              ? _QueueStepState.complete
              : _QueueStepState.pending,
          title: 'Revisando partidas abiertas',
          subtitle: search.includeOpenMatches
              ? 'Ninguna con cupo para ti en este momento'
              : 'Desactivado en tu búsqueda',
        ),
        _QueueProgressStep(
          state: _QueueStepState.active,
          title: 'Buscando jugadores cerca de ti',
          subtitle: 'Personas de tu nivel que también quieren jugar',
        ),
        const _QueueProgressStep(
          state: _QueueStepState.pending,
          title: 'Te avisaremos apenas haya una opción',
          subtitle: 'Tendrás 2 minutos para confirmar',
          isLast: true,
        ),
      ],
    ),
  );
}

enum _QueueStepState { complete, active, pending }

final class _QueueProgressStep extends StatelessWidget {
  const _QueueProgressStep({
    required this.state,
    required this.title,
    required this.subtitle,
    this.isLast = false,
  });

  final _QueueStepState state;
  final String title;
  final String subtitle;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = state == _QueueStepState.pending
        ? scheme.outline
        : scheme.primary;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 22,
            child: Column(
              children: [
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: state == _QueueStepState.complete
                        ? color
                        : Colors.transparent,
                    shape: BoxShape.circle,
                    border: Border.all(color: color, width: 2),
                  ),
                  child: state == _QueueStepState.complete
                      ? Icon(AppIcons.check, size: 14, color: scheme.onPrimary)
                      : state == _QueueStepState.active
                      ? Padding(
                          padding: const EdgeInsets.all(4),
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                            ),
                          ),
                        )
                      : null,
                ),
                if (!isLast)
                  Expanded(
                    child: Container(width: 2, color: scheme.outlineVariant),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

final class _QueueFooter extends StatelessWidget {
  const _QueueFooter({required this.onEdit, required this.onLeave});

  final VoidCallback onEdit;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      border: Border(
        top: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
      ),
    ),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
        child: Column(
          children: [
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onEdit,
                icon: const Icon(AppIcons.sliders),
                label: const Text('Editar preferencias'),
              ),
            ),
            TextButton(
              onPressed: onLeave,
              child: const Text('Salir de la cola'),
            ),
          ],
        ),
      ),
    ),
  );
}

final class _NoMatchActions extends StatelessWidget {
  const _NoMatchActions({required this.search});

  final QuickMatchSearchDto search;

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
    ),
    child: Column(
      children: [
        ListTile(
          leading: const Icon(AppIcons.clock),
          title: const Text('Cambiar horario'),
          subtitle: const Text('Suma la tarde o prueba mañana'),
          onTap: () => showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            useSafeArea: true,
            backgroundColor: Colors.transparent,
            builder: (_) =>
                _QuickMatchSheetFrame(child: _ScheduleSheet(search: search)),
          ),
        ),
        ListTile(
          leading: const Icon(AppIcons.pin),
          title: const Text('Ampliar zona'),
          subtitle: Text(
            search.zoneKm >= 100
                ? 'Ya buscas en toda Caracas'
                : 'Busca más lejos para encontrar antes',
          ),
          onTap: search.zoneKm >= 100
              ? null
              : () => context.read<QuickMatchCubit>().expandZone(),
        ),
        ListTile(
          leading: const Icon(AppIcons.list),
          title: const Text('Ver partidas abiertas'),
          subtitle: const Text('Elige tú una partida y únete'),
          onTap: () => context.go(Routes.discoverMatches),
        ),
      ],
    ),
  );
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
