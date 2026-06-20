import 'package:flutter/material.dart';

import '../../core/formatting/money_format.dart';
import '../../core/models/currency_code.dart';
import '../../core/theme/brand_colors.dart';

/// Precio en moneda dual (rediseño): importe principal grande + secundario
/// (p. ej. `Bs`) atenuado debajo.
///
/// Es **presentacional**: recibe etiquetas ya formateadas. La conversión a Bs
/// debe resolverse con la tasa real (`ExchangeRatesRepository`), nunca con un
/// factor fijo.
class DualPrice extends StatelessWidget {
  const DualPrice({
    super.key,
    required this.primaryLabel,
    this.secondaryLabel,
    this.suffix,
    this.alignEnd = true,
    this.primarySize = 15,
  });

  /// Construye desde unidades menores ya conocidas para cada moneda.
  ///
  /// [secondaryMinor] es opcional: si es `null` solo se muestra el principal.
  DualPrice.fromMinor({
    super.key,
    required int primaryMinor,
    required CurrencyCode primaryCurrency,
    int? secondaryMinor,
    CurrencyCode secondaryCurrency = CurrencyCode.bs,
    this.suffix,
    this.alignEnd = true,
    this.primarySize = 15,
  })  : primaryLabel = formatMoneyFromMinor(primaryMinor, primaryCurrency),
        secondaryLabel = secondaryMinor == null
            ? null
            : formatMoneyFromMinor(secondaryMinor, secondaryCurrency);

  /// Importe principal ya formateado (p. ej. `US$8`).
  final String primaryLabel;

  /// Importe secundario ya formateado (p. ej. `Bs 320`). `null` lo oculta.
  final String? secondaryLabel;

  /// Sufijo opcional (p. ej. `/h`, `p/p`).
  final String? suffix;

  /// Alinea a la derecha (por defecto) o a la izquierda.
  final bool alignEnd;

  final double primarySize;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final suffixText = suffix == null ? '' : ' $suffix';
    // `--muted-2`: tono propio del prototipo, no "muted con menos opacidad".
    final muted2 = Theme.of(context).brightness == Brightness.dark
        ? BrandColors.darkMuted2
        : BrandColors.lightMuted2;

    return Column(
      crossAxisAlignment:
          alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text.rich(
          TextSpan(
            text: primaryLabel,
            style: TextStyle(
              fontSize: primarySize,
              fontWeight: FontWeight.w800,
              color: scheme.onSurface,
              height: 1.15,
            ),
            children: [
              if (suffix != null)
                TextSpan(
                  text: suffixText,
                  style: TextStyle(
                    fontSize: primarySize * 0.72,
                    fontWeight: FontWeight.w500,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
            ],
          ),
          textAlign: alignEnd ? TextAlign.end : TextAlign.start,
        ),
        if (secondaryLabel != null)
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Text(
              '${secondaryLabel!}$suffixText',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: muted2,
              ),
            ),
          ),
      ],
    );
  }
}
