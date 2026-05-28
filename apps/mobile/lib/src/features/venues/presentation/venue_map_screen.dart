import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../router/routes.dart';
import '../data/models/venue_dto.dart';
import 'cubit/venue_map_cubit.dart';
import 'cubit/venue_map_state.dart';

/// Full-screen map-based venue discovery screen.
/// This is the new target of [Routes.createMatch].
class VenueMapScreen extends StatelessWidget {
  const VenueMapScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<VenueMapCubit, VenueMapState>(
      builder: (context, state) {
        if (state.status == VenueMapStatus.loading) {
          return const _Loading();
        }
        if (state.status == VenueMapStatus.failure) {
          return _Failure(
            error: state.error ?? 'No pudimos cargar las sedes.',
            onRetry: context.read<VenueMapCubit>().load,
          );
        }
        return _MapView(state: state);
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}

// ---------------------------------------------------------------------------
// Failure state
// ---------------------------------------------------------------------------

class _Failure extends StatelessWidget {
  const _Failure({required this.error, required this.onRetry});

  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                error,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: onRetry,
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Map view (loaded state)
// ---------------------------------------------------------------------------

class _MapView extends StatelessWidget {
  const _MapView({required this.state});

  final VenueMapState state;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<VenueMapCubit>();
    final center = LatLng(
      state.userLat ?? -34.6037,
      state.userLng ?? -58.3816,
    );

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: center,
              initialZoom: 13,
              // ignore: avoid_types_as_parameter_names
              onTap: (_, _) => cubit.selectVenue(null),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.cuadrala.mobile',
              ),
              MarkerLayer(
                markers: [
                  for (final venue in state.filtered)
                    Marker(
                      point: LatLng(venue.latitude!, venue.longitude!),
                      width: 40,
                      height: 40,
                      child: GestureDetector(
                        onTap: () => cubit.selectVenue(venue),
                        child: const Icon(
                          Icons.location_pin,
                          size: 36,
                          color: Colors.red,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            left: 16,
            right: 16,
            child: _SearchBar(onChanged: cubit.search),
          ),
          if (state.selectedVenue != null)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: _VenueMiniSheet(
                venue: state.selectedVenue!,
                onClose: () => cubit.selectVenue(null),
                onReservar: () => context.push(
                  Routes.venueCreateMatch(state.selectedVenue!.id),
                  extra: state.selectedVenue,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Floating search bar
// ---------------------------------------------------------------------------

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.onChanged});

  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 4,
      borderRadius: BorderRadius.circular(12),
      child: TextField(
        onChanged: onChanged,
        decoration: const InputDecoration(
          hintText: 'Buscar club o dirección',
          prefixIcon: Icon(Icons.search),
          border: OutlineInputBorder(borderSide: BorderSide.none),
          filled: true,
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Venue mini sheet (shown when a marker is tapped)
// ---------------------------------------------------------------------------

class _VenueMiniSheet extends StatelessWidget {
  const _VenueMiniSheet({
    required this.venue,
    required this.onClose,
    required this.onReservar,
  });

  final VenueDto venue;
  final VoidCallback onClose;
  final VoidCallback onReservar;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      // Absorb taps so they don't propagate to the map onTap handler.
      behavior: HitTestBehavior.opaque,
      child: Material(
        elevation: 8,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      venue.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: onClose,
                  ),
                ],
              ),
              if (venue.address != null) ...[
                const SizedBox(height: 4),
                Text(
                  venue.address!,
                  style: Theme.of(context).textTheme.bodySmall,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              if (venue.distanceKm != null) ...[
                const SizedBox(height: 8),
                Chip(
                  label: Text(
                    '${venue.distanceKm!.toStringAsFixed(1)} km',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  padding: EdgeInsets.zero,
                  visualDensity: VisualDensity.compact,
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: onReservar,
                  child: const Text('Reservar'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
