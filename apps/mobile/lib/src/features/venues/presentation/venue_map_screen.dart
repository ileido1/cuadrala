import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_marker_cluster/flutter_map_marker_cluster.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/storage/saved_zones_repository.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/error_state.dart';
import '../data/models/venue_dto.dart';
import 'cubit/venue_map_cubit.dart';
import 'cubit/venue_map_state.dart';

/// Full-screen map-based venue discovery screen (legacy / tests).
/// La ruta `/matches/create` usa [CreateMatchRouteScreen] + [showCreateMatchSheet].
class VenueMapScreen extends StatefulWidget {
  const VenueMapScreen({super.key});

  @override
  State<VenueMapScreen> createState() => _VenueMapScreenState();
}

class _VenueMapScreenState extends State<VenueMapScreen> {
  @override
  void initState() {
    super.initState();
    // Carga inicial de sedes cercanas al abrir la pestaña Descubrir.
    context.read<VenueMapCubit>().load();
  }

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
      body: ErrorState(message: error, onRetry: onRetry),
    );
  }
}

// ---------------------------------------------------------------------------
// Map view (loaded state)
// ---------------------------------------------------------------------------

class _MapView extends StatelessWidget {
  const _MapView({required this.state});

  final VenueMapState state;

  Future<void> _showZonesSheet(BuildContext context, VenueMapCubit cubit, List<SavedZone> zones) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => BlocProvider.value(
        value: cubit,
        child: _ZonesBottomSheet(zones: zones),
      ),
    );
  }

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
              MarkerClusterLayerWidget(
                options: MarkerClusterLayerOptions(
                  maxClusterRadius: 50,
                  size: const Size(40, 40),
                  markers: [
                    for (final venue in state.filtered)
                      Marker(
                        point: LatLng(venue.latitude!, venue.longitude!),
                        width: 40,
                        height: 40,
                        child: GestureDetector(
                          onTap: () => cubit.selectVenue(venue),
                          child: const Icon(
                            AppIcons.pin,
                            size: 36,
                            color: Colors.red,
                          ),
                        ),
                      ),
                  ],
                  builder: (context, markers) => Container(
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        '${markers.length}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            left: 16,
            right: 16,
            child: Column(
              children: [
                _SearchBar(onChanged: cubit.search),
                const SizedBox(height: 8),
                _SportFilterChips(
                  selected: state.sportType,
                  onSelect: (sportType) => cubit.load(sportType: sportType),
                ),
                const SizedBox(height: 8),
                _ZoneChips(
                  savedZones: state.savedZones,
                  selectedZone: state.selectedZone,
                  onSelect: (z) => cubit.selectZone(z),
                  onManage: () => _showZonesSheet(context, cubit, state.savedZones),
                ),
              ],
            ),
          ),
          Positioned(
            right: 16,
            bottom: (state.selectedVenue != null ? 160 : 24),
            child: FloatingActionButton.small(
              heroTag: 'gps-recenter',
              onPressed: cubit.recenterToCurrentLocation,
              child: const Icon(AppIcons.myLocation),
            ),
          ),
          if (state.selectedVenue != null)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: _VenueMiniSheet(
                venue: state.selectedVenue!,
                onClose: () => cubit.selectVenue(null),
                onViewDetails: () => context.push(
                  Routes.venueDetail(state.selectedVenue!.id),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sport filter chip bar (Todos / Pádel / Tenis)
// ---------------------------------------------------------------------------

class _SportFilterChips extends StatelessWidget {
  const _SportFilterChips({
    required this.selected,
    required this.onSelect,
  });

  final String? selected;
  final ValueChanged<String?> onSelect;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildChip(context, label: 'Todos', value: null),
          const SizedBox(width: 6),
          _buildChip(context, label: 'Pádel', value: 'PADEL'),
          const SizedBox(width: 6),
          _buildChip(context, label: 'Tenis', value: 'TENNIS'),
        ],
      ),
    );
  }

  Widget _buildChip(
    BuildContext context, {
    required String label,
    required String? value,
  }) {
    return FilterChip(
      label: Text(label),
      selected: selected == value,
      onSelected: (_) => onSelect(value),
    );
  }
}

