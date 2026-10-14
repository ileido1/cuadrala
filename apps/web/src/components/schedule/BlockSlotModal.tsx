'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Court } from '~/types/api';
import { apiClient } from '~/lib/api-client';
import {
  formatDurationLabel,
  generateCourtBlockSlots,
  minutesToTimeString,
} from '~/lib/court-time-slots';
import { buildScheduledAtIso } from '~/lib/schedule-datetime';
import {
  closedDayMessage,
  getDayHoursForDate,
  hoursRangeLabel,
  type OpeningHoursMap,
} from '~/lib/venue-opening-hours';

interface BlockSlotModalProps {
  venueId: string;
  courts: Court[];
  openingHours?: OpeningHoursMap | null;
  defaultDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function getApiErrorMessage(_error: unknown): string {
  const MESSAGE = (_error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;

  return typeof MESSAGE === 'string' && MESSAGE.trim()
    ? MESSAGE
    : 'No se pudo bloquear el horario. Intenta de nuevo.';
}

function getSlotStartTime(_start: string): string {
  const MATCH = _start.match(/(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/);
  return MATCH?.[1] ?? _start;
}

export function BlockSlotModal({
  venueId,
  courts,
  openingHours,
  defaultDate,
  onClose,
  onSuccess,
}: BlockSlotModalProps) {
  const [courtId, setCourtId] = useState(courts[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Map<string, boolean> | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const selectedCourt = courts.find((court) => court.id === courtId);
  const blockDurationMinutes = selectedCourt?.durationMinutes ?? 60;
  const dayHours = useMemo(
    () => getDayHoursForDate(date, openingHours),
    [date, openingHours],
  );
  const isClosedDay = dayHours === null;
  const openMinutes = dayHours?.openMinutes ?? 8 * 60;
  const closeMinutes = dayHours?.closeMinutes ?? 23 * 60;

  const timeSlots = useMemo(
    () =>
      isClosedDay
        ? []
        : generateCourtBlockSlots({
            blockDurationMinutes,
            pricingTiers: selectedCourt?.pricingTiers,
            openMinutes,
            closeMinutes,
          }),
    [blockDurationMinutes, closeMinutes, isClosedDay, openMinutes, selectedCourt?.pricingTiers],
  );

  useEffect(() => {
    setSelectedTime('');
  }, [courtId, date, blockDurationMinutes]);

  useEffect(() => {
    if (!venueId || !courtId || !date || isClosedDay) {
      setAvailability(null);
      setAvailabilityError(null);
      setAvailabilityLoading(false);
      return;
    }

    let cancelled = false;
    setAvailability(null);
    setAvailabilityLoading(true);
    setAvailabilityError(null);

    void apiClient.venues.courts
      .slots(venueId, courtId, { date, durationMinutes: blockDurationMinutes })
      .then((response) => {
        if (!cancelled) {
          setAvailability(
            new Map(
              response.data.slots.map((slot) => [
                getSlotStartTime(slot.start),
                slot.isAvailable,
              ]),
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailability(null);
          setAvailabilityError('No se pudieron cargar los horarios. Intenta de nuevo.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAvailabilityLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [blockDurationMinutes, courtId, date, isClosedDay, venueId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!courtId) {
      setError('Selecciona una cancha');
      return;
    }
    if (isClosedDay) {
      setError(closedDayMessage(date, openingHours));
      return;
    }
    if (!selectedTime || availability?.get(selectedTime) !== true) {
      setError('Selecciona un horario disponible');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.venues.slots.block(venueId, courtId, {
        scheduledAt: buildScheduledAtIso(date, selectedTime),
        durationMinutes: blockDurationMinutes,
        notes: notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Bloquear Horario</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label htmlFor="court" className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cancha
            </label>
            <select
              id="court"
              value={courtId}
              onChange={(event) => setCourtId(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            >
              <option value="">Seleccionar cancha</option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name} ({court.sportType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date" className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          {isClosedDay && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              {closedDayMessage(date, openingHours)}
            </div>
          )}

          {!isClosedDay && dayHours && (
            <p className="text-xs text-gray-500">
              Horario de atención: {hoursRangeLabel(dayHours.openMinutes, dayHours.closeMinutes)}
            </p>
          )}

          {selectedCourt && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Bloque de la cancha</p>
              <p className="text-sm text-gray-800 mt-0.5">
                {formatDurationLabel(blockDurationMinutes)}
                <span className="text-gray-500 font-normal"> (definido al crear la cancha)</span>
              </p>
            </div>
          )}

          <div className={isClosedDay ? 'opacity-50 pointer-events-none' : undefined}>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Horario <span className="text-gray-400 normal-case">(seleccioná un bloque)</span>
            </label>
            {availabilityLoading && (
              <p className="mb-2 text-sm text-gray-500">Cargando horarios disponibles...</p>
            )}
            {availabilityError && (
              <p className="mb-2 text-sm text-red-700" role="alert">{availabilityError}</p>
            )}
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((slot) => {
                const isAvailable = availability?.get(slot.time) === true;
                const isSelected = selectedTime === slot.time;
                const isDisabled = !isAvailable || availabilityLoading;

                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setSelectedTime(slot.time)}
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    className={`
                      relative flex flex-col items-center justify-center px-2 py-2 rounded-lg border text-xs font-medium transition-all
                      ${isSelected
                        ? 'bg-primary-100 border-primary-500 text-primary-700 cursor-pointer'
                        : isDisabled
                          ? 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
                      }
                    `}
                  >
                    <span className="font-semibold">{slot.time}</span>
                    <span className="text-[10px] text-gray-400">{slot.endTime}</span>
                    {isDisabled && (
                      <span className="text-[9px] text-red-500 font-medium mt-0.5">Ocupado</span>
                    )}
                    {slot.pricePerHourCents && !isDisabled && (
                      <span className="text-[10px] text-green-600 font-medium mt-0.5">
                        ${(slot.pricePerHourCents / 100).toLocaleString('es-AR')}
                      </span>
                    )}
                    {slot.tierLabel && !isDisabled && (
                      <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-[9px] px-1 rounded">
                        {slot.tierLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!selectedTime && !availabilityLoading && !availabilityError && (
              <p className="text-xs text-red-500 mt-1">Seleccioná un horario</p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
              Motivo <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Ej: Mantenimiento, evento privado"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || isClosedDay || availabilityLoading || Boolean(availabilityError) || !selectedTime}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Bloqueando...' : 'Bloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
