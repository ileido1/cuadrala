'use client';

import { PaymentsList } from '~/components/payments/payments-list';

// TODO: Connect to venue context/selector once implemented
// Hardcoded venueId for development - replace with useVenue() hook
const DEVELOPMENT_VENUE_ID = 'venue_dev_placeholder';

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="page-heading">Pagos Pendientes</h1>
        <p className="text-body mt-1">Lista de transacciones pendientes de pago</p>
      </div>

      <div className="card overflow-hidden animate-fade-in stagger-1">
        <PaymentsList venueId={DEVELOPMENT_VENUE_ID} />
      </div>
    </div>
  );
}