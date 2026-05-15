'use client';

import { useEffect, useState } from 'react';
import { useVenue } from '~/contexts/venue-context';
import { apiClient } from '~/lib/api-client';
import type { Court, SportType } from '~/types/api';

type TabValue = 'all' | 'active' | 'maintenance';

interface CourtFormData {
  name: string;
  sportType: string;
  surface: string;
  durationMinutes: number;
}

interface Sport {
  id: string;
  code: string;
  name: string;
}

// Court display status mapping for UI demo
const COURT_DISPLAY_STATUS: Record<string, 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'> = {
  '1': 'ACTIVE',
  '2': 'ACTIVE',
  '3': 'ACTIVE',
  '4': 'MAINTENANCE',
  '5': 'INACTIVE',
};

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

// Capacity icon
function CapacityIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.1a36.346 36.346 0 011.622-3.395m6.382-3.232a23.88 23.88 0 00-2.149-2.193M7.755 14.406l-1.06-1.06a1.5 1.5 0 012.121-2.121l1.06 1.06a1.5 1.5 0 01-2.121 2.121zM12 12l.929-.929a2.5 2.5 0 013.536 3.536L12 12z" />
    </svg>
  );
}

// Clock/duration icon
function ClockIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Court card component
function CourtCard({ court, index, onEdit, onDelete }: { court: Court; index: number; onEdit: (court: Court) => void; onDelete: (court: Court) => void }) {
  const displayStatus = court.status === 'ACTIVE' ? 'ACTIVE' : court.status === 'INACTIVE' ? 'INACTIVE' : 'MAINTENANCE';

  const getStatusBadge = (status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE') => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-success">Activa</span>;
      case 'MAINTENANCE':
        return <span className="badge badge-warning">Mantenimiento</span>;
      case 'INACTIVE':
        return <span className="badge badge-error">Inactiva</span>;
      default:
        return <span className="badge badge-info">Activa</span>;
    }
  };

  const getCardAccentColor = (status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE') => {
    switch (status) {
      case 'ACTIVE':
        return 'border-l-4 border-l-green-500';
      case 'MAINTENANCE':
        return 'border-l-4 border-l-amber-500';
      case 'INACTIVE':
        return 'border-l-4 border-l-blue-500';
      default:
        return 'border-l-4 border-l-green-500';
    }
  };

  return (
    <div
      className={`card p-6 flex flex-col gap-4 ${getCardAccentColor(displayStatus)} animate-fade-in`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-5xl font-bold text-slate-800 leading-none">
            {index + 1}
          </span>
          {getStatusBadge(displayStatus)}
        </div>
      </div>

      {/* Court Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-slate-600">
          <SportIcon type={court.sportType} />
          <span className="font-medium">{court.sportType}</span>
          <span className="text-slate-400">•</span>
          <span className="text-sm">{court.surfaceType || 'Sin superficie'}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-200">
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Capacidad</p>
          <p className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
            <span>{court.capacity || '-'}</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Duración</p>
          <p className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
            <span>
              {(() => {
                const mins = court.durationMinutes ?? 60;
                const hours = Math.floor(mins / 60);
                const minutes = mins % 60;
                return `${hours}:${minutes.toString().padStart(2, '0')}h`;
              })()}
            </span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Iluminación</p>
          <p className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
            <span>{court.lighting ? 'Sí' : 'No'}</span>
          </p>
        </div>
      </div>

      {/* Pricing Tiers */}
      {court.pricingTiers && court.pricingTiers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Tarifas por franja</p>
          <div className="flex flex-wrap gap-2">
            {court.pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg text-xs"
              >
                <span className="font-medium text-slate-700">{tier.label}</span>
                <span className="text-slate-400">
                  {tier.startTime}-{tier.endTime}
                </span>
                <span className="font-bold text-green-600">
                  ${(tier.pricePerHourCents / 100).toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Sin tarifas configuradas</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={() => onEdit(court)} className="btn btn-outline flex-1 text-sm py-2.5">
          Editar
        </button>
        <button onClick={() => onDelete(court)} className="btn btn-outline text-red-600 border-red-200 hover:bg-red-50 flex-1 text-sm py-2.5">
          Eliminar
        </button>
      </div>
    </div>
  );
}

export default function CourtsPage() {
  const { currentVenue } = useVenue();
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
  const [form, setForm] = useState<CourtFormData>({
    name: '',
    sportType: '',
    surface: '',
    durationMinutes: 60,
  });

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

  const filteredCourts = courts.filter((court) => {
    const displayStatus = court.status === 'ACTIVE' ? 'ACTIVE' : court.status === 'INACTIVE' ? 'INACTIVE' : 'MAINTENANCE';
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return displayStatus === 'ACTIVE';
    if (activeTab === 'maintenance') return displayStatus === 'MAINTENANCE';
    return true;
  });

  const handleSave = async () => {
    if (!currentVenue || !form.name.trim()) return;
    setSaving(true);
    setFormError(null);

    try {
      const data: { name: string; sportType?: string; surfaceType?: string | null; durationMinutes?: number } = {
        name: form.name.trim(),
        sportType: form.sportType || undefined,
        surfaceType: form.surface.trim() || null,
        durationMinutes: form.durationMinutes,
      };

      if (editingCourt) {
        const res = await apiClient.venues.courts.update(currentVenue.id, editingCourt.id, data);
        setCourts(courts.map((c) => (c.id === editingCourt.id ? { ...c, ...res.data.data } : c)));
      } else {
        const res = await apiClient.venues.courts.create(currentVenue.id, data);
        setCourts([...courts, res.data.data as Court]);
      }

      setShowForm(false);
      setForm({ name: '', sportType: '', surface: '', durationMinutes: 60 });
      setEditingCourt(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar la cancha';
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
    });
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
      setCourts(courts.filter((c) => c.id !== courtToDelete.id));
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
          setEditingCourt(null);
          setForm({ name: '', sportType: sports[0]?.code || '', surface: '', durationMinutes: 60 });
          setFormError(null);
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
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
            <CourtCard key={court.id} court={court} index={index} onEdit={handleEdit} onDelete={handleDelete} />
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
            <p className="text-slate-500 text-sm text-center mb-6">¿Estás seguro de eliminar "{courtToDelete.name}"? Esta acción no se puede deshacer.</p>
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