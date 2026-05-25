import type { PaymentMethodType } from '~/types/api';

const TYPE_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia bancaria',
  PAGO_MOVIL: 'Pago móvil',
  POS: 'POS (Tarjeta)',
  OTHER: 'Otro',
  TRANSFER: 'Transferencia bancaria',
};

export function formatPaymentMethodTypeLabel(
  _type: string | null | undefined,
): string | null {
  if (_type === null || _type === undefined || _type === '') return null;
  return TYPE_LABELS[_type.toUpperCase()] ?? _type;
}

export function formatPaymentMethodDisplayName(
  _tx: {
    paymentMethodName?: string | null;
    paymentMethodType?: string | null;
  },
): string {
  if (_tx.paymentMethodName !== null && _tx.paymentMethodName !== undefined) {
    return _tx.paymentMethodName;
  }
  const fromType = formatPaymentMethodTypeLabel(_tx.paymentMethodType);
  return fromType ?? 'No registrado';
}

export function paymentMethodDetailRows(
  _type: string | null | undefined,
  _config: Record<string, unknown> | null | undefined,
): Array<{ label: string; value: string }> {
  if (_config === null || _config === undefined) return [];
  const rows: Array<{ label: string; value: string }> = [];
  const add = (_label: string, _key: string) => {
    const raw = _config[_key];
    if (raw === null || raw === undefined) return;
    const text = String(raw).trim();
    if (text.length === 0) return;
    rows.push({ label: _label, value: text });
  };

  const type = (_type ?? '').toUpperCase();
  if (type === 'BANK_TRANSFER' || type === 'TRANSFER') {
    add('Banco', 'bank');
    add('Cuenta', 'accountNumber');
    add('Titular', 'holderName');
  } else if (type === 'PAGO_MOVIL') {
    add('Banco', 'bank');
    add('Teléfono', 'phoneNumber');
    add('Cédula', 'idNumber');
  } else if (type === 'POS' || type === 'OTHER') {
    add('Referencia', 'reference');
  }
  return rows;
}

export function formatScheduledAtLabel(
  _iso: string,
  _timezone = 'America/Caracas',
): string {
  try {
    return new Intl.DateTimeFormat('es-VE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: _timezone,
    }).format(new Date(_iso));
  } catch {
    return _iso;
  }
}

export type { PaymentMethodType };
