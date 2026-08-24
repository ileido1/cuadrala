import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../features/catalog/data/catalog_repository.dart';
import '../../../features/venues/data/venues_repository.dart';
import '../../../router/routes.dart';
import '../data/tournaments_repository.dart';
import 'cubit/tournaments_list_cubit.dart';
import 'cubit/tournaments_list_state.dart';
import 'widgets/tournament_filters_bar.dart';
import 'widgets/tournament_list_item_tile.dart';

final class TournamentsHomeScreen extends StatelessWidget {
  const TournamentsHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => TournamentsListCubit(
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

final class _TournamentsHomeView extends StatelessWidget {
  const _TournamentsHomeView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('tournaments.home'),
      appBar: AppBar(
        title: const Text('Torneos'),
        actions: [
          IconButton(
            tooltip: 'Crear torneo',
            onPressed: () => context.push(Routes.createTournament),
            icon: const Icon(Icons.add_circle, size: 28),
            color: Theme.of(context).colorScheme.primary,
          ),
        ],
      ),
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
              return Column(
              children: [
                TournamentFiltersBar(
                  filters: state.filters,
                  onApply: (f) => cubit.applyFilters(f),
                  sports: cubit.sports,
                  categories: cubit.categories,
                  venues: cubit.venues,
                  onSportChanged: (sportId) =>
                      cubit.loadCategoriesForSport(sportId),
                ),
                Expanded(
                  child: state.items.isEmpty
                      ? _EmptyState(
                          hasFilters: state.filters.status != null ||
                              state.filters.startsAtFrom != null,
                        )
                      : NotificationListener<ScrollNotification>(
                          onNotification: (notification) {
                            if (notification is ScrollEndNotification &&
                                notification.metrics.pixels >=
                                    notification.metrics.maxScrollExtent -
                                        100) {
                              context
                                  .read<TournamentsListCubit>()
                                  .loadMore();
                            }
                            return false;
                          },
                          child: RefreshIndicator(
                            onRefresh: () =>
                                context.read<TournamentsListCubit>().load(),
                            child: ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                              itemCount: state.items.length +
                                  (state.isLoadingMore ? 1 : 0),
                              itemBuilder: (ctx, index) {
                                if (index == state.items.length) {
                                  return const Padding(
                                    padding: EdgeInsets.symmetric(vertical: 16),
                                    child: Center(
                                        child: CircularProgressIndicator()),
                                  );
                                }
                                return TournamentListItemTile(
                                  tournament: state.items[index],
                                );
                              },
                            ),
                          ),
                        ),
                ),
              ],
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}

final class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.hasFilters});

  final bool hasFilters;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.emoji_events_outlined,
                size: 40,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              hasFilters
                  ? 'No hay torneos con esos filtros'
                  : 'No hay torneos disponibles',
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              hasFilters
                  ? 'Probá cambiar los filtros para ver más resultados'
                  : 'Creá tu primer torneo para comenzar',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
              ),
              textAlign: TextAlign.center,
            ),
            if (hasFilters) ...[
              const SizedBox(height: 20),
              FilledButton.tonal(
                onPressed: () =>
                    context.read<TournamentsListCubit>().clearFilters(),
                child: const Text('Limpiar filtros'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}


