export function parseParticipantIds(_raw: string): string[] {
  return _raw
    .split(/[\s,;]+/)
    .map((_s) => _s.trim())
    .filter((_s) => _s.length > 0);
}
