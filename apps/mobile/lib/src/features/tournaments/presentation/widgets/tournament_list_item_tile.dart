import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/formatting/money_format.dart';
import '../../../../core/formatting/scheduled_label.dart';
import '../../../../core/models/currency_code.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/tournament_theme.dart';
import '../../../../router/routes.dart';
import '../../data/models/tournament_list_item_dto.dart';
import 'tournament_primitives.dart';
import 'tournament_status_pill.dart';

/// Compact tournament card driven only by the current list/viewer DTOs.
final class TournamentListItemTile extends StatelessWidget {
  const TournamentListItemTile({
    super.key,
    required this.tournament,
    this.detailExtra,
    this.pendingInvitationId,
    this.isOrganizer = false,
    this.onViewInvitation,
    this.onOrganizerTap,
    this.registrationStatus,
    this.pendingRegistrationsCount,
    this.matchesCategory = false,
  });
  final TournamentListItemDto tournament;
  final Object? detailExtra;
  final String? pendingInvitationId;
  final bool isOrganizer;
  final VoidCallback? onViewInvitation;
  final VoidCallback? onOrganizerTap;
  final String? registrationStatus;
  final int? pendingRegistrationsCount;
  final bool matchesCategory;

  @override
  Widget build(BuildContext context) {
    final t = tournament;
    final scheme = Theme.of(context).colorScheme;
    final muted2 = TournamentTheme.of(context).muted2;
    final gender = switch (t.gender) {
      'MALE' => 'Masculino',
      'FEMALE' => 'Femenino',
      'MIXED' => 'Mixto',
      _ => null,
    };
    Widget tag(String label, {bool highlighted = false}) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: highlighted ? scheme.tertiary : scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: highlighted ? scheme.onTertiary : scheme.onSurfaceVariant,
        ),
      ),
    );
    Widget meta(IconData icon, String text) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: muted2),
        const SizedBox(width: 5),
        Flexible(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: scheme.onSurfaceVariant,
            ),
          ),
        ),
      ],
    );
    final full = t.maxSlots != null && t.registrationCount >= t.maxSlots!;
    final price = t.inscriptionPrice;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: scheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: scheme.outlineVariant, width: 1.5),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push(
            Routes.tournamentDetail(t.id),
            extra: detailExtra ?? t,
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    TournamentStatusPill(status: t.status, small: true),
                    tag(t.categoryName, highlighted: matchesCategory),
                    if (gender != null) tag(gender),
                    TournamentViewerBadge(
                      isOrganizer: isOrganizer,
                      invited: pendingInvitationId != null,
                      registrationStatus: registrationStatus,
                    ),
                  ],
                ),
                const SizedBox(height: 9),
                Text(
                  t.name,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -.2,
                  ),
                ),
                const SizedBox(height: 7),
                Wrap(
                  spacing: 14,
                  runSpacing: 4,
                  children: [
                    meta(
                      AppIcons.calendar,
                      t.startsAt == null
                          ? 'Horario por definir'
                          : '${DateFormat('EEE d MMM', 'es_ES').format(t.startsAt!.toLocal()).toUpperCase()} · ${formatTimeHm(t.startsAt!.toLocal())}',
                    ),
                    meta(
                      AppIcons.pin,
                      '${t.venueName ?? 'Sede por definir'}${t.distanceKm == null ? '' : ' · ${t.distanceKm!.toStringAsFixed(1)} km'}',
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              Text(
                                t.maxSlots == null
                                    ? '${t.registrationCount} inscritos · sin tope'
                                    : '${t.registrationCount}/${t.maxSlots} inscritos',
                                key: const Key('tournament.card.slots'),
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                  color: full
                                      ? scheme.onSurfaceVariant
                                      : scheme.onSurface,
                                ),
                              ),
                              if (t.status == 'OPEN' &&
                                  t.registrationClosesAt != null)
                                Text(
                                  'cierra ${DateFormat('EEE d MMM', 'es_ES').format(t.registrationClosesAt!.toLocal()).toUpperCase()}',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w600,
                                    color: scheme.onSurfaceVariant,
                                  ),
                                ),
                            ],
                          ),
                          if (t.maxSlots != null) ...[
                            const SizedBox(height: 5),
                            TournamentCupoBar(
                              count: t.registrationCount,
                              capacity: t.maxSlots!,
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      price == null
                          ? 'Sin precio'
                          : price == 0
                          ? 'Gratis'
                          : formatMoneyFromMajor(price, CurrencyCode.usd)
                                .replaceFirst('US\$ ', 'US\$')
                                .replaceFirst(RegExp(r'\.00\$'), ''),
                      key: Key(
                        price == null
                            ? 'tournament.card.pricePlaceholder'
                            : 'tournament.card.price',
                      ),
                      style: TextStyle(
                        fontSize: price == null ? 12.5 : 16,
                        fontWeight: price == null
                            ? FontWeight.w700
                            : FontWeight.w800,
                        color: price == null
                            ? scheme.onSurfaceVariant
                            : scheme.onSurface,
                      ),
                    ),
                  ],
                ),
                if (isOrganizer && (pendingRegistrationsCount ?? 0) > 0) ...[
                  const SizedBox(height: 12),
                  Divider(height: 1, color: scheme.outlineVariant),
                  InkWell(
                    onTap: onOrganizerTap,
                    child: SizedBox(
                      height: 44,
                      child: Row(
                        children: [
                          Icon(
                            AppIcons.pending,
                            size: 14,
                            color: TournamentTheme.of(context).green,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '$pendingRegistrationsCount inscripciones por confirmar',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          Icon(AppIcons.chevronRight, size: 16, color: muted2),
                        ],
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
