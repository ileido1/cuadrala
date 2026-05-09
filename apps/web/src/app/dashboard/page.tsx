import { Suspense } from 'react';
import DashboardStats from './dashboard-stats';

function DashboardLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-16" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-16" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel de control</h1>
      <Suspense fallback={<DashboardLoading />}>
        <DashboardStats />
      </Suspense>
    </div>
  );
}
