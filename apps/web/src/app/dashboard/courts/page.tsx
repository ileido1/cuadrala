'use client';

import { useEffect, useState } from 'react';
import {
  CourtPricingTiersForm,
  courtTiersToDrafts,
  type PricingTierDraft,
  validateTierDrafts,
} from '~/components/courts/CourtPricingTiersForm';
import { useVenue } from '~/contexts/venue-context';
import { apiClient } from '~/lib/api-client';
import {
  parseBasePriceCents,
  syncCourtPricingTiers,
} from '~/lib/court-pricing-sync';
import {
  centsToFormattedMajorInput,
  formatCentsWithCurrency,
  resolveCurrencyCode,
} from '~/lib/format-money';
import type { Court, SportType } from '~/types/api';

type TabValue = 'all' | 'active' | 'maintenance';

interface CourtFormData {
  name: string;
  sportType: string;
  surface: string;
  durationMinutes: number;
  capacity: string;
  basePricePerHour: string;
}

const EMPTY_COURT_FORM: CourtFormData = {
  name: '',
  sportType: '',
  surface: '',
  durationMinutes: 60,
  capacity: '4v4',
  basePricePerHour: '',
};

interface Sport {
  id: string;
  code: string;
  name: string;
}

function formatDurationLabel(_minutes: number): string {
  const _hours = Math.floor(_minutes / 60);
  const _mins = _minutes % 60;
  if (_hours === 0) {
    return `${_mins} min`;
  }
  if (_mins === 0) {
    return `${_hours} h`;
  }
  return `${_hours} h ${_mins} min`;
}

// Sport icon component
function SportIcon({ type, className = 'w-5 h-5' }: { type: SportType; className?: string }) {
  if (type === 'PADEL') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      <path d="M2 12h20" />
    </svg>
  );
}

