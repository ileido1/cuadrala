import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/formatting/money_format.dart';
import '../../../../core/formatting/scheduled_label.dart';
import '../../../../core/models/currency_code.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/brand_colors.dart';
import '../../../../router/routes.dart';
import '../../../../shared/widgets/match_card.dart';
import '../../data/models/tournament_list_item_dto.dart';
import 'tournament_status_pill.dart';

String _occupancyLabel(int count, int? max) {
  if (max == null) {
    return count == 1 ? '$count inscrito' : '$count inscritos';
  }
  return '$count/$max inscritos';
}

/// `MALE`/`FEMALE`/`MIXED` (`MatchGender`, S2) → la etiqueta en español del
/// handoff (`cuadrala-torneos.jsx:7,10,13,16`), la misma que ya usan
/// `discover_matches_screen.dart` y `venue_booking_form.dart`. Un código
/// desconocido no se inventa: la etiqueta desaparece en vez de mostrar el
/// enum crudo (mismo criterio que `tournamentStatusLabel`).
String? _genderTagLabel(String gender) => switch (gender) {
  'MALE' => 'Masculino',
  'FEMALE' => 'Femenino',
  'MIXED' => 'Mixto',
  _ => null,
};

/// Tarjeta de torneo del listado (rediseño).
///
/// Responde la primera pregunta del jugador —¿puedo entrar?— sin abrir nada:
/// estado, categoría, cuándo, dónde, cuánta gente hay y cuánto sale. Los datos
/// que el organizador no declaró **no se inventan**: la fila desaparece en vez
/// de mostrarse vacía o con un placeholder.
final class TournamentListItemTile extends StatelessWidget {
  const TournamentListItemTile({
    super.key,
    required this.tournament,
    this.detailExtra,
    this.pendingInvitationId,
    this.isOrganizer = false,
    this.onViewInvitation,
    this.onOrganizerTap,
  });

  final TournamentListItemDto tournament;

  /// Extra completo que se conserva al abrir el detalle desde un listado con
  /// contexto adicional, como `ViewerTournamentDto` en "Mis torneos".
  final Object? detailExtra;

  /// Id de la invitación PENDING del visor a este torneo (`ViewerTournamentDto
  /// .pendingInvitationId`, M4a); `null` cuando no hay ninguna. Dispara el
  /// banner "{org} te invitó" (spec "Listado — invitation banner and
  /// organizer row").
  final String? pendingInvitationId;

  /// `true` cuando el visor organiza este torneo (`ViewerTournamentDto
  /// .isOrganizer`, M4a). Dispara la fila lime "Organizás {torneo}".
  final bool isOrganizer;

  /// Toque en "Ver invitación →". `null` deja el link sin acción (la
  /// navegación se resuelve en la pantalla que arma la tarjeta).
  final VoidCallback? onViewInvitation;

  /// Toque en la fila de organizador. `null` la deja sin acción.
  final VoidCallback? onOrganizerTap;

  /// `{org}`: `venueName`, cayendo al nombre del organizador sin sede
  /// declarada (D7). Nunca el nombre del propio torneo.
  String? get _invitationOrg =>
      tournament.venueName ?? tournament.organizerName;

  @override
  Widget build(BuildContext context) {
    final scheduled = tournament.startsAt;
    final price = tournament.inscriptionPrice;
    final gender = _genderTagLabel(tournament.gender ?? '');
    final card = MatchCard(
      dowLabel: scheduled == null ? '—' : shortDateLabel(scheduled),
      timeLabel: scheduled == null ? '—' : formatTimeHm(scheduled),
      subDateLabel: scheduled == null ? '—' : compactCalendarDate(scheduled),
      title: tournament.name,
      category: tournament.categoryName,
      surfaceTag: gender,
      leadingBadge: TournamentStatusPill(status: tournament.status),
      locationLabel: tournament.venueName == null
          ? 'Sede por confirmar'
          : tournament.distanceKm == null
          ? tournament.venueName
          : '${tournament.venueName} · ${tournament.distanceKm!.toStringAsFixed(1)} km',
      participantInitials: const [],
      participantCount: tournament.registrationCount,
      maxParticipants: tournament.maxSlots,
      avatarDisplayLimit: 4,
      participantSummaryLabel: _occupancyLabel(
        tournament.registrationCount,
        tournament.maxSlots,
      ),
      participantTrailingLabel: tournament.registrationClosesAt == null
          ? null
          : 'cierra ${DateFormat('EEE', 'es_ES').format(tournament.registrationClosesAt!.toLocal()).toUpperCase()}',
      participantSummaryKey: tournament.maxSlots == null
          ? null
          : const Key('tournament.card.slots'),
      primaryPriceLabel: price == null
          ? null
          : price == 0
          ? 'Gratis'
          : formatMoneyFromMajor(price, CurrencyCode.usd),
      pricePlaceholderLabel: price == null ? 'Precio por confirmar' : null,
      priceKey: price == null ? null : const Key('tournament.card.price'),
      pricePlaceholderKey: price == null
          ? const Key('tournament.card.pricePlaceholder')
          : null,
      priceSuffix: price == 0 ? '' : 'p/p',
      onTap: () => context.push(
        Routes.tournamentDetail(tournament.id),
        extra: detailExtra ?? tournament,
      ),
    );

    if (pendingInvitationId == null && !isOrganizer) {
      return Padding(padding: const EdgeInsets.only(bottom: 12), child: card);
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          if (pendingInvitationId != null && _invitationOrg != null)
            _InvitationBanner(org: _invitationOrg!, onTap: onViewInvitation),
          if (isOrganizer)
            _OrganizerRow(
              tournamentName: tournament.name,
              onTap: onOrganizerTap,
            ),
          card,
        ],
      ),
    );
  }
}

final class _InvitationBanner extends StatelessWidget {
  const _InvitationBanner({required this.org, this.onTap});

  final String org;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      key: const Key('tournament.card.invitationBanner'),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: BrandColors.limeAccent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: BrandColors.limeAccent.withValues(alpha: 0.45),
          width: 1.5,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: BrandColors.limeAccent,
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(AppIcons.mail, size: 16, color: BrandColors.onLime),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$org te invitó',
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                GestureDetector(
                  onTap: onTap,
                  child: Text(
                    'Ver invitación →',
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      color: scheme.onSurface,
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

/// Fila lime con escudo "Organizás {torneo}" (`cuadrala-torneos.jsx:175-184`):
/// el visor organiza este torneo.
final class _OrganizerRow extends StatelessWidget {
  const _OrganizerRow({required this.tournamentName, this.onTap});

  final String tournamentName;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      key: const Key('tournament.card.organizerRow'),
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: scheme.outlineVariant, width: 1.5),
        ),
        child: Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: BrandColors.limeAccent,
                borderRadius: BorderRadius.circular(9),
              ),
              child: Icon(AppIcons.shield, size: 16, color: BrandColors.onLime),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Organizás $tournamentName',
                style: const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Icon(
              AppIcons.chevronRight,
              size: 18,
              color: scheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}
