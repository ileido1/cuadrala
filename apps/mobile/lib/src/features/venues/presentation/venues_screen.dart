import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/app_header.dart';
import 'cubit/venues_cubit.dart';
import 'cubit/venues_state.dart';

final class VenuesScreen extends StatelessWidget {
  const VenuesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<VenuesCubit>()..load(),
      child: const _VenuesView(),
    );
  }
}

final class _VenuesView extends StatelessWidget {
  const _VenuesView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('venues.list'),
      body: BlocBuilder<VenuesCubit, VenuesState>(
        builder: (context, state) {
          if (state is VenuesLoading || state is VenuesInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is VenuesFailure) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(state.message, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => context.read<VenuesCubit>().load(),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            );
          }

          final loaded = state as VenuesLoaded;
          if (loaded.venues.isEmpty) {
            return CustomScrollView(
              slivers: [
                const AppHeader(title: 'Sedes'),
                SliverFillRemaining(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        'No hay sedes disponibles.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          }

          return CustomScrollView(
            slivers: [
              const AppHeader(title: 'Sedes'),
              SliverPadding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final venue = loaded.venues[index];
                      return _VenueTile(
                        venue: venue,
                        onTap: () => context.push(Routes.venueDetail(venue.id)),
                      );
                    },
                    childCount: loaded.venues.length,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

final class _VenueTile extends StatelessWidget {
  const _VenueTile({required this.venue, required this.onTap});

  final dynamic venue;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Card(
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: scheme.primaryContainer,
            child: Icon(Icons.location_on, color: scheme.onPrimaryContainer),
          ),
          title: Text(
            venue.name,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          subtitle: venue.address != null
              ? Text(
                  venue.address!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                )
              : null,
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        ),
      ),
    );
  }
}
