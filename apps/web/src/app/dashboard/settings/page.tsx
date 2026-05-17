'use client';

import { useEffect, useState } from 'react';
import { useVenue } from '~/contexts/venue-context';
import { apiClient } from '~/lib/api-client';
import { PaymentMethodsSettings } from '~/components/settings/PaymentMethodsSettings';
import {
  formatCentsWithCurrency,
  pricePerHourLabel,
  resolveCurrencyCode,
} from '~/lib/format-money';
import type { Court, CourtPricingTier, CreateCourtPricingTierRequest, UpdateCourtPricingTierRequest, Venue, VenueUpdateData } from '~/types/api';
import dynamic from 'next/dynamic';

// Dynamic import for Leaflet (no SSR)
const MapPicker = dynamic(() => import('~/components/map-picker'), { ssr: false });

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

type ScheduleState = Record<(typeof DAY_KEYS)[number], DaySchedule>;

const DEFAULT_SCHEDULE: ScheduleState = {
  monday: { enabled: true, open: '08:00', close: '23:00' },
  tuesday: { enabled: true, open: '08:00', close: '23:00' },
  wednesday: { enabled: true, open: '08:00', close: '23:00' },
  thursday: { enabled: true, open: '08:00', close: '23:00' },
  friday: { enabled: true, open: '08:00', close: '23:00' },
  saturday: { enabled: true, open: '08:00', close: '23:00' },
  sunday: { enabled: false, open: '08:00', close: '23:00' },
};

function parseOpeningHours(
  raw: Record<string, { open: string; close: string }> | unknown | null
): ScheduleState {
  if (!raw || typeof raw !== 'object') return DEFAULT_SCHEDULE;

  const schedule: ScheduleState = { ...DEFAULT_SCHEDULE };

  for (const day of DAY_KEYS) {
    const entry = (raw as Record<string, { open: string; close: string }>)[day];
    if (entry && typeof entry === 'object') {
      schedule[day] = {
        enabled: true,
        open: entry.open ?? '08:00',
        close: entry.close ?? '23:00',
      };
    }
  }

  return schedule;
}

