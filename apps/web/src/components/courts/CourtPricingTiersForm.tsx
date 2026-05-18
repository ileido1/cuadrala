'use client';

import { CurrencyAmountInput } from '~/components/shared/CurrencyAmountInput';
import type { CourtPricingTier } from '~/types/api';
import {
  centsToFormattedMajorInput,
  pricePerHourLabel,
  parseMajorAmountInput,
  type CurrencyCode,
} from '~/lib/format-money';

export interface PricingTierDraft {
  localId: string;
  id?: string;
  label: string;
  startTime: string;
  endTime: string;
  pricePerHour: string;
}

export function courtTiersToDrafts(
  _tiers: CourtPricingTier[],
  _currency: CurrencyCode,
): PricingTierDraft[] {
  return _tiers.map((_tier) => ({
    localId: _tier.id,
    id: _tier.id,
    label: _tier.label,
    startTime: _tier.startTime,
    endTime: _tier.endTime,
    pricePerHour: centsToFormattedMajorInput(_tier.pricePerHourCents, _currency),
  }));
}

export function createEmptyTierDraft(): PricingTierDraft {
  return {
    localId: crypto.randomUUID(),
    label: '',
    startTime: '08:00',
    endTime: '12:00',
    pricePerHour: '',
  };
}

export function validateTierDrafts(_tiers: PricingTierDraft[]): string | null {
  for (const _tier of _tiers) {
    if (!_tier.label.trim()) {
      return 'Cada tarifa debe tener un nombre.';
    }
    if (!_tier.startTime || !_tier.endTime) {
      return 'Cada tarifa debe tener hora de inicio y fin.';
    }
    if (_tier.startTime >= _tier.endTime) {
      return `«${_tier.label}»: la hora de inicio debe ser menor que la de fin.`;
    }
    const _price = parseMajorAmountInput(_tier.pricePerHour);
    if (_price === null || _price < 0) {
      return `«${_tier.label}»: el precio debe ser un número positivo.`;
    }
  }
  return null;
}

interface CourtPricingTiersFormProps {
  tiers: PricingTierDraft[];
  onChange: (_tiers: PricingTierDraft[]) => void;
  currency: CurrencyCode;
  basePricePerHour: string;
  onBasePriceChange: (_value: string) => void;
}

export function CourtPricingTiersForm({
  tiers,
  onChange,
  currency,
  basePricePerHour,
  onBasePriceChange,
}: CourtPricingTiersFormProps) {
  const _perHourLabel = pricePerHourLabel(currency);

  const _addTier = () => {
    onChange([...tiers, createEmptyTierDraft()]);
  };

  const _updateTier = (_localId: string, _patch: Partial<PricingTierDraft>) => {
    onChange(
      tiers.map((_t) => (_t.localId === _localId ? { ..._t, ..._patch } : _t)),
    );
  };

  const _removeTier = (_localId: string) => {
    onChange(tiers.filter((_t) => _t.localId !== _localId));
  };

  return (
    <div className="space-y-4 border-t border-slate-200 pt-4">
      <div>
        <p className="text-sm font-semibold text-slate-700">Precios</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Precio base opcional y tarifas por franja horaria.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Precio base ({_perHourLabel})
        </label>
        <CurrencyAmountInput
          value={basePricePerHour}
          onChange={onBasePriceChange}
          currency={currency}
        />
        <p className="text-xs text-slate-400 mt-1">
          Se usa cuando no hay tarifa para el horario de la reserva.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Tarifas por franja
          </span>
          <button
            type="button"
            onClick={_addTier}
            className="text-sm text-green-700 font-medium hover:underline"
          >
            + Agregar franja
          </button>
        </div>

        {tiers.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            Sin franjas — solo aplicará el precio base.
          </p>
        ) : (
          <div className="space-y-3">
            {tiers.map((_tier) => (
              <div
                key={_tier.localId}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    className="input text-sm"
                    placeholder="Nombre (ej. Mañana)"
                    value={_tier.label}
                    onChange={(e) =>
                      _updateTier(_tier.localId, { label: e.target.value })
                    }
                  />
                  <CurrencyAmountInput
                    value={_tier.pricePerHour}
                    onChange={(next) =>
                      _updateTier(_tier.localId, { pricePerHour: next })
                    }
                    currency={currency}
                    inputClassName="text-sm"
                    placeholder={_perHourLabel}
                  />
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input
                    type="time"
                    className="input text-sm"
                    value={_tier.startTime}
                    onChange={(e) =>
                      _updateTier(_tier.localId, { startTime: e.target.value })
                    }
                  />
                  <input
                    type="time"
                    className="input text-sm"
                    value={_tier.endTime}
                    onChange={(e) =>
                      _updateTier(_tier.localId, { endTime: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => _removeTier(_tier.localId)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Quitar franja"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
