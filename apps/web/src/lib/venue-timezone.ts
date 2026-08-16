/** Default IANA timezone used only as an observable client-side fallback (design A7). */
export const DEFAULT_VENUE_TIMEZONE = 'America/Caracas';

export type VenueTimezoneResolution = {
  timezone: string;
  isFallback: boolean;
};

/**
 * Resolves the timezone to use for a venue's FX-dependent UI.
 *
 * The API returns `timezone: string | null` verbatim (no silent default, A7):
 * `null` means the venue has no `monetizationSettings` row configured yet.
 * This helper is the single place the web app decides the fallback, and it
 * always reports whether the fallback was used so callers can render a
 * visible warning instead of silently guessing the venue's real timezone.
 */
export function resolveVenueTimezone(
  _venue: { timezone?: string | null } | null | undefined,
): VenueTimezoneResolution {
  const TIMEZONE = _venue?.timezone;
  if (TIMEZONE) {
    return { timezone: TIMEZONE, isFallback: false };
  }
  return { timezone: DEFAULT_VENUE_TIMEZONE, isFallback: true };
}