function CourtCard({
  court,
  animationIndex,
  currency,
  onEdit,
  onDelete,
  onSetMaintenance,
  onActivate,
}: {
  court: Court;
  animationIndex: number;
  currency: ReturnType<typeof resolveCurrencyCode>;
  onEdit: (court: Court) => void;
  onDelete: (court: Court) => void;
  onSetMaintenance: (court: Court) => void;
  onActivate: (court: Court) => void;
}) {
  const statusBadge =
    court.status === 'ACTIVE' ? (
      <span className="badge badge-success shrink-0">Activa</span>
    ) : court.status === 'MAINTENANCE' ? (
      <span className="badge badge-warning shrink-0">Mantenimiento</span>
    ) : (
      <span className="badge badge-error shrink-0">Inactiva</span>
    );

  const accentClass =
    court.status === 'ACTIVE'
      ? 'border-l-green-500'
      : court.status === 'MAINTENANCE'
        ? 'border-l-amber-500'
        : 'border-l-slate-400';

  const durationLabel = formatDurationLabel(court.durationMinutes ?? 60);
  const hasBasePrice =
    court.pricePerHourCents != null && court.pricePerHourCents > 0;
  const tiers = court.pricingTiers ?? [];
  const hasPricing = hasBasePrice || tiers.length > 0;

  return (
    <article
      className={`card flex flex-col border-l-4 ${accentClass} animate-fade-in overflow-hidden`}
      style={{ animationDelay: `${animationIndex * 50}ms` }}
    >
      <div className="p-5 space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {court.name}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <SportIcon type={court.sportType} className="w-4 h-4 shrink-0" />
              <span>{court.sportType}</span>
              {court.surfaceType ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="truncate">{court.surfaceType}</span>
                </>
              ) : null}
            </p>
          </div>
          {statusBadge}
        </header>

        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Capacidad
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-800">
              {court.capacity || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Bloque
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-800">
              {durationLabel}
            </dd>
          </div>
        </dl>

        <section className="space-y-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Tarifas
          </h3>
          {!hasPricing ? (
            <p className="text-sm text-slate-400 italic">
              Sin precios configurados
            </p>
          ) : (
            <ul className="space-y-1.5">
              {hasBasePrice && (
                <li className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <span className="text-slate-600">Precio base</span>
                  <span className="font-semibold text-green-700 tabular-nums">
                    {formatCentsWithCurrency(court.pricePerHourCents!, currency)}
                    <span className="text-slate-400 font-normal">/h</span>
                  </span>
                </li>
              )}
              {tiers.map((tier) => (
                <li
                  key={tier.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {tier.label}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {tier.startTime} – {tier.endTime}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-green-700 tabular-nums">
                    {formatCentsWithCurrency(tier.pricePerHourCents, currency)}
                    <span className="text-slate-400 font-normal">/h</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/80 p-3">
        <button
          type="button"
          onClick={() => onEdit(court)}
          className="btn btn-outline flex-1 min-w-[7rem] text-sm py-2"
        >
          Editar
        </button>
        {court.status === 'ACTIVE' && (
          <>
            <button
              type="button"
              onClick={() => onSetMaintenance(court)}
              className="btn btn-outline flex-1 min-w-[7rem] text-sm py-2 text-amber-700 border-amber-200 hover:bg-amber-50"
            >
              Mantenimiento
            </button>
            <button
              type="button"
              onClick={() => onDelete(court)}
              className="btn btn-outline flex-1 min-w-[7rem] text-sm py-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              Eliminar
            </button>
          </>
        )}
        {court.status === 'MAINTENANCE' && (
          <button
            type="button"
            onClick={() => onActivate(court)}
            className="btn btn-outline flex-1 min-w-[7rem] text-sm py-2 text-green-700 border-green-200 hover:bg-green-50"
          >
            Activar
          </button>
        )}
      </footer>
    </article>
  );
}


export default function CourtsPage() {
  const { currentVenue } = useVenue();
  const venueCurrency = resolveCurrencyCode(
    currentVenue?.pricingCurrency,
    currentVenue?.displayCurrency,
  );
  const [activeTab, setActiveTab] = useState<TabValue>('active');
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [form, setForm] = useState<CourtFormData>(EMPTY_COURT_FORM);
  const [tierDrafts, setTierDrafts] = useState<PricingTierDraft[]>([]);
  const [originalTierIds, setOriginalTierIds] = useState<string[]>([]);

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState<Court | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!currentVenue) return;

    setLoading(true);
    Promise.all([
      apiClient.venues.courts.list(currentVenue.id),
      apiClient.sports.list(),
    ])
      .then(([courtsRes, sportsRes]) => {
        const sportsData = sportsRes.data.data?.sports ?? [];
        setSports(sportsData as Sport[]);
        setCourts((courtsRes.data.data?.items ?? courtsRes.data.data ?? []) as Court[]);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [currentVenue]);

  const loadCourts = async () => {
    if (!currentVenue) return;
    const courtsRes = await apiClient.venues.courts.list(currentVenue.id);
    setCourts((courtsRes.data.data?.items ?? courtsRes.data.data ?? []) as Court[]);
  };

  const resetFormState = (_sportDefault?: string) => {
    setForm({
      ...EMPTY_COURT_FORM,
      sportType: _sportDefault ?? '',
    });
    setTierDrafts([]);
    setOriginalTierIds([]);
    setEditingCourt(null);
    setFormError(null);
  };

  const visibleCourts = courts.filter((court) => court.status !== 'INACTIVE');

  const filteredCourts = visibleCourts.filter((court) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return court.status === 'ACTIVE';
    if (activeTab === 'maintenance') return court.status === 'MAINTENANCE';
    return true;
  });

  const handleCourtStatusChange = async (
    _court: Court,
    _status: 'ACTIVE' | 'MAINTENANCE',
  ) => {
    if (!currentVenue) return;
    try {
      await apiClient.venues.courts.update(currentVenue.id, _court.id, {
        status: _status,
      });
      await loadCourts();
      showToast(
        _status === 'MAINTENANCE'
          ? 'Cancha en mantenimiento.'
          : 'Cancha activada correctamente.',
        'success',
      );
    } catch {
      showToast('No se pudo actualizar el estado de la cancha.', 'error');
    }
  };

  const handleSave = async () => {
    if (!currentVenue || !form.name.trim()) return;

    const tierValidation = validateTierDrafts(tierDrafts);
    if (tierValidation !== null) {
      setFormError(tierValidation);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const pricePerHourCents = parseBasePriceCents(form.basePricePerHour);
      const data = {
        name: form.name.trim(),
        sportType: form.sportType || undefined,
        surfaceType: form.surface.trim() || null,
        durationMinutes: form.durationMinutes,
        pricePerHourCents,
        capacity: form.capacity.trim() || null,
      };

      let courtId: string;

      if (editingCourt) {
        await apiClient.venues.courts.update(
          currentVenue.id,
          editingCourt.id,
          data,
        );
        courtId = editingCourt.id;
      } else {
        const res = await apiClient.venues.courts.create(currentVenue.id, data);
        courtId = (res.data.data as Court).id;
      }

      await syncCourtPricingTiers(
        currentVenue.id,
        courtId,
        tierDrafts,
        originalTierIds,
      );

      await loadCourts();
      setShowForm(false);
      resetFormState(sports[0]?.code);
      showToast(
        editingCourt ? 'Cancha actualizada correctamente.' : 'Cancha creada correctamente.',
        'success',
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar la cancha';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (court: Court) => {
    setEditingCourt(court);
    setForm({
      name: court.name,
      sportType: court.sportType,
      surface: court.surfaceType || '',
      durationMinutes: court.durationMinutes ?? 60,
      capacity: court.capacity || '4v4',
      basePricePerHour:
        court.pricePerHourCents != null
          ? centsToFormattedMajorInput(court.pricePerHourCents, venueCurrency)
          : '',
    });
    const tiers = court.pricingTiers ?? [];
    setTierDrafts(courtTiersToDrafts(tiers, venueCurrency));
    setOriginalTierIds(tiers.map((t) => t.id));
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = async (court: Court) => {
    setCourtToDelete(court);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!courtToDelete || !currentVenue) return;
    try {
      await apiClient.venues.courts.cancel(currentVenue.id, courtToDelete.id);
      await loadCourts();
      setShowDeleteModal(false);
      setCourtToDelete(null);
      showToast('Cancha eliminada correctamente.', 'success');
    } catch {
      showToast('Error al eliminar la cancha.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="page-heading">Mis Canchas</h1>
          <p className="text-body mt-1">Gestiona las canchas de tu club</p>
        </div>
        <button onClick={() => {
          resetFormState(sports[0]?.code || '');
          setShowForm(true);
        }} className="btn btn-primary self-start">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Cancha
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-scale-in">
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {editingCourt ? 'Editar Cancha' : 'Nueva Cancha'}
            </h2>

            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input w-full"
                  placeholder="Cancha 1"
                />
              </div>

              {/* Tipo de deporte */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de deporte</label>
                <select
                  value={form.sportType}
                  onChange={(e) => setForm({ ...form, sportType: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Seleccionar deporte</option>
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.code}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Superficie */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Superficie</label>
                <input
                  type="text"
                  value={form.surface}
                  onChange={(e) => setForm({ ...form, surface: e.target.value })}
                  className="input w-full"
                  placeholder="Césped artificial"
                />
              </div>

              {/* Duración del bloque */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duración del bloque (minutos)</label>
                <select
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                  className="input w-full"
                >
                  <option value={60}>60 min (1 hora)</option>
                  <option value={90}>90 min (1:30 horas)</option>
                  <option value={120}>120 min (2 horas)</option>
                  <option value={150}>150 min (2:30 horas)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">Duración de cada reserva para esta cancha.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Capacidad
                </label>
                <input
                  type="text"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="input w-full"
                  placeholder="4v4"
                />
              </div>

              <CourtPricingTiersForm
                tiers={tierDrafts}
                onChange={setTierDrafts}
                currency={venueCurrency}
                basePricePerHour={form.basePricePerHour}
                onBasePriceChange={(value) =>
                  setForm((f) => ({ ...f, basePricePerHour: value }))
                }
              />

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{formError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="btn btn-outline flex-1"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary flex-1"
                disabled={saving || !form.name.trim()}
              >
                {saving ? 'Guardando...' : editingCourt ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Filter */}
      <div className="border-b border-slate-200 animate-fade-in stagger-1">
        <nav className="flex gap-1 -mb-px">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-b-2 border-green-600 text-green-700'
                : 'text-slate-500 hover:text-slate-700 hover:border-b-2 hover:border-slate-300'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 px-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'active'
                ? 'border-b-2 border-green-600 text-green-700'
                : 'text-slate-500 hover:text-slate-700 hover:border-b-2 hover:border-slate-300'
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`pb-3 px-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === 'maintenance'
                ? 'border-b-2 border-amber-500 text-amber-600'
                : 'text-slate-500 hover:text-slate-700 hover:border-b-2 hover:border-slate-300'
            }`}
          >
            Mantenimiento
          </button>
        </nav>
      </div>

      {/* Courts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-secondary-200" />
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-secondary-200 rounded w-20" />
                <div className="h-3 bg-secondary-200 rounded w-32" />
              </div>
              <div className="grid grid-cols-3 gap-3 py-3 border-y border-secondary-200">
                <div className="h-8 bg-secondary-200 rounded" />
                <div className="h-8 bg-secondary-200 rounded" />
                <div className="h-8 bg-secondary-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-4M9 3h6m-6 0v16m6-16v16" />
            </svg>
          </div>
          <p className="text-slate-500">No hay canchas en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourts.map((court, index) => (
            <CourtCard
              key={court.id}
              court={court}
              animationIndex={index}
              currency={venueCurrency}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetMaintenance={(c) => handleCourtStatusChange(c, 'MAINTENANCE')}
              onActivate={(c) => handleCourtStatusChange(c, 'ACTIVE')}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2 animate-slide-up ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && courtToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 text-center mb-2">Eliminar cancha</h2>
            <p className="text-slate-500 text-sm text-center mb-6">
              ¿Estás seguro de eliminar «{courtToDelete.name}»? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setCourtToDelete(null); }} className="btn btn-outline flex-1">Cancelar</button>
              <button onClick={confirmDelete} className="btn flex-1 bg-red-600 hover:bg-red-700 text-white">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}