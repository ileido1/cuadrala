import 'package:flutter/material.dart';

import '../../core/theme/brand_colors.dart';
import 'avatar_stack.dart';
import 'dual_price.dart';

/// Tarjeta de partida del rediseño: bloque de fecha a la izquierda, badge de
/// categoría lime, título (club · pista), ubicación, y pie con pila de
/// avatares + cupos y precio dual.
///
/// Es **presentacional**: recibe etiquetas ya formateadas para no acoplarse a
/// los DTO de la feature de partidas.
class MatchCard extends StatelessWidget {
  const MatchCard({
    super.key,
    required this.dowLabel,
    required this.timeLabel,
    required this.subDateLabel,
    required this.title,
    required this.category,
    required this.participantInitials,
    required this.participantCount,
    required this.maxParticipants,
    this.surfaceTag,
    this.locationLabel,
    this.primaryPriceLabel,
    this.secondaryPriceLabel,
    this.priceSuffix = 'p/p',
    this.live = false,
    this.onTap,
    this.actionLabel,
    this.onAction,
  });

  /// Día de la semana o relativo (`HOY`, `MAÑANA`, `LUN`…).
  final String dowLabel;

  /// Hora principal (`17:00`).
  final String timeLabel;

  /// Fecha compacta debajo de la hora (`02 Jun`).
  final String subDateLabel;

  final String title;
  final String category;
  final List<String> participantInitials;
  final int participantCount;
  final int maxParticipants;
  final String? surfaceTag;
  final String? locationLabel;

  /// Precio principal ya formateado (p. ej. `US$8`). `null` lo oculta.
  final String? primaryPriceLabel;

  /// Precio secundario (p. ej. `Bs 320`). `null` lo oculta.
  final String? secondaryPriceLabel;
  final String priceSuffix;

  /// Resalta la tarjeta como partida en curso/inminente.
  final bool live;

  final VoidCallback? onTap;

  /// Texto de un CTA opcional (p. ej. `Unirse`). `null` lo oculta.
  final String? actionLabel;

  /// Acción del CTA. Solo se muestra si [actionLabel] y esto no son null.
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final openSpots =
        (maxParticipants - participantCount).clamp(0, maxParticipants);
    final filledSpots = participantCount.clamp(0, maxParticipants);

    return Material(
      color: scheme.surfaceContainer,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: live
                  ? scheme.tertiary.withValues(alpha: 0.55)
                  : scheme.outlineVariant,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 14,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _DateBlock(
                  dowLabel: dowLabel,
                  timeLabel: timeLabel,
                  subDateLabel: subDateLabel,
                  live: live,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          _CategoryBadge(label: category),
                          if (surfaceTag != null) ...[
                            const SizedBox(width: 6),
                            _SurfaceTag(label: surfaceTag!),
                          ],
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              fontSize: 14.5,
                            ),
                      ),
                      if (locationLabel != null) ...[
                        const SizedBox(height: 1),
                        Text(
                          locationLabel!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: scheme.onSurfaceVariant,
                                fontWeight: FontWeight.w500,
                                fontSize: 12.5,
                              ),
                        ),
                      ],
                      const SizedBox(height: 10),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          AvatarStack(
                            filledCount: filledSpots,
                            emptySpots: openSpots,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              openSpots == 0
                                  ? 'Completa'
                                  : '$openSpots ${openSpots == 1 ? 'cupo' : 'cupos'}',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: openSpots == 0
                                        ? scheme.onSurfaceVariant
                                        : scheme.primary,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12.5,
                                  ),
                            ),
                          ),
                          if (primaryPriceLabel != null)
                            DualPrice(
                              primaryLabel: primaryPriceLabel!,
                              secondaryLabel: secondaryPriceLabel,
                              suffix: priceSuffix,
                              primarySize: 15,
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (actionLabel != null && onAction != null) ...[
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: onAction,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 34),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(11),
                      ),
                    ),
                    child: Text(
                      actionLabel!,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 12.5,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DateBlock extends StatelessWidget {
  const _DateBlock({
    required this.dowLabel,
    required this.timeLabel,
    required this.subDateLabel,
    required this.live,
  });

  final String dowLabel;
  final String timeLabel;
  final String subDateLabel;
  final bool live;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final accent = live ? scheme.tertiary : scheme.primary;

    return Container(
      width: 58,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: live ? Border.all(color: accent.withValues(alpha: 0.55)) : null,
      ),
      child: Column(
        children: [
          Text(
            dowLabel,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 11,
              color: accent,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            timeLabel,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 18,
              color: scheme.onSurface,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 1),
          Text(
            subDateLabel,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 10.5,
              color: scheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryBadge extends StatelessWidget {
  const _CategoryBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: BrandColors.limeAccent,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: BrandColors.onLime,
          fontWeight: FontWeight.w800,
          fontSize: 11,
        ),
      ),
    );
  }
}

class _SurfaceTag extends StatelessWidget {
  const _SurfaceTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: scheme.onSurfaceVariant,
          fontWeight: FontWeight.w800,
          fontSize: 10.5,
        ),
      ),
    );
  }
}
