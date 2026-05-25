/** Estados de transacción tal como vienen de la API (Prisma enum). */
export type ApiTransactionStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REJECTED'
  | string;

export function isPendingApiStatus(_status: string): boolean {
  return _status.toUpperCase() === 'PENDING';
}

export function formatTransactionStatusLabel(_status: string): string {
  switch (_status.toUpperCase()) {
    case 'CONFIRMED':
      return 'Pagado';
    case 'PENDING':
      return 'Pendiente';
    case 'CANCELLED':
      return 'Cancelado';
    case 'REJECTED':
      return 'Rechazado';
    default:
      return _status;
  }
}

export function transactionStatusBadgeClass(_status: string): string {
  switch (_status.toUpperCase()) {
    case 'CONFIRMED':
      return 'badge-success';
    case 'PENDING':
      return 'badge-warning';
    case 'REJECTED':
    case 'CANCELLED':
      return 'badge-error';
    default:
      return 'badge-warning';
  }
}
