import type { PricingTierDraft } from '~/components/courts/CourtPricingTiersForm';
import { apiClient } from '~/lib/api-client';
import { parseMajorAmountInput } from '~/lib/format-money';

export function parseBasePriceCents(_value: string): number | null {
  const _trimmed = _value.trim();
  if (_trimmed === '') {
    return null;
  }
  const _major = parseMajorAmountInput(_trimmed);
  if (_major === null || _major < 0) {
    throw new Error('El precio base debe ser un número positivo.');
  }
  return Math.round(_major * 100);
}

export async function syncCourtPricingTiers(
  _venueId: string,
  _courtId: string,
  _drafts: PricingTierDraft[],
  _originalTierIds: string[],
): Promise<void> {
  const _keptIds = new Set(
    _drafts.filter((_d) => _d.id !== undefined).map((_d) => _d.id as string),
  );

  for (const _id of _originalTierIds) {
    if (!_keptIds.has(_id)) {
      await apiClient.venues.courts.pricingTiers.delete(_venueId, _courtId, _id);
    }
  }

  for (const _draft of _drafts) {
    const _major = parseMajorAmountInput(_draft.pricePerHour);
    if (_major === null || _major < 0) {
      throw new Error(`Precio inválido en la franja «${_draft.label}».`);
    }
    const _priceCents = Math.round(_major * 100);
    const _payload = {
      label: _draft.label.trim(),
      startTime: _draft.startTime,
      endTime: _draft.endTime,
      pricePerHourCents: _priceCents,
    };

    if (_draft.id !== undefined) {
      await apiClient.venues.courts.pricingTiers.update(
        _venueId,
        _courtId,
        _draft.id,
        _payload,
      );
    } else {
      await apiClient.venues.courts.pricingTiers.create(
        _venueId,
        _courtId,
        _payload,
      );
    }
  }
}