// ---------------------------------------------------------------------------
// Zone chips bar
// ---------------------------------------------------------------------------

class _ZoneChips extends StatelessWidget {
  const _ZoneChips({
    required this.savedZones,
    required this.selectedZone,
    required this.onSelect,
    required this.onManage,
  });

  final List<SavedZone> savedZones;
  final SavedZone? selectedZone;
  final ValueChanged<SavedZone?> onSelect;
  final VoidCallback onManage;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          // Current location chip
          ActionChip(
            avatar: Icon(
              selectedZone == null ? Icons.my_location : Icons.check,
              size: 16,
              color: selectedZone == null ? scheme.primary : null,
            ),
            label: const Text('Mi ubicación'),
            onPressed: () => onSelect(null),
          ),
          const SizedBox(width: 6),
          // Saved zones chips
          for (final zone in savedZones)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: FilterChip(
                avatar: Icon(
                  selectedZone?.id == zone.id ? Icons.check : Icons.place,
                  size: 16,
                ),
                label: Text(zone.name),
                selected: selectedZone?.id == zone.id,
                onSelected: (_) => onSelect(
                  selectedZone?.id == zone.id ? null : zone,
                ),
              ),
            ),
          // Add zone button
          ActionChip(
            avatar: const Icon(Icons.add, size: 16),
            label: const Text('Zona'),
            onPressed: onManage,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Save zone dialog
// ---------------------------------------------------------------------------

class _SaveZoneDialog extends StatefulWidget {
  @override
  State<_SaveZoneDialog> createState() => _SaveZoneDialogState();
}

class _SaveZoneDialogState extends State<_SaveZoneDialog> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Guardar zona'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        decoration: const InputDecoration(
          labelText: 'Nombre de la zona',
          hintText: 'Ej: Casa, Trabajo',
        ),
        textCapitalization: TextCapitalization.words,
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, _controller.text.trim()),
          child: const Text('Guardar'),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Zones bottom sheet
// ---------------------------------------------------------------------------

class _ZonesBottomSheet extends StatelessWidget {
  const _ZonesBottomSheet({required this.zones});

  final List<SavedZone> zones;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Zonas guardadas',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (zones.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Column(
                    children: [
                      Icon(
                        Icons.place_outlined,
                        size: 40,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'No hay zonas guardadas',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Guardá tu ubicación para encontrar sedes más rápido',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              )
            else
              ...zones.map(
                (z) => ListTile(
                  leading: const Icon(Icons.place),
                  title: Text(z.name),
                  subtitle: Text('${z.radiusKm} km de radio'),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () {
                      context.read<VenueMapCubit>().deleteZone(z.id);
                      Navigator.pop(context);
                    },
                  ),
                  onTap: () {
                    context.read<VenueMapCubit>().selectZone(z);
                    Navigator.pop(context);
                  },
                ),
              ),
          ],
        ),
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
          prefixIcon: Icon(AppIcons.search),
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
    required this.onViewDetails,
  });

  final VenueDto venue;
  final VoidCallback onClose;
  final VoidCallback onViewDetails;

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
                    icon: const Icon(AppIcons.close),
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
              if (venue.sports.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    for (final sport in venue.sports)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Icon(
                          _sportIcon(sport),
                          size: 20,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                  ],
                ),
              ],
              if (venue.distanceKm != null || venue.averageRating != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (venue.distanceKm != null) ...[
                      Chip(
                        label: Text(
                          '${venue.distanceKm!.toStringAsFixed(1)} km',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        padding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                      ),
                      const SizedBox(width: 8),
                    ],
                    if (venue.averageRating != null) ...[
                      const Icon(AppIcons.star, size: 16, color: Colors.amber),
                      const SizedBox(width: 4),
                      Text(
                        venue.averageRating!.toStringAsFixed(1),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: onViewDetails,
                  child: const Text('Ver detalles'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

IconData _sportIcon(String sport) {
  switch (sport) {
    case 'TENNIS':
      return AppIcons.tennisBall;
    case 'PADEL':
    default:
      return AppIcons.racquetSport;
  }
}
