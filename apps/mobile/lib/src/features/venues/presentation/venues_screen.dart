import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../router/routes.dart';
import 'cubit/venues_cubit.dart';
import 'cubit/venues_state.dart';
import 'widgets/filter_sheet.dart';
import 'widgets/venue_card.dart';

final class VenuesScreen extends StatelessWidget {
  const VenuesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<VenuesCubit>()..loadWithGps(),
      child: const _VenuesView(),
    );
  }
}

final class _VenuesView extends StatefulWidget {
  const _VenuesView();

  @override
  State<_VenuesView> createState() => _VenuesViewState();
}

final class _VenuesViewState extends State<_VenuesView> {
  final _searchController = SearchController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showFilterSheet(BuildContext context, VenuesLoaded state) {
    final cubit = context.read<VenuesCubit>();
    final sports = {
      for (final v in state.allVenues) ...v.sports,
    }.toList()
      ..sort();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => VenueFilterSheet(
        availableSports: sports,
        selectedSport: state.selectedSport,
        indoorOnly: state.indoorOnly,
        onSportSelected: (sport) {
          cubit.setSport(sport);
          Navigator.of(context).pop();
        },
        onIndoorChanged: (v) {
          cubit.setIndoor(v);
          Navigator.of(context).pop();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<VenuesCubit, VenuesState>(
      builder: (context, state) {
        if (state is VenuesLoading || state is VenuesInitial) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (state is VenuesFailure) {
          return Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(state.message, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => context.read<VenuesCubit>().loadWithGps(),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        final loaded = state as VenuesLoaded;

        return Scaffold(
          key: const Key('venues.list'),
          body: CustomScrollView(
            slivers: [
              SliverAppBar(
                title: const Text('Sedes'),
                floating: true,
                snap: true,
                actions: [
                  IconButton(
                    icon: Badge(
                      isLabelVisible:
                          loaded.selectedSport != null || loaded.indoorOnly,
                      child: const Icon(Icons.filter_list),
                    ),
                    tooltip: 'Filtros',
                    onPressed: () => _showFilterSheet(context, loaded),
                  ),
                ],
                bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(60),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: SearchBar(
                      controller: _searchController,
                      hintText: 'Buscar sedes...',
                      leading: const Icon(Icons.search),
                      trailing: [
                        if (_searchController.text.isNotEmpty)
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () {
                              _searchController.clear();
                              context.read<VenuesCubit>().setSearch('');
                            },
                          ),
                      ],
                      onChanged: (q) => context.read<VenuesCubit>().setSearch(q),
                    ),
                  ),
                ),
              ),
              if (loaded.venues.isEmpty)
                SliverFillRemaining(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        'No hay sedes disponibles.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color:
                                  Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final venue = loaded.venues[index];
                        return VenueCard(
                          venue: venue,
                          onTap: () => context.push(Routes.venueDetail(venue.id)),
                        );
                      },
                      childCount: loaded.venues.length,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
