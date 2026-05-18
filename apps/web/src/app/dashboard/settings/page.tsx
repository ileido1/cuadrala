'use client';

import { useEffect, useState } from 'react';
import { useVenue } from '~/contexts/venue-context';
import { apiClient } from '~/lib/api-client';
import { PaymentMethodsSettings } from '~/components/settings/PaymentMethodsSettings';
import {
  CURRENCY_OPTIONS,
  resolveCurrencyCode,
  type CurrencyCode,
} from '~/lib/format-money';
import type { Venue, VenueCurrencyCode, VenueUpdateData } from '~/types/api';
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

  const schedule = {} as ScheduleState;

  for (const day of DAY_KEYS) {
    const entry = (raw as Record<string, { open: string; close: string }>)[day];
    if (entry && typeof entry === 'object') {
      schedule[day] = {
        enabled: true,
        open: entry.open ?? '08:00',
        close: entry.close ?? '23:00',
      };
    } else {
      schedule[day] = {
        enabled: false,
        open: '08:00',
        close: '23:00',
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

export default function SettingsPage() {
  const { currentVenue, setCurrentVenue } = useVenue();
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
  const [pricingCurrency, setPricingCurrency] = useState<VenueCurrencyCode>('USD');
  const [displayCurrency, setDisplayCurrency] = useState<VenueCurrencyCode>('BS');

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
        setPricingCurrency(
          resolveCurrencyCode(data.pricingCurrency, 'USD') as VenueCurrencyCode,
        );
        setDisplayCurrency(
          resolveCurrencyCode(data.displayCurrency, 'BS') as VenueCurrencyCode,
        );
      })
      .catch(() => setError('Error al cargar los datos del club.'))
      .finally(() => setLoading(false));
  }, [currentVenue]);

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
      pricingCurrency,
      displayCurrency,
    };

    try {
      const res = await apiClient.venues.update(currentVenue.id, updateData);
      const saved = res.data.data as Venue;
      setVenue(saved);
      setSchedule(parseOpeningHours(saved.openingHours));
      if (currentVenue) {
        setCurrentVenue({
          ...currentVenue,
          name: saved.name,
          address: saved.address ?? null,
          phone: saved.phone ?? null,
          email: saved.email ?? null,
          description: saved.description ?? null,
          latitude: saved.latitude ?? null,
          longitude: saved.longitude ?? null,
          openingHours: saved.openingHours ?? null,
          pricingCurrency: saved.pricingCurrency ?? pricingCurrency,
          displayCurrency: saved.displayCurrency ?? displayCurrency,
        });
      }
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


      {/* Card 3: Moneda y precios */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
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
          <h2 className="section-heading">Moneda y precios</h2>
        </div>
        <p className="text-sm text-muted mb-6">
          La moneda de precios define en qué unidad se cargan tarifas y montos
          de reservas. La moneda de visualización es la referencia en pantalla
          para el equipo del club.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              MONEDA DE PRECIOS
            </label>
            <select
              className="input"
              value={pricingCurrency}
              onChange={(e) =>
                setPricingCurrency(e.target.value as VenueCurrencyCode)
              }
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">
              Usada en canchas, franjas horarias y cobros del venue.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              MONEDA DE VISUALIZACIÓN
            </label>
            <select
              className="input"
              value={displayCurrency}
              onChange={(e) =>
                setDisplayCurrency(e.target.value as VenueCurrencyCode)
              }
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">
              Referencia mostrada en el panel cuando aplique conversión.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <PaymentMethodsSettings
        defaultSettlementCurrency={
          resolveCurrencyCode(pricingCurrency, 'USD') as CurrencyCode
        }
      />

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
