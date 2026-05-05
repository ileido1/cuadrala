import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../../router/routes.dart';
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
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Partidas abiertas',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _searchController,
                onChanged: (v) => context.read<OpenMatchesCubit>().setQuery(v),
                decoration: InputDecoration(
                  hintText: 'Buscar sedes…',
                  prefixIcon: const Icon(Icons.search),
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
              const SizedBox(height: 12),
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
                          'No hay partidas abiertas que coincidan.',
                          style: Theme.of(context).textTheme.bodyLarge,
                          textAlign: TextAlign.center,
                        ),
                      );
                    }

                    return RefreshIndicator(
                      onRefresh: () => context.read<OpenMatchesCubit>().load(),
                      child: ListView.separated(
                        controller: _scrollController,
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

    return Material(
      color: scheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Row(
            children: [
              Container(
                width: 64,
                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text(day, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                    const SizedBox(height: 4),
                    Text(
                      time,
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: scheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        'Cat. ${idPreview(match.categoryId)}',
                        style: TextStyle(
                          color: scheme.primary,
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    if (match.clubName != null || match.courtName != null)
                      Text(
                        [
                          if (match.clubName != null) match.clubName!,
                          if (match.courtName != null) match.courtName!,
                        ].join(' • '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      )
                    else
                    Text(
                      'Partida ${idPreview(match.id)}',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    if (match.locationLabel != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        match.locationLabel!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Text(
                      '\$ ${formatMoneyCents(match.pricePerPlayerCents)} p/p',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.primary,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  Text(
                    '${match.participantCount}/${match.maxParticipants}',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  const SizedBox(height: 6),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      minimumSize: const Size(0, 36),
                    ),
                    onPressed: onTap,
                    child: const Text('Unirse'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
