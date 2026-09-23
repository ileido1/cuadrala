import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/fx_price_labels.dart';
import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_conversion.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/date_strip.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/match_card.dart';
import '../../../shared/widgets/selectable_chip.dart';
import '../data/matches_repository.dart';
import '../data/models/open_match_dto.dart';
import 'open_match_display.dart';
import 'cubit/discover_matches_cubit.dart';
import 'cubit/discover_matches_state.dart';

final class DiscoverMatchesScreen extends StatefulWidget {
  const DiscoverMatchesScreen({super.key});

  @override
  State<DiscoverMatchesScreen> createState() => _DiscoverMatchesScreenState();
}

class _DiscoverMatchesScreenState extends State<DiscoverMatchesScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  late final List<DateStripDay> _days;

  @override
  void initState() {
    super.initState();
    _days = buildDateStripDays(14);
    context.read<DiscoverMatchesCubit>().load();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    final position = _scrollController.position;
    if (!position.hasPixels) return;
    final remaining = position.maxScrollExtent - position.pixels;
    if (remaining < 240) {
      context.read<DiscoverMatchesCubit>().loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  String? _selectedDayKey(DiscoverMatchesLoaded loaded) {
    final selected = loaded.selectedDate;
    if (selected == null) return null;
    for (final day in _days) {
      if (day.date.year == selected.year &&
          day.date.month == selected.month &&
          day.date.day == selected.day) {
        return day.key;
      }
    }
    return _days.first.key;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _DiscoverHeader(onBack: () => context.pop()),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: TextField(
                controller: _searchController,
                onChanged: (v) =>
                    context.read<DiscoverMatchesCubit>().setQuery(v),
                decoration: InputDecoration(
                  hintText: 'Buscar club o dirección',
                  prefixIcon: const Icon(AppIcons.search),
                  filled: true,
                  fillColor: scheme.surfaceContainerHighest,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: Material(
                color: scheme.primaryContainer,
                borderRadius: BorderRadius.circular(14),
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => context.push(Routes.quickMatch),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Icon(
                          Icons.bolt_rounded,
                          color: scheme.onPrimaryContainer,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '¿No encontrás una opción?',
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  color: scheme.onPrimaryContainer,
                                ),
                              ),
                              Text(
                                'Entrá a la cola y te avisamos cuando haya una partida.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: scheme.onPrimaryContainer,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.chevron_right_rounded,
                          color: scheme.onPrimaryContainer,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            BlocBuilder<DiscoverMatchesCubit, DiscoverMatchesState>(
              buildWhen: (prev, next) => next is DiscoverMatchesLoaded,
              builder: (context, state) {
                if (state is! DiscoverMatchesLoaded) {
                  return const SizedBox.shrink();
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                      child: Text(
                        'Día',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    DateStrip(
                      days: _days,
                      value: _selectedDayKey(state),
                      onChanged: (key) {
                        final day = _days.firstWhere((d) => d.key == key);
                        context.read<DiscoverMatchesCubit>().selectDate(
                          day.date,
                        );
                      },
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: SelectableChip(
                          label: 'Cualquier día',
                          selected: state.selectedDate == null,
                          onTap: () => context
                              .read<DiscoverMatchesCubit>()
                              .selectDate(null),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Text(
                        'Horario',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: _TimePills(
                        active: state.activeTimeBuckets,
                        onToggle: (b) => context
                            .read<DiscoverMatchesCubit>()
                            .toggleTimeBucket(b),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Nivel',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 6),
                          _CategoryPills(items: state.items),
                          const SizedBox(height: 10),
                          Text(
                            'Género',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const _GenderPills(),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                      child: _AvailabilityToggle(
                        value: state.onlyAvailable,
                        onChanged: (v) => context
                            .read<DiscoverMatchesCubit>()
                            .setOnlyAvailable(v),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            '${state.visibleItems.length} '
                            '${state.visibleItems.length == 1 ? 'partida' : 'partidas'}',
                            style: const TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const Spacer(),
                          if (state.onlyAvailable)
                            Text(
                              'con cupos',
                              style: TextStyle(
                                fontSize: 13,
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
            Expanded(
              child: BlocBuilder<DiscoverMatchesCubit, DiscoverMatchesState>(
                builder: (context, state) {
                  if (state is DiscoverMatchesLoading ||
                      state is DiscoverMatchesInitial) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (state is DiscoverMatchesFailure) {
                    return ErrorState(
                      message: state.message,
                      onRetry: () =>
                          context.read<DiscoverMatchesCubit>().load(),
                    );
                  }

                  final loaded = state as DiscoverMatchesLoaded;
                  if (loaded.visibleItems.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Text(
                          'No hay partidas que coincidan.',
                          style: Theme.of(context).textTheme.bodyLarge,
                          textAlign: TextAlign.center,
                        ),
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: () =>
                        context.read<DiscoverMatchesCubit>().load(),
                    child: ListView.separated(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                      itemCount:
                          loaded.visibleItems.length +
                          (loaded.isLoadingMore ? 1 : 0),
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        if (index >= loaded.visibleItems.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(child: CircularProgressIndicator()),
                          );
                        }
                        final m = loaded.visibleItems[index];
                        final canJoin = m.openSpots > 0;
                        return _DiscoverMatchCard(
                          match: m,
                          exchangeRates: loaded.exchangeRates,
                          onTap: () => context.push(Routes.matchDetail(m.id)),
                          onJoin: canJoin
                              ? () => showModalBottomSheet<void>(
                                  context: context,
                                  isScrollControlled: true,
                                  useSafeArea: true,
                                  builder: (_) => _JoinConfirmSheet(
                                    match: m,
                                    matchesRepository:
                                        getIt<MatchesRepository>(),
                                  ),
                                )
                              : null,
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _DiscoverHeader extends StatelessWidget {
  const _DiscoverHeader({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 20, 12),
      child: Row(
        children: [
          IconButton(
            onPressed: onBack,
            icon: const Icon(AppIcons.arrowBack),
            style: IconButton.styleFrom(
              backgroundColor: scheme.surfaceContainerHighest,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Explorar partidas',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.4,
                    color: scheme.onSurface,
                  ),
                ),
                Text(
                  'Partidas abiertas con cupos',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
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

final class _DiscoverMatchCard extends StatelessWidget {
  const _DiscoverMatchCard({
    required this.match,
    required this.exchangeRates,
    required this.onTap,
    this.onJoin,
  });

  final OpenMatchDto match;
  final List<ExchangeRateRow> exchangeRates;
  final VoidCallback onTap;
  final VoidCallback? onJoin;

  @override
  Widget build(BuildContext context) {
    final scheduled = match.scheduledAt;
    final currency = openMatchDisplayCurrency(match);
    final dateIso = scheduled != null
        ? localCalendarDateIsoSV(scheduled)
        : localCalendarDateIsoSV(DateTime.now());

    return MatchCard(
      dowLabel: scheduled == null ? '—' : shortDateLabel(scheduled),
      timeLabel: scheduled == null ? '—' : formatTimeHm(scheduled),
      subDateLabel: scheduled == null ? '—' : compactCalendarDate(scheduled),
      title: openMatchTitleLine(match),
      category: match.categoryName ?? 'Cat. ${idPreview(match.categoryId)}',
      locationLabel: match.locationLabel,
      participantInitials: match.participantPreview
          .map((p) => _initialsFrom(p.displayName))
          .where((s) => s.isNotEmpty)
          .toList(),
      participantCount: match.participantCount,
      maxParticipants: match.maxParticipants,
      primaryPriceLabel: formatMoneyLabel(match.pricePerPlayerCents, currency),
      secondaryPriceLabel: secondaryBsLabelSV(
        primaryMinor: match.pricePerPlayerCents,
        primaryCurrency: currency,
        rates: exchangeRates,
        effectiveDateIso: dateIso,
      ),
      onTap: onTap,
      actionLabel: onJoin != null ? 'Unirse' : null,
      onAction: onJoin,
    );
  }
}

String _initialsFrom(String name) {
  final raw = name.trim();
  if (raw.isEmpty) return '';
  final parts = raw.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '';
  if (parts.length == 1) return parts.first[0].toUpperCase();
  return (parts.first[0] + parts.last[0]).toUpperCase();
}

final class _TimePills extends StatelessWidget {
  const _TimePills({required this.active, required this.onToggle});

  final Set<TimeBucket> active;
  final ValueChanged<TimeBucket> onToggle;

  @override
  Widget build(BuildContext context) {
    Widget pill(String label, TimeBucket bucket) {
      return SelectableChip(
        label: label,
        selected: active.contains(bucket),
        onTap: () => onToggle(bucket),
      );
    }

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        pill('Mañana', TimeBucket.morning),
        pill('Tarde', TimeBucket.afternoon),
        pill('Noche', TimeBucket.evening),
      ],
    );
  }
}

final class _CategoryPills extends StatelessWidget {
  const _CategoryPills({required this.items});

  final List<OpenMatchDto> items;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<DiscoverMatchesCubit>();
    final state = cubit.state;
    if (state is! DiscoverMatchesLoaded) return const SizedBox.shrink();

    final categories = <String, String>{};
    for (final item in items) {
      categories[item.categoryId] =
          item.categoryName ?? 'Cat. ${idPreview(item.categoryId)}';
    }
    if (categories.isEmpty) return const SizedBox.shrink();

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          SelectableChip(
            label: 'Todos',
            selected: state.categoryId == null,
            onTap: () => cubit.setCategoryId(null),
          ),
          for (final entry in categories.entries) ...[
            const SizedBox(width: 8),
            SelectableChip(
              label: entry.value,
              selected: state.categoryId == entry.key,
              onTap: () => cubit.setCategoryId(
                state.categoryId == entry.key ? null : entry.key,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _GenderPills extends StatelessWidget {
  const _GenderPills();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<DiscoverMatchesCubit>().state;
    if (state is! DiscoverMatchesLoaded) return const SizedBox.shrink();
    final cubit = context.read<DiscoverMatchesCubit>();
    final current = state.gender;

    Widget chip(String label, String value) => SelectableChip(
      label: label,
      selected: current == value,
      onTap: () => cubit.setGender(current == value ? null : value),
    );

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        chip('Masculino', 'MALE'),
        chip('Femenino', 'FEMALE'),
        chip('Mixto', 'MIXED'),
      ],
    );
  }
}

final class _AvailabilityToggle extends StatelessWidget {
  const _AvailabilityToggle({required this.value, required this.onChanged});

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          'Solo con cupos',
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const Spacer(),
        Switch(value: value, onChanged: onChanged),
      ],
    );
  }
}

final class _JoinConfirmSheet extends StatefulWidget {
  const _JoinConfirmSheet({
    required this.match,
    required this.matchesRepository,
  });

  final OpenMatchDto match;
  final MatchesRepository matchesRepository;

  @override
  State<_JoinConfirmSheet> createState() => _JoinConfirmSheetState();
}

class _JoinConfirmSheetState extends State<_JoinConfirmSheet> {
  bool _loading = false;
  String? _error;

  Future<void> _join() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.matchesRepository.joinMatch(widget.match.id);
      if (!mounted) return;
      Navigator.of(context).pop();
      context.push(Routes.matchDetail(widget.match.id));
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final match = widget.match;
    final scheduled = match.scheduledAt;

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: scheme.onSurfaceVariant.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            openMatchTitleLine(match),
            style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          if (scheduled != null)
            Text(
              '${shortDateLabel(scheduled)}, ${formatTimeHm(scheduled)}',
              style: textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(AppIcons.payments, size: 18, color: scheme.primary),
              const SizedBox(width: 6),
              Text(
                formatMoneyLabel(
                  match.pricePerPlayerCents,
                  openMatchDisplayCurrency(match),
                ),
                style: textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                ' por jugador',
                style: textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            SelectableText.rich(
              TextSpan(
                text: _error,
                style: TextStyle(color: scheme.error),
              ),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              OutlinedButton(
                onPressed: _loading ? null : () => Navigator.of(context).pop(),
                child: const Text('Cancelar'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _loading ? null : _join,
                  child: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text(
                          'Unirme',
                          style: TextStyle(fontWeight: FontWeight.w900),
                        ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
