import { Suspense } from 'react';
import DashboardStats from './dashboard-stats';

function DashboardLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      <div className="card p-6 animate-pulse">
        <div className="h-4 bg-secondary-200 rounded w-28 mb-3" />
        <div className="h-8 bg-secondary-200 rounded w-16" />
      </div>
      <div className="card p-6 animate-pulse">
        <div className="h-4 bg-secondary-200 rounded w-28 mb-3" />
        <div className="h-8 bg-secondary-200 rounded w-16" />
      </div>
      <div className="card p-6 animate-pulse">
        <div className="h-4 bg-secondary-200 rounded w-28 mb-3" />
        <div className="h-8 bg-secondary-200 rounded w-16" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="page-heading">Panel de control</h1>
        <p className="text-body mt-2">Resumen de tu actividad</p>
      </div>
      <Suspense fallback={<DashboardLoading />}>
        <DashboardStats />
      </Suspense>
    </div>
  );
}