import 'package:flutter/material.dart';

import '../../data/models/venue_dto.dart';

/// Tarjeta de venue para la lista de VenuesScreen.
/// Inyectar onTap via constructor — no usar getIt ni GoRouter internamente.
final class VenueCard extends StatelessWidget {
  const VenueCard({
    super.key,
    required this.venue,
    required this.onTap,
  });

  final VenueDto venue;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Card(
      clipBehavior: Clip.antiAlias,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _CoverImage(imageUrl: venue.imageUrl),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    venue.name,
                    style: textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (venue.address != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      venue.address!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      if (venue.distanceKm != null)
                        _Chip(
                          icon: Icons.near_me,
                          label: '${venue.distanceKm!.toStringAsFixed(1)} km',
                          color: scheme.primaryContainer,
                          onColor: scheme.onPrimaryContainer,
                        ),
                      ..._sportIcons(venue.sports, scheme),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _sportIcons(List<String> sports, ColorScheme scheme) {
    return sports.map((sport) {
      return _Chip(
        icon: _iconForSport(sport),
        label: sport,
        color: scheme.secondaryContainer,
        onColor: scheme.onSecondaryContainer,
      );
    }).toList();
  }

  IconData _iconForSport(String sport) {
    switch (sport.toUpperCase()) {
      case 'PADEL':
        return Icons.sports_tennis;
      case 'TENNIS':
        return Icons.sports_tennis;
      case 'FUTBOL':
      case 'FUTSAL':
        return Icons.sports_soccer;
      case 'BASQUET':
      case 'BASKETBALL':
        return Icons.sports_basketball;
      default:
        return Icons.sports;
    }
  }
}

final class _CoverImage extends StatelessWidget {
  const _CoverImage({required this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null) {
      return Container(
        height: 140,
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Center(
          child: Icon(
            Icons.location_on,
            size: 48,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      );
    }

    return Image.network(
      imageUrl!,
      height: 140,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => Container(
        height: 140,
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Center(
          child: Icon(
            Icons.location_on,
            size: 48,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

final class _Chip extends StatelessWidget {
  const _Chip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onColor,
  });

  final IconData icon;
  final String label;
  final Color color;
  final Color onColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: onColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: onColor, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
