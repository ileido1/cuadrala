import '../models/currency_code.dart';

/// Formatea unidades menores con símbolo de moneda.
String formatMoneyFromMinor(int amountMinor, CurrencyCode currency) {
  final MAJOR = amountMinor / 100;
  final FORMATTED = MAJOR.toStringAsFixed(2);
  return '${currency.symbol} $FORMATTED';
}

/// Formatea unidades mayores (p. ej. `amountTotal` legacy de transacciones).
String formatMoneyFromMajor(double amountMajor, CurrencyCode currency) {
  return formatMoneyFromMinor((amountMajor * 100).round(), currency);
}

/// Alias retrocompatible; por defecto bolívares.
String formatMoneyCents(int cents, [CurrencyCode currency = CurrencyCode.bs]) {
  return formatMoneyFromMinor(cents, currency);
}

/// Etiqueta compacta con símbolo (sustituye `\$ ${formatMoneyCents(...)}`).
String formatMoneyLabel(int cents, [CurrencyCode currency = CurrencyCode.bs]) {
  return formatMoneyFromMinor(cents, currency);
}

int? parseMinorFromJson(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

/// Convierte entrada de usuario (ej. `125,50`) a centavos.
int? parseMoneyInputToMinor(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  final normalized = trimmed.replaceAll('.', '').replaceAll(',', '.');
  final amount = double.tryParse(normalized);
  if (amount == null || amount <= 0) return null;
  return (amount * 100).round();
}
