'use client';

import { useState } from 'react';
import type { Court, SportType } from '~/types/api';

// Mock data extending Court with UI-specific fields
interface CourtUI {
  id: string;
  venueId: string;
  name: string;
  sportType: SportType;
  indoor: boolean;
  lighting: boolean;
  surfaceType: string | null;
  status: string;
  pricePerHour: number;
  capacity: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

const MOCK_COURTS: CourtUI[] = [
  {
    id: '1',
    venueId: '1',
    name: 'Cancha 1',
    sportType: 'PADEL',
    indoor: true,
    lighting: true,
    surfaceType: 'Cesped artificial',
    status: 'ACTIVE',
    pricePerHour: 8500,
    capacity: 4,
    duration: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    venueId: '1',
    name: 'Cancha 2',
    sportType: 'PADEL',
    indoor: true,
    lighting: true,
    surfaceType: 'Cesped artificial',
    status: 'ACTIVE',
    pricePerHour: 8500,
    capacity: 4,
    duration: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    venueId: '1',
    name: 'Cancha 3',
    sportType: 'TENNIS',
    indoor: false,
    lighting: true,
    surfaceType: 'Dura',
    status: 'ACTIVE',
    pricePerHour: 7000,
    capacity: 4,
    duration: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    venueId: '1',
    name: 'Cancha 4',
    sportType: 'PADEL',
    indoor: true,
    lighting: true,
    surfaceType: 'Cesped artificial',
    status: 'ACTIVE', // Using ACTIVE for demo, UI shows Maintenance
    pricePerHour: 8500,
    capacity: 4,
    duration: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    venueId: '1',
    name: 'Cancha 5',
    sportType: 'TENNIS',
    indoor: false,
    lighting: false,
    surfaceType: 'Tierra batida',
    status: 'ACTIVE', // Using ACTIVE for demo, UI shows different status
    pricePerHour: 9000,
    capacity: 4,
    duration: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

type TabValue = 'all' | 'active' | 'maintenance';

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
function CourtCard({ court, index }: { court: CourtUI; index: number }) {
  const displayStatus = COURT_DISPLAY_STATUS[court.id] || 'ACTIVE';

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
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Precio</p>
          <p className="text-lg font-bold text-slate-800">
            ${court.pricePerHour.toLocaleString('es-CL')}
          </p>
          <p className="text-xs text-slate-400">hora</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Capacidad</p>
          <p className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
            <span>{court.capacity}</span>
            <span className="text-xs text-slate-500">v4</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Duración</p>
          <p className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
            <span>{court.duration / 60}</span>
            <p className="text-xs text-slate-400">hora</p>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button className="btn btn-outline flex-1 text-sm py-2.5">
          Editar
        </button>
        <button className="btn btn-outline text-red-600 border-red-200 hover:bg-red-50 flex-1 text-sm py-2.5">
          Eliminar
        </button>
      </div>
    </div>
  );
}

export default function CourtsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('active');

  const filteredCourts = MOCK_COURTS.filter((court) => {
    const displayStatus = COURT_DISPLAY_STATUS[court.id] || 'ACTIVE';
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return displayStatus === 'ACTIVE';
    if (activeTab === 'maintenance') return displayStatus === 'MAINTENANCE';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="page-heading">Mis Canchas</h1>
          <p className="text-body mt-1">Gestiona las canchas de tu club</p>
        </div>
        <button className="btn btn-primary self-start">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Cancha
        </button>
      </div>

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
      {filteredCourts.length === 0 ? (
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
            <CourtCard key={court.id} court={court} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}