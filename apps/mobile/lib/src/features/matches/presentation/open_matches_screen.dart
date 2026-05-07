import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/app_header.dart';
import '../data/models/open_match_dto.dart';
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
                  const SizedBox(height: 12),
                  BlocBuilder<OpenMatchesCubit, OpenMatchesState>(
                    buildWhen: (prev, next) => next is OpenMatchesLoaded,
                    builder: (context, state) {
                      if (state is! OpenMatchesLoaded) return const SizedBox.shrink();
                      return SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _FilterChip(
                              label: 'Hoy',
                              selected: state.onlyToday,
                              onSelected: (_) => context.read<OpenMatchesCubit>().toggleOnlyToday(),
                            ),
                            const SizedBox(width: 8),
                            if (state.categoryId != null) ...[
                              _FilterChip(
                                label: 'Categoría',
                                selected: true,
                                onSelected: (_) => _showFiltersSheet(context),
                              ),
                              const SizedBox(width: 8),
                              ActionChip(
                                label: const Text('Limpiar filtros'),
                                onPressed: () => context.read<OpenMatchesCubit>().setCategoryId(null),
                              ),
                            ],
                          ],
                        ),
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
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
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

final class _OpenMatchListTile extends StatelessWidget {
  const _OpenMatchListTile({required this.match, required this.onTap});

  final OpenMatchDto match;
  final VoidCallback onTap;

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
                        '\$ ${formatMoneyCents(match.pricePerPlayerCents)}',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: scheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    [
                      if (match.clubName != null) match.clubName!,
                      if (match.courtName != null) match.courtName!,
                    ].isEmpty
                        ? 'Partida ${idPreview(match.id)}'
                        : [
                            if (match.clubName != null) match.clubName!,
                            if (match.courtName != null) match.courtName!,
                          ].join(' • '),
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
                    SizedBox(
                      width: 56,
                      height: 28,
                      child: Stack(
                        children: [
                          _TinyAvatar(x: 0, color: Colors.grey.shade300),
                          _TinyAvatar(x: 18, color: Colors.grey.shade400),
                        ],
                      ),
                    ),
                    const Spacer(),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 32),
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: onTap,
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

final class _TinyAvatar extends StatelessWidget {
  const _TinyAvatar({required this.x, required this.color});

  final double x;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Positioned(
      left: x,
      top: 0,
      bottom: 0,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: scheme.surface, width: 2),
        ),
      ),
    );
  }
}
