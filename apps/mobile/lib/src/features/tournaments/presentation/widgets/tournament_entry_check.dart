import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/formatting/money_format.dart';
import '../../../../core/models/currency_code.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/brand_colors.dart';
import '../../../../shared/widgets/dual_price.dart';

/// Por qué el jugador puede o no puede entrar al torneo.
///
/// Se decide afuera —necesita el perfil del jugador— y entra ya resuelto para
/// que el widget siga siendo presentacional y testeable sin sesión.
enum TournamentEligibility {
  /// Juega la categoría del torneo.
  eligible,

  /// No la juega: el bloque se lee bloqueado y la inscripción no se ofrece.
  wrongCategory,

  /// Lo invitaron: entra aunque no califique, y el bloqueo desaparece.
  invited,
}

/// Bloque "¿Puedo entrar?" del detalle de torneo (rediseño).
///
/// Responde la primera pregunta del jugador **antes** del botón de inscripción,
/// nunca después: nivel, inscripción, cuándo y dónde. Las filas cuyo dato el
/// organizador no declaró no se dibujan — decir "Gratis" cuando nadie puso
/// precio sería inventar información, no simplificarla.
class TournamentEntryCheck extends StatelessWidget {
  const TournamentEntryCheck({
    super.key,
    required this.eligibility,
    required this.categoryName,
    this.playerCategoryName,
    this.inscriptionPrice,
    this.inscriptionPriceBs,
    this.startsAt,
    this.registrationClosesAt,
    this.venueName,
  });

  final TournamentEligibility eligibility;
  final String categoryName;

  /// Categoría que juega el jugador. `null` cuando todavía no la declaró.
  final String? playerCategoryName;

  final double? inscriptionPrice;

  /// Precio en Bs ya formateado (p. ej. `Bs 320`), para [DualPrice].
  ///
  /// `null` mientras nadie resuelva la tasa real (`ExchangeRatesRepository`)
  /// contra este dato — este widget sigue siendo presentacional y no debe
  /// inventar una conversión con un factor fijo.
  final String? inscriptionPriceBs;

  final DateTime? startsAt;
  final DateTime? registrationClosesAt;
  final String? venueName;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final rows = <Widget>[
      _EntryRow(
        icon: AppIcons.star,
        label: 'NIVEL',
        value: categoryName,
        sub: _levelSubSV(),
        blocked: eligibility == TournamentEligibility.wrongCategory,
        //? `cuadrala-torneos.jsx:86-87`: `tone === 'ok'` (elegible o
        //? invitado) dibuja un check verde; sólo `wrongCategory` es `tone ===
        //? 'no'` y dibuja el candado.
        trailing: switch (eligibility) {
          TournamentEligibility.wrongCategory => Icon(
            key: const Key('entry.level.locked'),
            AppIcons.lock,
            size: 18,
            color: BrandColors.dangerRed,
          ),
          TournamentEligibility.eligible ||
          TournamentEligibility.invited => Icon(
            key: const Key('entry.level.check'),
            AppIcons.check,
            size: 17,
            color: scheme.primary,
          ),
        },
      ),
      _EntryRow(
        icon: AppIcons.payments,
        label: 'INSCRIPCIÓN',
        value: inscriptionPrice == null
            ? 'Precio por confirmar'
            : inscriptionPrice == 0
            ? 'Gratis'
            : null,
        valueWidget: inscriptionPrice == null || inscriptionPrice == 0
            ? null
            : DualPrice(
                primaryLabel: formatMoneyFromMajor(
                  inscriptionPrice!,
                  CurrencyCode.usd,
                ),
                secondaryLabel: inscriptionPriceBs,
                alignEnd: false,
              ),
        sub: 'Por jugador, se paga al confirmar',
      ),
      _EntryRow(
        icon: AppIcons.calendar,
        label: 'CUÁNDO',
        value: startsAt == null
            ? 'Fecha por confirmar'
            : _formatDateTimeSV(startsAt!),
        sub: registrationClosesAt == null
            ? null
            : 'Inscripción hasta ${_formatDateTimeSV(registrationClosesAt!)}',
      ),
      _EntryRow(
        icon: AppIcons.pin,
        label: 'DÓNDE',
        value: venueName ?? 'Sede por confirmar',
        sub: venueName == null ? 'La sede todavía no fue declarada' : null,
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0)
              //? Sangría de 60: la línea arranca donde arranca el texto, no
              //? debajo del icono, para que las filas se lean como una lista.
              Padding(
                padding: const EdgeInsets.only(left: 60),
                child: Divider(
                  height: 1,
                  thickness: 1,
                  color: scheme.outlineVariant,
                ),
              ),
            rows[i],
          ],
        ],
      ),
    );
  }

  //? Copia verbatim de `cuadrala-torneos.jsx:246-248`: sustituye la
  //? categoría real del jugador (invitado) o la del torneo (bloqueado), en
  //? vez de una frase fija. Sin categoría declarada cae a una nota genérica.
  String _levelSubSV() => switch (eligibility) {
    TournamentEligibility.invited => playerCategoryName == null
        ? 'Te invitaron: entrás aunque juegues otra categoría.'
        : 'Te invitaron: entrás aunque juegues $playerCategoryName.',
    TournamentEligibility.wrongCategory => playerCategoryName == null
        ? 'Este torneo es para $categoryName.'
        : 'Jugás $playerCategoryName. Este torneo es para $categoryName.',
    TournamentEligibility.eligible => playerCategoryName == null
        ? 'Podés entrar.'
        : 'Jugás $playerCategoryName. Podés entrar.',
  };

  static String _formatDateTimeSV(DateTime value) {
    final local = value.toLocal();
    return DateFormat('EEE d MMM · HH:mm', 'es_ES').format(local).toUpperCase();
  }
}

final class _EntryRow extends StatelessWidget {
  const _EntryRow({
    required this.icon,
    required this.label,
    this.value,
    this.valueWidget,
    this.sub,
    this.blocked = false,
    this.trailing,
  }) : assert(
         value != null || valueWidget != null,
         'Either value or valueWidget must be provided',
       );

  final IconData icon;
  final String label;

  /// Texto plano de la fila. Ignorado cuando [valueWidget] no es `null`.
  final String? value;

  /// Widget de reemplazo (p. ej. [DualPrice]) para filas cuyo valor no es
  /// texto simple. Cuando está presente, [value] no se dibuja.
  final Widget? valueWidget;

  final String? sub;
  final bool blocked;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final accent = blocked ? BrandColors.dangerRed : scheme.primary;

    return Padding(
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: accent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 3),
                valueWidget ??
                    Text(
                      value!,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                if (sub != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    sub!,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: blocked
                          ? BrandColors.dangerRed
                          : scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 8), trailing!],
        ],
      ),
    );
  }
}
