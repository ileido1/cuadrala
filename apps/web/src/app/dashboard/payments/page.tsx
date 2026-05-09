'use client';

import { PaymentsList } from '~/components/payments/payments-list';

// TODO: Connect to venue context/selector once implemented
// Hardcoded venueId for development - replace with useVenue() hook
const DEVELOPMENT_VENUE_ID = 'venue_dev_placeholder';

export default function PaymentsPage() {
  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pagos Pendientes</h1>
        <p className="text-gray-500 mt-1">
          Lista de transacciones pendientes de pago
        </p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <PaymentsList venueId={DEVELOPMENT_VENUE_ID} />
      </div>
    </main>
  );
}
