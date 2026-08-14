import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/di/service_locator.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/brand_colors.dart';
import '../../core/venue/opening_hours.dart';
import '../../shared/widgets/surface_tag.dart';
import '../venues/data/models/court_dto.dart';
import '../venues/data/models/venue_dto.dart';
import '../venues/data/venues_repository.dart';
import 'venue_detail_cubit.dart';
import 'venue_detail_state.dart';

class VenueDetailScreen extends StatelessWidget {
  const VenueDetailScreen({super.key, required this.venueId});

  final String venueId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => VenueDetailCubit(
        venuesRepository: getIt<VenuesRepository>(),
        venueId: venueId,
      )..load(),
      child: _VenueDetailBody(venueId: venueId),
    );
  }
}

class _VenueDetailBody extends StatelessWidget {
  const _VenueDetailBody({required this.venueId});

  final String venueId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocBuilder<VenueDetailCubit, VenueDetailState>(
        builder: (context, state) {
          return switch (state) {
            VenueDetailInitial() => const SizedBox.shrink(),
            VenueDetailLoading() => const Center(child: CircularProgressIndicator()),
            VenueDetailEmpty() => _EmptyState(venueId: venueId),
            VenueDetailError(:final message) => _ErrorState(message: message),
            VenueDetailLoaded(:final venue, :final courts) => _Content(venue: venue, courts: courts),
          };
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.venueId});
  final String venueId;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(AppIcons.racquetSport, size: 48, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(height: 12),
          Text('Sede no encontrada', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          TextButton(onPressed: () => context.pop(), child: const Text('Volver')),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline, size: 48, color: Theme.of(context).colorScheme.error),
          const SizedBox(height: 12),
          Text(message, style: Theme.of(context).textTheme.bodyMedium, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          TextButton(onPressed: () => context.read<VenueDetailCubit>().load(), child: const Text('Reintentar')),
        ],
      ),
    );
  }
}

class _Content extends StatelessWidget {
  const _Content({required this.venue, required this.courts});

  final VenueDto venue;
  final List<CourtDto> courts;

  @override
  Widget build(BuildContext context) {
    final name = venue.name;
    final address = venue.address;
    final imageUrl = venue.imageUrl;
    final rating = venue.averageRating;
    final sports = venue.sports;
    final openingHours = venue.openingHours;
    final phone = venue.phone;
    final distanceKm = venue.distanceKm;

    return CustomScrollView(
      slivers: [
        // Header image
        SliverAppBar(
          expandedHeight: 200,
          pinned: true,
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
          flexibleSpace: FlexibleSpaceBar(
            background: imageUrl != null
                ? Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const _ImagePlaceholder())
                : const _ImagePlaceholder(),
          ),
        ),

        // Title block
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                if (address != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.place_outlined, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(address,
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                      ),
                      if (distanceKm != null)
                        Text('${distanceKm.toStringAsFixed(1)} km',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),

        // Sport chips + rating
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                for (final sport in sports) ...[_SportChip(sport: sport), const SizedBox(width: 8)],
                const Spacer(),
                if (rating != null) ...[
                  Icon(AppIcons.star, size: 18, color: BrandColors.limeAccent),
                  const SizedBox(width: 4),
                  Text(rating.toStringAsFixed(1),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                ],
              ],
            ),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 20)),

        // Opening hours
        if (openingHours != null) SliverToBoxAdapter(child: _OpeningHoursSection(openingHours: openingHours)),

        // Courts
        if (courts.isNotEmpty) SliverToBoxAdapter(child: _CourtsSection(courts: courts)),

        // Phone CTA
        if (phone != null && phone.isNotEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: OutlinedButton.icon(
                onPressed: () {
                  // TODO: launch phone dialer
                },
                icon: const Icon(AppIcons.phone),
                label: Text(phone),
              ),
            ),
          ),

        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }
}

class _ImagePlaceholder extends StatelessWidget {
  const _ImagePlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Center(
        child: Icon(AppIcons.racquetSport, size: 48,
            color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.5)),
      ),
    );
  }
}

class _SportChip extends StatelessWidget {
  const _SportChip({required this.sport});
  final String sport;

  @override
  Widget build(BuildContext context) {
    return SurfaceTag(label: sport == 'PADEL' ? 'Pádel' : 'Tenis');
  }
}

class _OpeningHoursSection extends StatelessWidget {
  const _OpeningHoursSection({required this.openingHours});
  final OpeningHoursMap openingHours;

  @override
  Widget build(BuildContext context) {
    const daysEs = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    final dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    final now = DateTime.now();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Horario', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...List.generate(7, (i) {
            final dayKey = dayKeys[i];
            final entry = openingHours[dayKey];
            final isToday = i == now.weekday - 1;
            final hours = entry != null ? '${entry.open} – ${entry.close}' : 'Cerrado';
            return Container(
              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
              decoration: BoxDecoration(
                color: isToday ? BrandColors.padelGreen.withValues(alpha: 0.1) : null,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  SizedBox(
                    width: 40,
                    child: Text(daysEs[i],
                        style: TextStyle(
                            fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                            color: isToday ? BrandColors.padelGreen : Theme.of(context).colorScheme.onSurface)),
                  ),
                  Expanded(
                    child: Text(hours,
                        style: TextStyle(
                            fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                            color: entry == null
                                ? Theme.of(context).colorScheme.onSurfaceVariant
                                : Theme.of(context).colorScheme.onSurface)),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _CourtsSection extends StatelessWidget {
  const _CourtsSection({required this.courts});
  final List<CourtDto> courts;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Canchas', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          for (final court in courts) _CourtTile(court: court),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _CourtTile extends StatelessWidget {
  const _CourtTile({required this.court});
  final CourtDto court;

  @override
  Widget build(BuildContext context) {
    final price = '\$${(court.pricePerHourCents / 100).toStringAsFixed(0)}/hr';
    final sportLabel = court.sportType == 'PADEL' ? 'Pádel' : 'Tenis';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(court.sportType == 'PADEL' ? AppIcons.racquetSport : AppIcons.tennisBall,
              size: 24, color: BrandColors.padelGreen),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(court.name,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Wrap(
                  spacing: 4,
                  children: [
                    SurfaceTag(label: sportLabel),
                    if (court.indoor) const SurfaceTag(label: 'Interior'),
                    if (court.lighting) const SurfaceTag(label: 'Iluminada'),
                  ],
                ),
              ],
            ),
          ),
          Text(price,
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold, color: BrandColors.padelGreen)),
        ],
      ),
    );
  }
}
