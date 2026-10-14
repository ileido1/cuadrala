import 'package:flutter/material.dart';

import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/brand_colors.dart';
import '../../../../core/theme/tournament_theme.dart';

enum TournamentTone { green, lime, warn, muted }

Color _tone(BuildContext context, TournamentTone tone) => switch (tone) {
  TournamentTone.green => TournamentTheme.of(context).green,
  TournamentTone.lime => Theme.of(context).colorScheme.tertiary,
  TournamentTone.warn => BrandColors.warningAmber,
  TournamentTone.muted => Theme.of(context).colorScheme.onSurfaceVariant,
};

class TournamentBanner extends StatelessWidget {
  const TournamentBanner({
    super.key,
    required this.icon,
    required this.title,
    this.body,
    this.action,
    this.onAction,
    this.tone = TournamentTone.green,
  });
  final IconData icon;
  final String title;
  final String? body;
  final String? action;
  final VoidCallback? onAction;
  final TournamentTone tone;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = _tone(context, tone);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Color.alphaBlend(color.withValues(alpha: .12), scheme.surface),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: .45), width: 1.5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              size: 19,
              color: tone == TournamentTone.lime
                  ? scheme.onTertiary
                  : scheme.onPrimary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (body != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      body!,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.4,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                if (action != null)
                  TextButton(
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      alignment: Alignment.centerLeft,
                      minimumSize: const Size(44, 44),
                      foregroundColor: tone == TournamentTone.lime
                          ? scheme.onSurface
                          : color,
                    ),
                    onPressed: onAction,
                    child: Text(
                      '$action →',
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class TournamentFactRow extends StatelessWidget {
  const TournamentFactRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.sub,
    this.ok = false,
  });
  final IconData icon;
  final String label;
  final String value;
  final String? sub;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = ok
        ? TournamentTheme.of(context).green
        : scheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: ok
                  ? color.withValues(alpha: .14)
                  : scheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: .3,
                    color: TournamentTheme.of(context).muted2,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (sub != null)
                  Text(
                    sub!,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
          ),
          if (ok) Icon(AppIcons.check, size: 17, color: color),
        ],
      ),
    );
  }
}

class TournamentCupoBar extends StatelessWidget {
  const TournamentCupoBar({
    super.key,
    required this.count,
    required this.capacity,
  });
  final int count;
  final int capacity;

  @override
  Widget build(BuildContext context) {
    final full = count >= capacity;
    return LinearProgressIndicator(
      value: capacity <= 0 ? 1 : (count / capacity).clamp(0, 1),
      minHeight: 5,
      borderRadius: BorderRadius.circular(999),
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
      color: full
          ? TournamentTheme.of(context).muted2
          : TournamentTheme.of(context).green,
    );
  }
}

class TournamentViewerBadge extends StatelessWidget {
  const TournamentViewerBadge({
    super.key,
    this.isOrganizer = false,
    this.invited = false,
    this.registrationStatus,
  });
  final bool isOrganizer;
  final bool invited;
  final String? registrationStatus;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (label, fg, bg) = isOrganizer
        ? ('Organizás', scheme.onTertiary, scheme.tertiary)
        : invited
        ? (
            'Invitación',
            scheme.onTertiary,
            Color.alphaBlend(
              scheme.tertiary.withValues(alpha: .7),
              scheme.surface,
            ),
          )
        : registrationStatus == 'PENDING'
        ? (
            'Pendiente',
            _tone(context, TournamentTone.warn),
            _tone(context, TournamentTone.warn).withValues(alpha: .14),
          )
        : registrationStatus == 'CONFIRMED'
        ? (
            'Confirmado',
            TournamentTheme.of(context).green,
            TournamentTheme.of(context).green.withValues(alpha: .15),
          )
        : ('', scheme.onSurface, scheme.surface);
    if (label.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: fg),
      ),
    );
  }
}

class TournamentFilterChip extends StatelessWidget {
  const TournamentFilterChip({
    super.key,
    required this.label,
    required this.onTap,
    this.active = false,
  });
  final String label;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final green = TournamentTheme.of(context).green;
    return Semantics(
      button: true,
      selected: active,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: SizedBox(
          height: 44,
          child: Center(
            widthFactor: 1,
            child: Container(
              height: 34,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: active ? green : scheme.surface,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: active ? green : scheme.outlineVariant,
                  width: 1.5,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: active ? scheme.onPrimary : scheme.onSurface,
                    ),
                  ),
                  if (!active) ...[
                    const SizedBox(width: 5),
                    Icon(
                      AppIcons.chevronDown,
                      size: 13,
                      color: TournamentTheme.of(context).muted2,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
