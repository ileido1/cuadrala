import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../../shared/widgets/app_header.dart';
import 'cubit/venue_detail_cubit.dart';
import 'cubit/venue_detail_state.dart';

final class VenueDetailScreen extends StatelessWidget {
  const VenueDetailScreen({super.key, required this.venueId, required this.venueName});

  final String venueId;
  final String venueName;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => VenueDetailCubit(
        repository: getIt(),
        venueId: venueId,
      )..load(),
      child: _VenueDetailView(venueId: venueId, venueName: venueName),
    );
  }
}

final class _VenueDetailView extends StatelessWidget {
  const _VenueDetailView({required this.venueId, required this.venueName});

  final String venueId;
  final String venueName;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('venue.detail'),
      body: BlocBuilder<VenueDetailCubit, VenueDetailState>(
        builder: (context, state) {
          if (state is VenueDetailLoading || state is VenueDetailInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is VenueDetailFailure) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(state.message, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => context.read<VenueDetailCubit>().load(),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            );
          }

          final loaded = state as VenueDetailLoaded;
          return CustomScrollView(
            slivers: [
              AppHeader(title: venueName),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    Text(
                      'Canchas',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 12),
                    if (loaded.courts.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(
                          'No hay canchas registradas en esta sede.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      )
                    else
                      ...loaded.courts.map(
                        (court) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: Theme.of(context).colorScheme.outlineVariant,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.sports_tennis,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    court.name,
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ]),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
