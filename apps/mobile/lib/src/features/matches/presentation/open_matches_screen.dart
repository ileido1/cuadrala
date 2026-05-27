import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/app_header.dart';
import '../data/matches_repository.dart';
import '../data/models/open_match_dto.dart';
import 'open_match_display.dart';
import 'cubit/open_matches_cubit.dart';
import 'cubit/open_matches_state.dart';

final class OpenMatchesScreen extends StatefulWidget {
  const OpenMatchesScreen({super.key});

  @override
  State<OpenMatchesScreen> createState() => _OpenMatchesScreenState();
}

class _OpenMatchesScreenState extends State<OpenMatchesScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    context.read<OpenMatchesCubit>().load();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    final position = _scrollController.position;
    if (!position.hasPixels) return;
    final remaining = position.maxScrollExtent - position.pixels;
    if (remaining < 240) {
      context.read<OpenMatchesCubit>().loadMore();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push(Routes.createMatch),
        backgroundColor: scheme.primary,
        foregroundColor: scheme.onPrimary,
        child: const Icon(Icons.add),
      ),
      body: SafeArea(
        child: Column(
          children: [
            const AppHeader(title: 'Partidas Abiertas', showBack: false),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              color: scheme.surface,
              child: Column(
                children: [
                  TextField(
                    controller: _searchController,
                    onChanged: (v) => context.read<OpenMatchesCubit>().setQuery(v),
                    decoration: InputDecoration(
                      hintText: 'Buscar sedes…',
                      prefixIcon: const Icon(Icons.search),
                      filled: true,
                      fillColor: scheme.surfaceContainerHighest,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                      suffixIcon: IconButton(
                        onPressed: () => _showFiltersSheet(context),
                        icon: const Icon(Icons.tune),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  BlocBuilder<OpenMatchesCubit, OpenMatchesState>(
                    buildWhen: (prev, next) => next is OpenMatchesLoaded,
                    builder: (context, state) {
                      if (state is! OpenMatchesLoaded) return const SizedBox.shrink();
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _DateStrip(
                            selectedDate: state.selectedDate,
                            onDateSelected: (d) =>
                                context.read<OpenMatchesCubit>().selectDate(d),
                          ),
                          const SizedBox(height: 8),
                          _TimePills(
                            active: state.activeTimeBuckets,
                            onToggle: (b) =>
                                context.read<OpenMatchesCubit>().toggleTimeBucket(b),
                          ),
                          const SizedBox(height: 8),
                          _AvailabilityToggle(
                            value: state.onlyAvailable,
                            onChanged: (v) =>
                                context.read<OpenMatchesCubit>().setOnlyAvailable(v),
                          ),
                          if (state.categoryId != null) ...[
                            const SizedBox(height: 8),
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: [
                                  _FilterChip(
                                    label: 'Categoría',
                                    selected: true,
                                    onSelected: (_) => _showFiltersSheet(context),
                                  ),
                                  const SizedBox(width: 8),
                                  ActionChip(
                                    label: const Text('Limpiar filtros'),
                                    onPressed: () =>
                                        context.read<OpenMatchesCubit>().setCategoryId(null),
                                  ),
                                ],
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
            Expanded(
              child: BlocBuilder<OpenMatchesCubit, OpenMatchesState>(
                builder: (context, state) {
                  if (state is OpenMatchesLoading || state is OpenMatchesInitial) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (state is OpenMatchesFailure) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(state.message, textAlign: TextAlign.center),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: () => context.read<OpenMatchesCubit>().load(),
                            child: const Text('Reintentar'),
                          ),
                        ],
                      ),
                    );
                  }

                  final loaded = state as OpenMatchesLoaded;
                  if (loaded.visibleItems.isEmpty) {
                    return Center(
                      child: Text(
                        'No hay partidas que coincidan.',
                        style: Theme.of(context).textTheme.bodyLarge,
                        textAlign: TextAlign.center,
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: () => context.read<OpenMatchesCubit>().load(),
                    child: ListView.separated(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                      itemCount: loaded.visibleItems.length + (loaded.isLoadingMore ? 1 : 0),
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        if (index >= loaded.visibleItems.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(child: CircularProgressIndicator()),
                          );
                        }
                        final m = loaded.visibleItems[index];
                        return _OpenMatchListTile(
                          match: m,
                          onTap: () => context.push(Routes.matchDetail(m.id)),
                          onJoin: m.openSpots > 0
                              ? () => showModalBottomSheet<void>(
                                    context: context,
                                    isScrollControlled: true,
                                    useSafeArea: true,
                                    builder: (_) => _JoinConfirmSheet(match: m),
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

  void _showFiltersSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Filtros',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Categoría (UUID)',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 8),
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'Pega categoryId…',
                  ),
                  onSubmitted: (v) {
                    final value = v.trim();
                    context.read<OpenMatchesCubit>().setCategoryId(
                          value.isEmpty ? null : value,
                        );
                    Navigator.of(context).pop();
                  },
                ),
                const SizedBox(height: 12),
                Text(
                  'MVP: selector de categorías por nombre llega en el siguiente slice (catálogo).',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// _DateStrip — horizontally scrollable strip of 7 day chips
// ---------------------------------------------------------------------------

final class _DateStrip extends StatelessWidget {
  const _DateStrip({
    required this.selectedDate,
    required this.onDateSelected,
  });

  final DateTime? selectedDate;
  final ValueChanged<DateTime> onDateSelected;

  static const _weekdayLabels = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  String _weekdayLabel(DateTime dt) => _weekdayLabels[dt.weekday - 1];

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final days = List.generate(
      7,
      (i) {
        final d = today.add(Duration(days: i));
        return DateTime(d.year, d.month, d.day);
      },
    );

    return SizedBox(
      height: 72,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: days.length,
        itemBuilder: (context, index) {
          final day = days[index];
          final isSelected = selectedDate != null &&
              selectedDate!.year == day.year &&
              selectedDate!.month == day.month &&
              selectedDate!.day == day.day;
          return _DayChip(
            weekdayLabel: _weekdayLabel(day),
            dayNumber: day.day,
            selected: isSelected,
            onTap: () => onDateSelected(day),
          );
        },
      ),
    );
  }
}

final class _DayChip extends StatelessWidget {
  const _DayChip({
    required this.weekdayLabel,
    required this.dayNumber,
    required this.selected,
    required this.onTap,
  });

  final String weekdayLabel;
  final int dayNumber;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    final bgColor = selected ? scheme.onSurface : Colors.transparent;
    final textColor = selected ? scheme.surface : scheme.onSurfaceVariant;

    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.only(right: 8),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              weekdayLabel,
              style: textTheme.labelSmall?.copyWith(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: bgColor,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                '$dayNumber',
                style: textTheme.bodyMedium?.copyWith(
                  color: textColor,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _TimePills — 3 FilterChip buttons for time-of-day buckets
// ---------------------------------------------------------------------------

final class _TimePills extends StatelessWidget {
  const _TimePills({
    required this.active,
    required this.onToggle,
  });

  final Set<TimeBucket> active;
  final ValueChanged<TimeBucket> onToggle;

  static const _labels = {
    TimeBucket.morning: 'Mañana',
    TimeBucket.afternoon: 'Tarde',
    TimeBucket.evening: 'Noche',
  };

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: TimeBucket.values.map((bucket) {
        final isSelected = active.contains(bucket);
        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: FilterChip(
            label: Text(_labels[bucket]!),
            selected: isSelected,
            onSelected: (_) => onToggle(bucket),
            selectedColor: scheme.primary.withValues(alpha: 0.15),
            checkmarkColor: scheme.primary,
          ),
        );
      }).toList(),
    );
  }
}

// ---------------------------------------------------------------------------
// _AvailabilityToggle — row with label and switch
// ---------------------------------------------------------------------------

final class _AvailabilityToggle extends StatelessWidget {
  const _AvailabilityToggle({
    required this.value,
    required this.onChanged,
  });

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          'Solo disponibles',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const Spacer(),
        Switch(
          value: value,
          onChanged: onChanged,
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// _FilterChip — reusable chip for category filters
// ---------------------------------------------------------------------------

final class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      selectedColor: scheme.primary.withValues(alpha: 0.15),
      checkmarkColor: scheme.primary,
    );
  }
}

// ---------------------------------------------------------------------------
// _OpenMatchListTile — match card
// ---------------------------------------------------------------------------

final class _OpenMatchListTile extends StatelessWidget {
  const _OpenMatchListTile({
    required this.match,
    required this.onTap,
    required this.onJoin,
  });

  final OpenMatchDto match;
  final VoidCallback onTap;
  final VoidCallback? onJoin;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final scheduled = match.scheduledAt;
    final day = scheduled == null ? '—' : shortDateLabel(scheduled);
    final time = scheduled == null ? '—' : formatTimeHm(scheduled);

    final isFull = match.openSpots <= 0;

    return Card(
      color: scheme.surface,
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Column(
          children: [
            if (match.venueImageUrl != null)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                child: Image.network(
                  match.venueImageUrl!,
                  width: double.infinity,
                  height: 120,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: scheme.tertiary.withValues(alpha: 0.20),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          match.categoryName ?? idPreview(match.categoryId),
                          style: TextStyle(
                            color: scheme.onTertiary,
                            fontWeight: FontWeight.w900,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (isFull)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: scheme.error.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'COMPLETO',
                            style: TextStyle(
                              color: scheme.error,
                              fontWeight: FontWeight.w900,
                              fontSize: 10,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ),
                      const Spacer(),
                      Text(
                        formatMoneyLabel(
                          match.pricePerPlayerCents,
                          openMatchDisplayCurrency(match),
                        ),
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: scheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    openMatchTitleLine(match),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(Icons.calendar_month, size: 18, color: scheme.onSurfaceVariant),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          '$day, $time',
                          style: TextStyle(
                            color: scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      Icon(
                        Icons.group_outlined,
                        size: 18,
                        color: isFull ? scheme.error : scheme.primary,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${match.participantCount}/${match.maxParticipants}',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: isFull ? scheme.error : scheme.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (!isFull)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest.withValues(alpha: 0.55),
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(18)),
                  border: Border(top: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.6))),
                ),
                child: Row(
                  children: [
                    _ParticipantAvatarRow(participants: match.participantPreview),
                    const Spacer(),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 32),
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: onJoin,
                      child: const Text(
                        'Unirse',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _ParticipantAvatarRow — up to 4 overlapping CircleAvatars with initials
// ---------------------------------------------------------------------------

final class _ParticipantAvatarRow extends StatelessWidget {
  const _ParticipantAvatarRow({required this.participants});

  final List<ParticipantPreviewDto> participants;

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2 && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0].isNotEmpty ? parts[0][0].toUpperCase() : '?';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    const avatarRadius = 12.0;
    const overlap = 16.0; // centre-to-centre distance

    if (participants.isEmpty) {
      return CircleAvatar(
        radius: avatarRadius,
        backgroundColor: Colors.grey.shade300,
        child: Icon(Icons.person, size: 14, color: scheme.onSurfaceVariant),
      );
    }

    final items = participants.take(4).toList();
    final totalWidth = avatarRadius * 2 + (items.length - 1) * overlap;

    return SizedBox(
      width: totalWidth,
      height: avatarRadius * 2,
      child: Stack(
        children: [
          for (int i = 0; i < items.length; i++)
            Positioned(
              left: i * overlap,
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: scheme.surface, width: 1.5),
                ),
                child: CircleAvatar(
                  radius: avatarRadius,
                  backgroundColor: scheme.primaryContainer,
                  child: Text(
                    _initials(items[i].displayName),
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: scheme.onPrimaryContainer,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _JoinConfirmSheet — confirmation bottom sheet before joining a match
// ---------------------------------------------------------------------------

final class _JoinConfirmSheet extends StatefulWidget {
  const _JoinConfirmSheet({required this.match});

  final OpenMatchDto match;

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
      await getIt<MatchesRepository>().joinMatch(widget.match.id);
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
          // Drag handle
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

          // Club + court name
          Text(
            openMatchTitleLine(match),
            style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),

          // Date/time
          if (scheduled != null)
            Text(
              '${shortDateLabel(scheduled)}, ${formatTimeHm(scheduled)}',
              style: textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
            ),
          const SizedBox(height: 12),

          // Price row
          Row(
            children: [
              Icon(Icons.payments_outlined, size: 18, color: scheme.primary),
              const SizedBox(width: 6),
              Text(
                formatMoneyLabel(match.pricePerPlayerCents, openMatchDisplayCurrency(match)),
                style: textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w900),
              ),
              Text(
                ' por jugador',
                style: textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Participant slots
          Text(
            'Jugadores',
            style: textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(match.maxParticipants, (i) {
              final isFilled = i < match.participantCount;
              return CircleAvatar(
                radius: 20,
                backgroundColor: isFilled
                    ? scheme.primary.withValues(alpha: 0.15)
                    : scheme.surfaceContainerHighest,
                child: isFilled
                    ? Text(
                        'P${i + 1}',
                        style: TextStyle(
                          color: scheme.primary,
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                        ),
                      )
                    : Icon(
                        Icons.person_add_outlined,
                        size: 18,
                        color: scheme.onSurfaceVariant.withValues(alpha: 0.5),
                      ),
              );
            }),
          ),
          const SizedBox(height: 16),

          // Error banner
          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: scheme.errorContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline, color: scheme.error, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _error!,
                      style: textTheme.bodySmall?.copyWith(color: scheme.onErrorContainer),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Action buttons
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