function buildOpeningHours(schedule: ScheduleState): Record<string, { open: string; close: string }> | null {
  const result: Record<string, { open: string; close: string }> = {};

  for (const day of DAY_KEYS) {
    if (schedule[day].enabled) {
      result[day] = {
        open: schedule[day].open,
        close: schedule[day].close,
      };
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

// Parse time string "HH:MM" to minutes since midnight for sorting
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Sort tiers by startTime
function sortTiers(tiers: CourtPricingTier[]): CourtPricingTier[] {
  return [...tiers].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

interface TierFormData {
  label: string;
  startTime: string;
  endTime: string;
  pricePerHourCents: string;
}

const EMPTY_TIER_FORM: TierFormData = {
  label: '',
  startTime: '08:00',
  endTime: '12:00',
  pricePerHourCents: '',
};

export default function SettingsPage() {
  const { currentVenue } = useVenue();
  const venueCurrency = resolveCurrencyCode(
    currentVenue?.pricingCurrency,
    currentVenue?.displayCurrency,
  );
  const formatPrice = (cents: number) =>
    formatCentsWithCurrency(cents, venueCurrency);
  const perHourLabel = pricePerHourLabel(venueCurrency);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState>(DEFAULT_SCHEDULE);

  // Court Pricing Tiers state
  const [courts, setCourts] = useState<Court[]>([]);
  const [tiersByCourt, setTiersByCourt] = useState<Record<string, CourtPricingTier[]>>({});
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [tiersError, setTiersError] = useState<string | null>(null);
  const [addingTierForCourt, setAddingTierForCourt] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<{ courtId: string; tier: CourtPricingTier } | null>(null);
  const [tierForm, setTierForm] = useState<TierFormData>(EMPTY_TIER_FORM);
  const [savingTier, setSavingTier] = useState(false);
  const [tierFormError, setTierFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentVenue) return;

    apiClient.venues.get(currentVenue.id)
      .then((res) => {
        const data = res.data.data as Venue;
        setVenue(data);
        setName(data.name ?? '');
        setPhone(data.phone ?? '');
        setAddress(data.address ?? '');
        setEmail(data.email ?? '');
        setDescription(data.description ?? '');
        setLatitude(data.latitude ?? null);
        setLongitude(data.longitude ?? null);
        setSchedule(parseOpeningHours(data.openingHours));
      })
      .catch(() => setError('Error al cargar los datos del club.'))
      .finally(() => setLoading(false));
  }, [currentVenue]);

  // Fetch courts when venue loads
  useEffect(() => {
    if (!currentVenue || loading) return;

    setLoadingTiers(true);
    setTiersError(null);

    apiClient.venues.courts.list(currentVenue.id, { status: 'ACTIVE' })
      .then((res) => {
        const courtList = res.data.data.items as Court[];
        setCourts(courtList);

        // Fetch pricing tiers for each court
        const tierPromises = courtList.map((court) =>
          apiClient.venues.courts.pricingTiers.list(currentVenue.id, court.id)
            .then((tierRes) => ({
              courtId: court.id,
              tiers: sortTiers(tierRes.data.data.items as CourtPricingTier[]),
            }))
            .catch(() => ({ courtId: court.id, tiers: [] as CourtPricingTier[] }))
        );

        Promise.all(tierPromises).then((results) => {
          const tiersMap: Record<string, CourtPricingTier[]> = {};
          results.forEach((result) => {
            tiersMap[result.courtId] = result.tiers;
          });
          setTiersByCourt(tiersMap);
        });
      })
      .catch(() => setTiersError('Error al cargar las canchas.'))
      .finally(() => setLoadingTiers(false));
  }, [currentVenue, loading]);

  const handleSave = async () => {
    if (!currentVenue) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    // Build update payload — send only defined fields
    const updateData: VenueUpdateData = {
      ...(name.trim() ? { name: name.trim() } : {}),
      address: address.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      description: description.trim() || null,
      latitude,
      longitude,
      openingHours: buildOpeningHours(schedule),
    };

    try {
      await apiClient.venues.update(currentVenue.id, updateData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Error al guardar los cambios.';
      setError(typeof msg === 'string' ? msg : 'Error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day: (typeof DAY_KEYS)[number], field: keyof DaySchedule, value: string | boolean) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  // Court Pricing Tiers handlers
  const startAddTier = (courtId: string) => {
    setAddingTierForCourt(courtId);
    setTierForm(EMPTY_TIER_FORM);
    setTierFormError(null);
  };

  const startEditTier = (courtId: string, tier: CourtPricingTier) => {
    setEditingTier({ courtId, tier });
    setTierForm({
      label: tier.label,
      startTime: tier.startTime,
      endTime: tier.endTime,
      pricePerHourCents: (tier.pricePerHourCents / 100).toFixed(2),
    });
    setTierFormError(null);
  };

  const cancelTierForm = () => {
    setAddingTierForCourt(null);
    setEditingTier(null);
    setTierForm(EMPTY_TIER_FORM);
    setTierFormError(null);
  };

  const validateTierForm = (): boolean => {
    if (!tierForm.label.trim()) {
      setTierFormError('El nombre es requerido.');
      return false;
    }
    if (!tierForm.startTime || !tierForm.endTime) {
      setTierFormError('Los horarios son requeridos.');
      return false;
    }
    if (tierForm.startTime >= tierForm.endTime) {
      setTierFormError('La hora de inicio debe ser menor que la hora de fin.');
      return false;
    }
    const price = parseFloat(tierForm.pricePerHourCents);
    if (isNaN(price) || price < 0) {
      setTierFormError('El precio debe ser un número positivo.');
      return false;
    }
    return true;
  };

  const handleSaveTier = async () => {
    if (!currentVenue) return;
    if (!validateTierForm()) return;

    setSavingTier(true);
    setTierFormError(null);

    const priceCents = Math.round(parseFloat(tierForm.pricePerHourCents) * 100);

    try {
      if (addingTierForCourt) {
        // Create new tier
        const data: CreateCourtPricingTierRequest = {
          label: tierForm.label.trim(),
          startTime: tierForm.startTime,
          endTime: tierForm.endTime,
          pricePerHourCents: priceCents,
        };
        const res = await apiClient.venues.courts.pricingTiers.create(currentVenue.id, addingTierForCourt, data);
        const newTier = res.data.data as CourtPricingTier;
        setTiersByCourt((prev) => ({
          ...prev,
          [addingTierForCourt]: sortTiers([...(prev[addingTierForCourt] || []), newTier]),
        }));
        cancelTierForm();
      } else if (editingTier) {
        // Update existing tier
        const data: UpdateCourtPricingTierRequest = {
          label: tierForm.label.trim(),
          startTime: tierForm.startTime,
          endTime: tierForm.endTime,
          pricePerHourCents: priceCents,
        };
        const res = await apiClient.venues.courts.pricingTiers.update(
          currentVenue.id,
          editingTier.courtId,
          editingTier.tier.id,
          data
        );
        const updatedTier = res.data.data as CourtPricingTier;
        setTiersByCourt((prev) => ({
          ...prev,
          [editingTier.courtId]: sortTiers(
            prev[editingTier.courtId].map((t) => (t.id === updatedTier.id ? updatedTier : t))
          ),
        }));
        cancelTierForm();
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Error al guardar la tarifa.';
      setTierFormError(typeof msg === 'string' ? msg : 'Error al guardar la tarifa.');
    } finally {
      setSavingTier(false);
    }
  };

  const handleDeleteTier = async (courtId: string, tierId: string) => {
    if (!currentVenue) return;
    if (!confirm('¿Estás seguro de eliminar esta tarifa?')) return;

    try {
      await apiClient.venues.courts.pricingTiers.delete(currentVenue.id, courtId, tierId);
      setTiersByCourt((prev) => ({
        ...prev,
        [courtId]: prev[courtId].filter((t) => t.id !== tierId),
      }));
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Error al eliminar la tarifa.';
      alert(typeof msg === 'string' ? msg : 'Error al eliminar la tarifa.');
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="h-8 bg-secondary-200 rounded w-40 animate-pulse mb-2" />
          <div className="h-4 bg-secondary-200 rounded w-64 animate-pulse" />
        </div>
        <div className="card p-6 mb-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i}>
                <div className="h-3 bg-secondary-200 rounded w-24 mb-2" />
                <div className="h-10 bg-secondary-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="page-heading mb-2">Configuración</h1>
        <p className="text-body text-base">Ajustes generales del club</p>
      </div>

      {/* Card 1: Datos del Club */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h2 className="section-heading">Datos del Club</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {/* Nombre del Club */}
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              NOMBRE DEL CLUB
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Teléfono de Contacto */}
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              TELÉFONO DE CONTACTO
            </label>
            <input
              type="text"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Dirección + Mapa */}
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              DIRECCIÓN
            </label>
            <input
              type="text"
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Email de Contacto */}
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              EMAIL DE CONTACTO
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Descripción del Club (full width) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              DESCRIPCIÓN DEL CLUB
            </label>
            <textarea
              className="input min-h-[100px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Mapa Interactivo (full width) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              UBICACIÓN EN EL MAPA
            </label>
            <div className="rounded-xl overflow-hidden border border-outline h-[300px]">
              <MapPicker
                latitude={latitude ?? 10.48}
                longitude={longitude ?? -66.9}
                onPositionChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                onAddressChange={(addr) => setAddress(addr)}
              />
            </div>
            <p className="text-xs text-muted mt-1">
              Arrastrá el marcador para ajustar la ubicación exacta del club.
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Horarios de Atención */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="section-heading">Horarios de Atención</h2>
        </div>

        <div className="space-y-4">
          {DAY_KEYS.map((day, idx) => {
            const state = schedule[day];
            return (
              <div key={day} className="flex items-center gap-4 flex-wrap">
                {/* Day toggle */}
                <button
                  type="button"
                  onClick={() => updateDay(day, 'enabled', !state.enabled)}
                  className={`
                    min-w-[52px] px-3 py-2 rounded-lg text-sm font-semibold transition-all
                    ${state.enabled
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-container text-secondary-500'}
                  `}
                >
                  {DAY_LABELS[idx]}
                </button>

                {/* Open time */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-secondary-500 whitespace-nowrap">Abre</label>
                  <input
                    type="time"
                    className="input w-28"
                    value={state.open}
                    disabled={!state.enabled}
                    onChange={(e) => updateDay(day, 'open', e.target.value)}
                  />
                </div>

                {/* Close time */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-secondary-500 whitespace-nowrap">Cierra</label>
                  <input
                    type="time"
                    className="input w-28"
                    value={state.close}
                    disabled={!state.enabled}
                    onChange={(e) => updateDay(day, 'close', e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 3: Tarifas por Franja Horaria */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="section-heading">Tarifas por Franja Horaria</h2>
        </div>

        {loadingTiers ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="border border-outline rounded-xl p-4">
                <div className="h-4 bg-secondary-200 rounded w-32 mb-4 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 bg-secondary-100 rounded w-full animate-pulse" />
                  <div className="h-3 bg-secondary-100 rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : tiersError ? (
          <div className="text-center py-8">
            <p className="text-error text-sm">{tiersError}</p>
          </div>
        ) : courts.length === 0 ? (
          <div className="text-center py-8 text-secondary-500">
            <p>No hay canchas configuradas para esta sede.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {courts.map((court) => {
              const courtTiers = tiersByCourt[court.id] || [];
              const isAddingTier = addingTierForCourt === court.id;
              const isEditing = editingTier?.courtId === court.id;

              return (
                <div key={court.id} className="border border-outline rounded-xl p-4">
                  {/* Court Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-secondary-700">{court.name}</h3>
                    <button
                      type="button"
                      onClick={() => startAddTier(court.id)}
                      className="btn btn-secondary text-sm py-1.5 px-3"
                      disabled={isAddingTier || isEditing}
                    >
                      + Agregar tarifa
                    </button>
                  </div>

                  {/* Tiers List */}
                  {courtTiers.length === 0 && !isAddingTier ? (
                    <p className="text-secondary-400 text-sm py-2">Sin tarifas configuradas</p>
                  ) : (
                    <div className="space-y-2">
                      {courtTiers.map((tier) => {
                        const isEditingThisTier = isEditing && editingTier?.tier.id === tier.id;

                        return (
                          <div key={tier.id} className="flex items-center gap-3 py-2 px-3 bg-surface-container rounded-lg">
                            {isEditingThisTier ? (
                              // Edit mode
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                                <input
                                  type="text"
                                  className="input text-sm py-1.5"
                                  placeholder="Nombre"
                                  value={tierForm.label}
                                  onChange={(e) => setTierForm((f) => ({ ...f, label: e.target.value }))}
                                />
                                <input
                                  type="time"
                                  className="input text-sm py-1.5"
                                  value={tierForm.startTime}
                                  onChange={(e) => setTierForm((f) => ({ ...f, startTime: e.target.value }))}
                                />
                                <input
                                  type="time"
                                  className="input text-sm py-1.5"
                                  value={tierForm.endTime}
                                  onChange={(e) => setTierForm((f) => ({ ...f, endTime: e.target.value }))}
                                />
                                <input
                                  type="text"
                                  className="input text-sm py-1.5"
                                  placeholder={perHourLabel}
                                  value={tierForm.pricePerHourCents}
                                  onChange={(e) => setTierForm((f) => ({ ...f, pricePerHourCents: e.target.value }))}
                                />
                              </div>
                            ) : (
                              // View mode
                              <>
                                <div className="flex-1">
                                  <span className="font-medium text-sm">{tier.label}</span>
                                </div>
                                <div className="text-sm text-secondary-500">
                                  {tier.startTime} - {tier.endTime}
                                </div>
                                <div className="text-sm font-semibold text-primary">
                                  {formatPrice(tier.pricePerHourCents)}/hora
                                </div>
                              </>
                            )}

                            {/* Actions */}
                            {isEditingThisTier ? (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={handleSaveTier}
                                  disabled={savingTier}
                                  className="btn btn-primary text-sm py-1.5 px-2"
                                >
                                  {savingTier ? '...' : '✓'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelTierForm}
                                  className="btn btn-secondary text-sm py-1.5 px-2"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              !isAddingTier && (
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEditTier(court.id, tier)}
                                    className="text-secondary-500 hover:text-primary p-1"
                                    title="Editar"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTier(court.id, tier.id)}
                                    className="text-secondary-500 hover:text-error p-1"
                                    title="Eliminar"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Tier Form */}
                  {isAddingTier && (
                    <div className="mt-4 p-4 bg-surface-container rounded-xl border border-primary-200">
                      <h4 className="text-sm font-semibold text-secondary-700 mb-3">Nueva tarifa para {court.name}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="block text-xs text-secondary-500 mb-1">Nombre</label>
                          <input
                            type="text"
                            className="input text-sm"
                            placeholder="Ej: Mañana"
                            value={tierForm.label}
                            onChange={(e) => setTierForm((f) => ({ ...f, label: e.target.value }))}
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-secondary-500 mb-1">Hora inicio</label>
                          <input
                            type="time"
                            className="input text-sm"
                            value={tierForm.startTime}
                            onChange={(e) => setTierForm((f) => ({ ...f, startTime: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-secondary-500 mb-1">Hora fin</label>
                          <input
                            type="time"
                            className="input text-sm"
                            value={tierForm.endTime}
                            onChange={(e) => setTierForm((f) => ({ ...f, endTime: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-secondary-500 mb-1">
                            Precio/hora ({perHourLabel})
                          </label>
                          <input
                            type="text"
                            className="input text-sm"
                            placeholder="20.00"
                            value={tierForm.pricePerHourCents}
                            onChange={(e) => setTierForm((f) => ({ ...f, pricePerHourCents: e.target.value }))}
                          />
                        </div>
                      </div>
                      {tierFormError && (
                        <p className="text-error text-xs mt-2">{tierFormError}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={handleSaveTier}
                          disabled={savingTier}
                          className="btn btn-primary text-sm"
                        >
                          {savingTier ? 'Guardando...' : 'Agregar'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelTierForm}
                          className="btn btn-secondary text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <PaymentMethodsSettings />

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        {error && (
          <span className="text-error text-sm self-center">{error}</span>
        )}
        {success && (
          <span className="text-primary text-sm self-center">Cambios guardados</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary px-8"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
