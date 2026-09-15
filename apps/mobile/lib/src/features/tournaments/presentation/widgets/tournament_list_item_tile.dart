import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/formatting/money_format.dart';
import '../../../../core/models/currency_code.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/brand_colors.dart';
import '../../../../router/routes.dart';
import '../../../../shared/widgets/dual_price.dart';
import '../../data/models/tournament_list_item_dto.dart';
import 'tournament_status_pill.dart';

String _occupancyLabel(int count, int? max) {
  if (max == null) {
    return count == 1 ? '$count inscripto' : '$count inscriptos';
  }
  return '$count/$max inscriptos';
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
    this.pendingInvitationId,
    this.isOrganizer = false,
    this.onViewInvitation,
    this.onOrganizerTap,
  });

  final TournamentListItemDto tournament;

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
  String? get _invitationOrg => tournament.venueName ?? tournament.organizerName;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(
          Routes.tournamentDetail(tournament.id),
          extra: tournament,
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (pendingInvitationId != null && _invitationOrg != null) ...[
                _InvitationBanner(
                  org: _invitationOrg!,
                  onTap: onViewInvitation,
                ),
                const SizedBox(height: 10),
              ],
              if (isOrganizer) ...[
                _OrganizerRow(
                  tournamentName: tournament.name,
                  onTap: onOrganizerTap,
                ),
                const SizedBox(height: 10),
              ],
              Row(
                children: [
                  TournamentStatusPill(status: tournament.status),
                  const SizedBox(width: 8),
                  Flexible(
                    child: _CategoryChip(label: tournament.categoryName),
                  ),
                  if (tournament.gender != null &&
                      _genderTagLabel(tournament.gender!) != null) ...[
                    const SizedBox(width: 8),
                    _GenderTag(label: _genderTagLabel(tournament.gender!)!),
                  ],
                ],
              ),
              const SizedBox(height: 10),
              Text(
                tournament.name,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              //? Cuándo y dónde en una fila que envuelve: en pantallas angostas
              //? la sede baja sola en vez de recortarse con puntos suspensivos.
              Wrap(
                spacing: 14,
                runSpacing: 4,
                children: [
                  if (tournament.startsAt != null)
                    _MetaRow(
                      icon: AppIcons.calendar,
                      label: _formatStartSV(tournament.startsAt!),
                    ),
                  if (tournament.venueName != null)
                    _MetaRow(
                      key: const Key('tournament.card.venue'),
                      icon: AppIcons.pin,
                      //? "Cerca" (M3d): `distanceKm` sólo viene cuando el
                      //? listado se filtró por cercanía (cuadrala-torneos.jsx:128,
                      //? `{venue} · {dist}`); sin ese filtro no se inventa.
                      label: tournament.distanceKm != null
                          ? '${tournament.venueName} · ${tournament.distanceKm!.toStringAsFixed(1)} km'
                          : tournament.venueName!,
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(child: _Occupancy(tournament: tournament)),
                  if (tournament.inscriptionPrice != null) ...[
                    const SizedBox(width: 12),
                    _Price(
                      key: const Key('tournament.card.price'),
                      amount: tournament.inscriptionPrice!,
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _formatStartSV(DateTime startsAt) {
    final local = startsAt.toLocal();
    return DateFormat('EEE d MMM · HH:mm', 'es_ES').format(local).toUpperCase();
  }
}

final class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.3,
          color: scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

/// Etiqueta de género junto a la chip de categoría (`tagStyle`,
/// `cuadrala-screens.jsx:113`; uso en tarjeta `cuadrala-torneos.jsx:117`).
final class _GenderTag extends StatelessWidget {
  const _GenderTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(7),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

final class _MetaRow extends StatelessWidget {
  const _MetaRow({super.key, required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: scheme.onSurfaceVariant),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: scheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

final class _Occupancy extends StatelessWidget {
  const _Occupancy({required this.tournament});

  final TournamentListItemDto tournament;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final count = tournament.registrationCount;
    final max = tournament.maxSlots;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Flexible(
              child: Text(
                _occupancyLabel(count, max),
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ),
            if (tournament.registrationClosesAt != null) ...[
              const SizedBox(width: 8),
              Text(
                'cierra ${DateFormat('EEE', 'es_ES').format(tournament.registrationClosesAt!.toLocal()).toUpperCase()}',
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: scheme.onSurfaceVariant.withValues(alpha: 0.75),
                ),
              ),
            ],
          ],
        ),
        if (max != null) ...[
          const SizedBox(height: 6),
          _SlotBar(
            key: const Key('tournament.card.slots'),
            filled: count,
            total: max,
          ),
        ],
      ],
    );
  }
}

final class _SlotBar extends StatelessWidget {
  const _SlotBar({super.key, required this.filled, required this.total});

  final int filled;
  final int total;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    //? Se satura en 1: un torneo con más anotados que cupos es decisión del
    //? organizador, y la barra no debe desbordar por eso.
    final ratio = total <= 0 ? 0.0 : (filled / total).clamp(0.0, 1.0);
    final isFull = ratio >= 1.0;

    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: LinearProgressIndicator(
        value: ratio,
        minHeight: 5,
        backgroundColor: scheme.surfaceContainerHighest,
        valueColor: AlwaysStoppedAnimation<Color>(
          isFull ? scheme.onSurfaceVariant : scheme.primary,
        ),
      ),
    );
  }
}

/// Precio de inscripción por jugador.
///
/// Un `0` declarado dice **Gratis**: es información, no ausencia de dato. El
/// secundario en Bs queda fuera a propósito — [DualPrice] es presentacional y
/// la conversión necesita la tasa real, no un factor fijo.
final class _Price extends StatelessWidget {
  const _Price({super.key, required this.amount});

  final double amount;

  @override
  Widget build(BuildContext context) {
    if (amount == 0) {
      return Text(
        'Gratis',
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w800,
          color: Theme.of(context).colorScheme.primary,
        ),
      );
    }

    return DualPrice(
      primaryLabel: formatMoneyFromMajor(amount, CurrencyCode.usd),
      suffix: 'p/p',
    );
  }
}

/// Banner lime "{org} te invitó" (`cuadrala-torneo-org.jsx:359`,
/// `README.md:51`): el visor tiene una invitación PENDING a este torneo.
/// `{org}` nunca es el nombre del torneo (D7).
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
