String formatMoneyCents(int cents) {
  final pesos = (cents / 100).round();
  return pesos.toString();
}
