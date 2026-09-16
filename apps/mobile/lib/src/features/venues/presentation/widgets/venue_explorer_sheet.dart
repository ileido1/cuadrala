import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/theme/app_icons.dart';
import '../../../../shared/widgets/segmented_control.dart';
import '../../data/models/venue_dto.dart';
import 'venue_card.dart';

enum _VenueExplorerView { list, map }

/// Selector de sedes con la experiencia de Crear partida: búsqueda, lista y mapa.
final class VenueExplorerSheet extends StatefulWidget {
  const VenueExplorerSheet({
    super.key,
    required this.venues,
    this.selectedVenueId,
  });

  final List<VenueDto> venues;
  final String? selectedVenueId;

  static Future<String?> show(
    BuildContext context, {
    required List<VenueDto> venues,
    String? selectedVenueId,
  }) => showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) =>
        VenueExplorerSheet(venues: venues, selectedVenueId: selectedVenueId),
  );

  @override
  State<VenueExplorerSheet> createState() => _VenueExplorerSheetState();
}

final class _VenueExplorerSheetState extends State<VenueExplorerSheet> {
  final _searchController = TextEditingController();
  _VenueExplorerView _view = _VenueExplorerView.list;
  String _query = '';

  List<VenueDto> get _filteredVenues {
    final normalized = _query.trim().toLowerCase();
    if (normalized.isEmpty) return widget.venues;
    return widget.venues.where((venue) {
      final haystack = '${venue.name} ${venue.address ?? ''}'.toLowerCase();
      return haystack.contains(normalized);
    }).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final height = math.min(MediaQuery.sizeOf(context).height * 0.82, 680.0);
    return SizedBox(
      height: height,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Dónde',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _searchController,
              onChanged: (value) => setState(() => _query = value),
              decoration: const InputDecoration(
                hintText: 'Buscar club o dirección',
                prefixIcon: Icon(AppIcons.search),
              ),
            ),
            const SizedBox(height: 12),
            SegmentedControl<_VenueExplorerView>(
              value: _view,
              onChanged: (value) => setState(() => _view = value),
              options: const [
                SegmentedOption(
                  value: _VenueExplorerView.list,
                  label: 'Lista',
                  icon: AppIcons.list,
                ),
                SegmentedOption(
                  value: _VenueExplorerView.map,
                  label: 'Mapa',
                  icon: AppIcons.map,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _view == _VenueExplorerView.map
                  ? _VenueMap(venues: _filteredVenues)
                  : _VenueList(
                      venues: _filteredVenues,
                      selectedVenueId: widget.selectedVenueId,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _VenueList extends StatelessWidget {
  const _VenueList({required this.venues, this.selectedVenueId});

  final List<VenueDto> venues;
  final String? selectedVenueId;

  @override
  Widget build(BuildContext context) {
    if (venues.isEmpty) {
      return const Center(child: Text('Sin resultados para esta búsqueda.'));
    }
    return ListView.separated(
      itemCount: venues.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (_, index) {
        final venue = venues[index];
        return VenueCard(
          name: venue.name,
          imageUrl: venue.imageUrl,
          rating: venue.averageRating,
          subtitle: venue.address,
          selected: venue.id == selectedVenueId,
          onTap: () => Navigator.of(context).pop(venue.id),
        );
      },
    );
  }
}

final class _VenueMap extends StatelessWidget {
  const _VenueMap({required this.venues});

  final List<VenueDto> venues;

  @override
  Widget build(BuildContext context) {
    final located = venues
        .where((venue) => venue.latitude != null && venue.longitude != null)
        .toList();
    final center = located.isEmpty
        ? const LatLng(-34.6037, -58.3816)
        : LatLng(located.first.latitude!, located.first.longitude!);

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: FlutterMap(
        options: MapOptions(initialCenter: center, initialZoom: 13),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.cuadrala.mobile',
          ),
          MarkerLayer(
            markers: [
              for (final venue in located)
                Marker(
                  point: LatLng(venue.latitude!, venue.longitude!),
                  width: 42,
                  height: 42,
                  child: Icon(
                    AppIcons.pin,
                    size: 36,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
