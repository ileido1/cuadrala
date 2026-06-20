import 'package:flutter/material.dart';

import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/brand_colors.dart';
import '../../../../shared/widgets/surface_tag.dart';

/// Tarjeta de sede del selector "Dónde" (rediseño Crear partida).
///
/// Presentacional: thumbnail + nombre + rating + subtítulo + tags + precio.
/// Seleccionada = borde verde + halo. El [price] lo provee el llamador
/// (normalmente un `DualPrice`).
class VenueCard extends StatelessWidget {
  const VenueCard({
    super.key,
    required this.name,
    this.imageUrl,
    this.rating,
    this.subtitle,
    this.tags = const [],
    this.price,
    this.selected = false,
    this.onTap,
  });

  final String name;
  final String? imageUrl;

  /// Valoración (p. ej. `4.8`). `null` la oculta.
  final double? rating;

  /// Línea secundaria, p. ej. `Las Mercedes · 1.2 km`.
  final String? subtitle;

  /// Etiquetas pequeñas, p. ej. `['Exterior', '3 canchas']`.
  final List<String> tags;

  /// Widget de precio (p. ej. `DualPrice`).
  final Widget? price;

  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: 1.5,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: BrandColors.padelGreen.withValues(alpha: 0.15),
                    spreadRadius: 3,
                    blurRadius: 0,
                  ),
                ]
              : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _Thumb(imageUrl: imageUrl),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: scheme.onSurface,
                          ),
                        ),
                      ),
                      if (rating != null) ...[
                        const SizedBox(width: 6),
                        Icon(AppIcons.star,
                            size: 14, color: BrandColors.limeAccent),
                        const SizedBox(width: 2),
                        Text(
                          rating!.toStringAsFixed(1),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: scheme.onSurface,
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                  if (tags.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [for (final t in tags) SurfaceTag(label: t)],
                    ),
                  ],
                ],
              ),
            ),
            if (price != null) ...[
              const SizedBox(width: 10),
              price!,
            ],
          ],
        ),
      ),
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({this.imageUrl});

  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final placeholder = Container(
      width: 64,
      height: 64,
      alignment: Alignment.center,
      color: scheme.surfaceContainerHighest,
      child: Icon(
        AppIcons.racquetSport,
        size: 26,
        color: scheme.onSurfaceVariant.withValues(alpha: 0.6),
      ),
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        width: 64,
        height: 64,
        child: imageUrl == null
            ? placeholder
            : Image.network(
                imageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => placeholder,
                loadingBuilder: (context, child, progress) =>
                    progress == null ? child : placeholder,
              ),
      ),
    );
  }
}

