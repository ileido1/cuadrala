import { Suspense } from 'react';
import DashboardStats from './dashboard-stats';

function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="page-heading">Panel de control</h1>
        <p className="text-body mt-2">Resumen de tu actividad</p>
      </div>

      {/* Stats loading */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-secondary-200 rounded-2xl" />
              <div>
                <div className="h-3 bg-secondary-200 rounded w-20 mb-2" />
                <div className="h-8 bg-secondary-200 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts loading */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 animate-pulse">
          <div className="h-5 bg-secondary-200 rounded w-40 mb-4" />
          <div className="flex items-end gap-2 h-40">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex-1 bg-secondary-200 rounded-t" style={{ height: `${30 + Math.random() * 70}%` }} />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="card p-6 animate-pulse">
            <div className="h-5 bg-secondary-200 rounded w-40 mb-4" />
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-2 bg-secondary-200 rounded-full flex-1" />
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6 animate-pulse">
            <div className="h-4 bg-white/30 rounded w-32 mb-2" />
            <div className="h-8 bg-white/30 rounded w-24" />
          </div>
        </div>
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