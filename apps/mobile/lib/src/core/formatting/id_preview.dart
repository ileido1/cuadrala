/// Vista corta de IDs largos (UUID/cuid) para UI; no asume longitud mínima.
String idPreview(String value, {int maxChars = 8}) {
  if (value.isEmpty) return '—';
  final end = value.length < maxChars ? value.length : maxChars;
  final head = value.substring(0, end);
  if (value.length <= maxChars) return head;
  return '$head…';
}
