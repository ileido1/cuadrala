'use client';

import { useState, useEffect } from 'react';
import type { Court, CreateReservationRequest, CourtPricingTier, ReservationResponsible, UserSearchResult, ReservationListItem } from '~/types/api';
import { apiClient } from '~/lib/api-client';

interface ReservationModalProps {
  venueId: string;
  courts: Court[];
  defaultDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface TimeSlot {
  time: string;
  endTime: string;
  pricePerHourCents: number | null;
  tierLabel: string | null;
  isOccupied: boolean;
}

type ResponsibleType = 'player' | 'guest';

/**
 * Check if a slot overlaps with any existing reservation.
 * A slot (slotTime to slotTime + durationMinutes) overlaps if:
 * slotTime < reservationEnd AND slotEnd > reservationStart
 */
function isSlotOccupied(slotTime: string, slotDuration: number, reservations: ReservationListItem[]): boolean {
  const [sh, sm] = slotTime.split(':').map(Number);
  const slotStartMinutes = sh * 60 + sm;
  const slotEndMinutes = slotStartMinutes + slotDuration;

  return reservations.some((res) => {
    const resTime = res.scheduledAt.split('T')[1]?.substring(0, 5) ?? res.scheduledAt;
    const [rh, rm] = resTime.split(':').map(Number);
    const resStartMinutes = rh * 60 + rm;
    const resEndMinutes = resStartMinutes + res.durationMinutes;

    // Overlap: slot starts before reservation ends AND slot ends after reservation starts
    return slotStartMinutes < resEndMinutes && slotEndMinutes > resStartMinutes;
  });
}

function generateTimeSlots(durationMinutes: number, pricingTiers: CourtPricingTier[] | undefined, reservations: ReservationListItem[]): TimeSlot[] {
  const slots: TimeSlot[] = [];
  // Step equals duration so consecutive slots are adjacent (no gaps, no overlap)
  const step = durationMinutes;

  for (let h = 8; h < 23; h++) {
    for (let m = 0; m < 60; m += step) {
      const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const [eh, em] = [h, m + durationMinutes];
      const endHour = eh + Math.floor(em / 60);
      const endMin = em % 60;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

      // Check if slot is occupied
      const isOccupied = isSlotOccupied(startTime, durationMinutes, reservations);

      // Find matching pricing tier
      let pricePerHourCents: number | null = null;
      let tierLabel: string | null = null;
      if (pricingTiers && pricingTiers.length > 0) {
        const [sh, sm] = startTime.split(':').map(Number);
        const tier = pricingTiers.find((t) => {
          const [ts, tm] = t.startTime.split(':').map(Number);
          const [te, tem] = t.endTime.split(':').map(Number);
          const slotMinutes = sh * 60 + sm;
          const tierStartMinutes = ts * 60 + tm;
          const tierEndMinutes = te * 60 + tem;
          return slotMinutes >= tierStartMinutes && slotMinutes < tierEndMinutes;
        });
        if (tier) {
          pricePerHourCents = tier.pricePerHourCents;
          tierLabel = tier.label;
        }
      }

      slots.push({ time: startTime, endTime, pricePerHourCents, tierLabel, isOccupied });
    }
  }
  return slots;
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

function getMinTimeForToday(): string {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const roundedMinute = Math.ceil(currentMinute / 30) * 30;
  if (roundedMinute >= 60) {
    return `${String(currentHour + 1).padStart(2, '0')}:00`;
  }
  return `${String(currentHour).padStart(2, '0')}:${String(roundedMinute).padStart(2, '0')}`;
}

export function ReservationModal({ venueId, courts, defaultDate, onClose, onSuccess }: ReservationModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [courtId, setCourtId] = useState(courts[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate ?? today);
  const [selectedTime, setSelectedTime] = useState<string>('08:00');
  const [durationMinutes, setDurationMinutes] = useState(courts[0]?.durationMinutes ?? 60);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Responsible person state
  const [responsibleType, setResponsibleType] = useState<ResponsibleType>('guest');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSearchResults, setPlayerSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [existingReservations, setExistingReservations] = useState<ReservationListItem[]>([]);

  const selectedCourt = courts.find((c) => c.id === courtId);
  const pricingTiers = selectedCourt?.pricingTiers;
  const minTime = isToday(date) ? getMinTimeForToday() : '00:00';

  // Generate slots based on duration, pricing tiers and existing reservations
  const timeSlots = generateTimeSlots(durationMinutes, pricingTiers, existingReservations);

  // When court changes, update duration to match court's default duration
  useEffect(() => {
    const court = courts.find((c) => c.id === courtId);
    if (court?.durationMinutes) {
      setDurationMinutes(court.durationMinutes);
    }
  }, [courtId, courts]);

  // Fetch existing reservations for this court and date
  useEffect(() => {
    if (!courtId || !date || !venueId) return;

    const fetchReservations = async () => {
      try {
        const res = await apiClient.venues.reservations.list(venueId, {
          courtId,
          from: date,
          to: date,
        });
        const data = (res.data.data as { items: ReservationListItem[] }).items ?? [];
        setExistingReservations(data.filter((r) => r.status === 'CONFIRMED'));
      } catch {
        setExistingReservations([]);
      }
    };

    fetchReservations();
  }, [courtId, date, venueId]);

  // When duration changes, reset selected time if it's no longer valid
  useEffect(() => {
    const validTimes = timeSlots.map((s) => s.time);
    if (!validTimes.includes(selectedTime)) {
      setSelectedTime(validTimes.find((t) => t >= minTime) ?? validTimes[0] ?? '08:00');
    }
  }, [durationMinutes, date]);

  // When date changes to today, adjust selected time if it's in the past
  useEffect(() => {
    if (isToday(date) && selectedTime < minTime) {
      setSelectedTime(minTime);
    }
  }, [date, minTime, selectedTime]);

  const buildResponsible = (): ReservationResponsible | undefined => {
    if (responsibleType === 'player' && selectedPlayerId) {
      return { type: 'PLAYER', playerId: selectedPlayerId };
    }
    if (responsibleType === 'guest' && guestName.trim()) {
      return { type: 'GUEST', name: guestName.trim(), phone: guestPhone.trim() || undefined };
    }
    return undefined;
  };

  const searchPlayers = async () => {
    if (playerSearch.length < 6) return;
    setSearchPerformed(true);
    try {
      const res = await apiClient.profile.searchByDocument(playerSearch);
      const data = (res.data.data as { items: UserSearchResult[] }).items ?? [];
      setPlayerSearchResults(data);

      // If no results, switch to guest mode and pre-fill document
      if (data.length === 0) {
        setResponsibleType('guest');
        setGuestName(playerSearch); // Pre-fill with document number
        setSelectedPlayerId('');
        setSelectedPlayerName('');
      }
    } catch {
      setPlayerSearchResults([]);
      // On error, switch to guest mode
      setResponsibleType('guest');
      setGuestName(playerSearch);
      setSelectedPlayerId('');
      setSelectedPlayerName('');
    }
  };

  const handlePlayerSelect = (player: UserSearchResult) => {
    setSelectedPlayerId(player.id);
    setSelectedPlayerName(player.name);
    setPlayerSearch(player.name);
    setPlayerSearchResults([]);
  };

  const handleGuestMode = () => {
    setResponsibleType('guest');
    setSelectedPlayerId('');
    setSelectedPlayerName('');
    setPlayerSearch('');
    setPlayerSearchResults([]);
    setSearchPerformed(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtId) {
      setError('Selecciona una cancha');
      return;
    }
    if (!selectedTime) {
      setError('Selecciona un horario');
      return;
    }
    if (responsibleType === 'guest' && !guestName.trim()) {
      setError('Ingresá el nombre del responsable');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const scheduledAt = `${date}T${selectedTime}:00Z`;
      const responsible = buildResponsible();
      const data: CreateReservationRequest = {
        courtId,
        scheduledAt,
        durationMinutes,
        notes: notes || undefined,
        ...(responsible && { responsible }),
      };

      await apiClient.venues.reservations.create(venueId, data);
      onSuccess();
      onClose();
    } catch {
      setError('No se pudo crear la reserva. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Nueva Reserva</h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Court */}
          <div>
            <label htmlFor="court" className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cancha
            </label>
            <select
              id="court"
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
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

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </label>
            <input
              type="date"
              id="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duración
            </label>
            <select
              id="duration"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value={30}>30 min</option>
              <option value={60}>1 hora</option>
              <option value={90}>1.5 horas</option>
              <option value={120}>2 horas</option>
            </select>
          </div>

          {/* Time Slots Chips */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Horario <span className="text-gray-400 normal-case">(seleccioná un bloque)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((slot) => {
                const isDisabled = slot.time < minTime || slot.isOccupied;
                const isSelected = selectedTime === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`
                      relative flex flex-col items-center justify-center px-2 py-2 rounded-lg border text-xs font-medium transition-all
                      ${isDisabled
                        ? slot.isOccupied
                          ? 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed'
                          : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        : isSelected
                          ? 'bg-primary-100 border-primary-500 text-primary-700 cursor-pointer'
                          : 'border-gray-300 text-gray-700 hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
                      }
                    `}
                  >
                    <span className="font-semibold">{slot.time}</span>
                    <span className="text-[10px] text-gray-400">{slot.endTime}</span>
                    {slot.isOccupied && (
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
            {!selectedTime && (
              <p className="text-xs text-red-500 mt-1">Seleccioná un horario</p>
            )}
          </div>

          {/* Responsible Person */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
              Responsable
            </label>

            {/* Toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setResponsibleType('guest')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  responsibleType === 'guest'
                    ? 'bg-primary-100 text-primary-700 border-r border-primary-200'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                Persona
              </button>
              <button
                type="button"
                onClick={() => setResponsibleType('player')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  responsibleType === 'player'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                Jugador
              </button>
            </div>

            {/* Guest fields */}
            {responsibleType === 'guest' && (
              <div className="space-y-2">
                <div>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Nombre completo *"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required={responsibleType === 'guest'}
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="Teléfono (opcional)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            {/* Player search */}
            {responsibleType === 'player' && (
              <div className="space-y-2">
                {!selectedPlayerId ? (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={playerSearch}
                        onChange={(e) => {
                          setPlayerSearch(e.target.value);
                          setSearchPerformed(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            searchPlayers();
                          }
                        }}
                        placeholder="Número de documento..."
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => searchPlayers()}
                        disabled={playerSearch.length < 6}
                        className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                      >
                        Buscar
                      </button>
                    </div>

                    {/* Search Results */}
                    {playerSearchResults.length > 0 && (
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                        {playerSearchResults.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => handlePlayerSelect(player)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                          >
                            <span className="text-sm font-medium text-gray-900">{player.name}</span>
                            <span className="text-xs text-gray-500">{player.documentNumber}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No results found - offer guest mode */}
                    {searchPerformed && playerSearchResults.length === 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800 mb-2">
                          No se encontró ningún jugador con ese documento.
                        </p>
                        <button
                          type="button"
                          onClick={handleGuestMode}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          → Registrar como persona
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* Player selected */
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">{selectedPlayerName}</p>
                      <p className="text-xs text-green-600">Jugador seleccionado</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlayerId('');
                        setSelectedPlayerName('');
                        setPlayerSearch('');
                        setSearchPerformed(false);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-xs font-medium text-gray-500 uppercase tracking-wider">
              Notas <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Ej: Reserva para cliente VIP"
            />
          </div>

          {/* Footer */}
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
              disabled={loading || !selectedTime || (responsibleType === 'guest' && !guestName.trim())}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
