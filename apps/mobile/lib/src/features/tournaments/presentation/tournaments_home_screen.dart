import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../features/catalog/data/catalog_repository.dart';
import '../../../features/venues/data/venues_repository.dart';
import '../../../router/routes.dart';
import '../data/tournaments_repository.dart';
import '../data/models/tournament_list_item_dto.dart';
import 'cubit/tournaments_list_cubit.dart';
import 'cubit/tournaments_list_state.dart';
import 'widgets/tournament_filters_bar.dart';
import 'widgets/tournament_list_item_tile.dart';
import '../../../shared/widgets/segmented_control.dart';

final class TournamentsHomeScreen extends StatelessWidget {
  const TournamentsHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) =>
          TournamentsListCubit(
              tournamentsRepository: getIt<TournamentsRepository>(),
              catalogRepository: getIt<CatalogRepository>(),
              venuesRepository: getIt<VenuesRepository>(),
            )
            ..loadSportsAndCategories()
            ..loadVenues()
            ..load(),
      child: const _TournamentsHomeView(),
    );
  }
}

final class _TournamentsHomeView extends StatefulWidget {
  const _TournamentsHomeView();

  @override
  State<_TournamentsHomeView> createState() => _TournamentsHomeViewState();
}

final class _TournamentsHomeViewState extends State<_TournamentsHomeView> {
  var _section = 'Abiertos';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('tournaments.home'),
      body: BlocBuilder<TournamentsListCubit, TournamentsListState>(
        builder: (context, state) {
          if (state is TournamentsListLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is TournamentsListFailure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48),
                  const SizedBox(height: 16),
                  Text(state.message),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () =>
                        context.read<TournamentsListCubit>().load(),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          if (state is TournamentsListLoaded) {
            final cubit = context.read<TournamentsListCubit>();
            final items = _section == 'Abiertos'
                ? state.items.where((item) => item.status == 'OPEN').toList()
                : const <TournamentListItemDto>[];
            return SafeArea(
              child: Column(
                children: [
                  _TournamentsHeader(
                    onCreate: () => context.push(Routes.createTournament),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                    child: SegmentedControl<String>(
                      options: const [
                        SegmentedOption(value: 'Abiertos', label: 'Abiertos'),
                        SegmentedOption(
                          value: 'Mis torneos',
                          label: 'Mis torneos',
                        ),
                      ],
                      value: _section,
                      onChanged: (value) => setState(() => _section = value),
                    ),
                  ),
                  if (_section == 'Abiertos')
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                      child: Row(
                        children: [
                          _CategoryFilterChip(
                            label: 'Mi categoría',
                            selected: state.filters.categoryId != null,
                            onTap: () => _openFilters(context, cubit, state),
                          ),
                          const SizedBox(width: 8),
                          _CategoryFilterChip(
                            label: 'Cerca',
                            selected: false,
                            icon: Icons.place_outlined,
                            onTap: () {},
                          ),
                          const Spacer(),
                          IconButton(
                            tooltip: 'Más filtros',
                            onPressed: () =>
                                _openFilters(context, cubit, state),
                            icon: const Icon(Icons.tune),
                          ),
                        ],
                      ),
                    ),
                  Expanded(
                    child: items.isEmpty
                        ? _EmptyState(mine: _section == 'Mis torneos')
                        : NotificationListener<ScrollNotification>(
                            onNotification: (notification) {
                              if (notification is ScrollEndNotification &&
                                  notification.metrics.pixels >=
                                      notification.metrics.maxScrollExtent -
                                          100) {
                                context.read<TournamentsListCubit>().loadMore();
                              }
                              return false;
                            },
                            child: RefreshIndicator(
                              onRefresh: () =>
                                  context.read<TournamentsListCubit>().load(),
                              child: ListView.builder(
                                padding: const EdgeInsets.fromLTRB(
                                  16,
                                  8,
                                  16,
                                  24,
                                ),
                                itemCount:
                                    items.length +
                                    (state.isLoadingMore ? 1 : 0),
                                itemBuilder: (ctx, index) {
                                  if (index == items.length) {
                                    return const Padding(
                                      padding: EdgeInsets.symmetric(
                                        vertical: 16,
                                      ),
                                      child: Center(
                                        child: CircularProgressIndicator(),
                                      ),
                                    );
                                  }
                                  return TournamentListItemTile(
                                    tournament: items[index],
                                  );
                                },
                              ),
                            ),
                          ),
                  ),
                ],
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  Future<void> _openFilters(
    BuildContext context,
    TournamentsListCubit cubit,
    TournamentsListLoaded state,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: TournamentFiltersBar(
            filters: state.filters,
            onApply: (filters) {
              Navigator.pop(context);
              cubit.applyFilters(filters);
            },
            sports: cubit.sports,
            categories: cubit.categories,
            venues: cubit.venues,
            onSportChanged: cubit.loadCategoriesForSport,
          ),
        ),
      ),
    );
  }
}

final class _TournamentsHeader extends StatelessWidget {
  const _TournamentsHeader({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Torneos',
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(
                    fontSize: 27,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Nivel, precio, fecha y sede antes de anotarte',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 13.5,
                  ),
                ),
              ],
            ),
          ),
          FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Crear'),
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 42),
              padding: const EdgeInsets.symmetric(horizontal: 14),
            ),
          ),
        ],
      ),
    );
  }
}

final class _CategoryFilterChip extends StatelessWidget {
  const _CategoryFilterChip({
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
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon ?? (selected ? Icons.check : Icons.tune), size: 16),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 38),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        foregroundColor: selected ? scheme.primary : scheme.onSurfaceVariant,
        backgroundColor: selected
            ? scheme.primary.withValues(alpha: 0.12)
            : scheme.surfaceContainerHighest,
        side: BorderSide(
          color: selected ? scheme.primary : scheme.outlineVariant,
        ),
      ),
    );
  }
}

final class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.mine});

  final bool mine;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.emoji_events_outlined,
              size: 30,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 10),
            Text(
              mine
                  ? 'Todavía no te anotaste a ninguno'
                  : 'Nada abierto en tu categoría',
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              mine
                  ? 'Cuando te inscribas, va a aparecer acá.'
                  : 'Quitá el filtro para ver el resto.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant.withValues(
                  alpha: 0.7,
                ),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
