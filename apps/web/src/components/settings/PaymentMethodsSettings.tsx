'use client';

import { useEffect, useState } from 'react';
import { useVenue } from '~/contexts/venue-context';
import { apiClient } from '~/lib/api-client';
import {
  CURRENCY_OPTIONS,
  currencySymbol,
  resolveCurrencyCode,
  type CurrencyCode,
} from '~/lib/format-money';
import type { PaymentMethodType, VenuePaymentMethod } from '~/types/api';

type PaymentMethodFormData = {
  id?: string;
  type: PaymentMethodType;
  name: string;
  settlementCurrency: CurrencyCode;
  // BANK_TRANSFER
  accountNumber?: string;
  bank?: string;
  idType?: string;
  idNumber?: string;
  // PAGO_MOVIL
  phoneNumber?: string;
  // POS / OTHER
  reference?: string;
};

const METHOD_TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'BANK_TRANSFER', label: 'Transferencia' },
  { value: 'PAGO_MOVIL', label: 'Pago Móvil' },
  { value: 'POS', label: 'POS (Tarjeta)' },
  { value: 'OTHER', label: 'Otro' },
];

const ID_TYPES = [
  { value: 'V', label: 'V' },
  { value: 'E', label: 'E' },
  { value: 'P', label: 'P' },
  { value: 'J', label: 'J' },
  { value: 'G', label: 'G' },
  { value: 'R', label: 'R' },
];

function buildConfig(form: PaymentMethodFormData): Record<string, string> {
  const config: Record<string, string> = {};
  if (form.type === 'BANK_TRANSFER') {
    if (form.accountNumber) config.accountNumber = form.accountNumber;
    if (form.bank) config.bank = form.bank;
    if (form.idType) config.idType = form.idType;
    if (form.idNumber) config.idNumber = form.idNumber;
  } else if (form.type === 'PAGO_MOVIL') {
    if (form.phoneNumber) config.phoneNumber = form.phoneNumber;
    if (form.idType) config.idType = form.idType;
    if (form.idNumber) config.idNumber = form.idNumber;
    if (form.bank) config.bank = form.bank;
  } else if (form.type === 'POS' || form.type === 'OTHER') {
    if (form.reference) config.reference = form.reference;
  }
  return config;
}

function configSummary(method: VenuePaymentMethod): string | null {
  const config = method.config as Record<string, string> | null;
  if (!config) return null;
  if (method.type === 'BANK_TRANSFER') {
    const parts = [config.bank, config.accountNumber].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
  }
  if (method.type === 'PAGO_MOVIL') {
    const parts = [config.bank, config.phoneNumber].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
  }
  if (method.type === 'POS' || method.type === 'OTHER') {
    return config.reference ?? null;
  }
  return null;
}

function buildFormFromMethod(
  method: VenuePaymentMethod,
  defaultCurrency: CurrencyCode,
): PaymentMethodFormData {
  const base = {
    id: method.id,
    type: method.type,
    name: method.name,
    settlementCurrency: resolveCurrencyCode(
      method.settlementCurrency,
      defaultCurrency,
    ),
  };
  const config = method.config as Record<string, string> | null;
  if (method.type === 'BANK_TRANSFER') {
    return {
      ...base,
      accountNumber: config?.accountNumber,
      bank: config?.bank,
      idType: config?.idType,
      idNumber: config?.idNumber,
    };
  }
  if (method.type === 'PAGO_MOVIL') {
    return {
      ...base,
      phoneNumber: config?.phoneNumber,
      idType: config?.idType,
      idNumber: config?.idNumber,
      bank: config?.bank,
    };
  }
  if (method.type === 'POS' || method.type === 'OTHER') {
    return { ...base, reference: config?.reference };
  }
  return base as PaymentMethodFormData;
}

interface PaymentMethodsSettingsProps {
  defaultSettlementCurrency: CurrencyCode;
}

export function PaymentMethodsSettings({
  defaultSettlementCurrency,
}: PaymentMethodsSettingsProps) {
  const { currentVenue } = useVenue();
  const [methods, setMethods] = useState<VenuePaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentMethodFormData>({
    type: 'CASH',
    name: '',
    settlementCurrency: defaultSettlementCurrency,
  });

  useEffect(() => {
    if (!currentVenue) return;
    apiClient.venues.paymentMethods
      .listAll(currentVenue.id)
      .then((r) => setMethods(r.data.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentVenue]);

  useEffect(() => {
    if (!showForm && !editingId) {
      setForm((prev) => ({
        ...prev,
        settlementCurrency: defaultSettlementCurrency,
      }));
    }
  }, [defaultSettlementCurrency, showForm, editingId]);

  const resetForm = () => {
    setForm({
      type: 'CASH',
      name: '',
      settlementCurrency: defaultSettlementCurrency,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (method: VenuePaymentMethod) => {
    setForm(buildFormFromMethod(method, defaultSettlementCurrency));
    setEditingId(method.id);
    setShowForm(true);
  };

  const handleToggleActive = async (method: VenuePaymentMethod) => {
    if (!currentVenue) return;
    try {
      const res = await apiClient.venues.paymentMethods.update(
        currentVenue.id,
        method.id,
        { isActive: !method.isActive },
      );
      setMethods((prev) =>
        prev.map((m) => (m.id === method.id ? res.data.data : m)),
      );
    } catch {
      setError('No se pudo actualizar el estado.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este medio de pago?')) return;
    try {
      await apiClient.venues.paymentMethods.delete(currentVenue!.id, id);
      setMethods((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError('No se pudo eliminar.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVenue) return;
    if (!form.name.trim()) {
      setError('El nombre es requerido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        type: form.type,
        name: form.name.trim(),
        settlementCurrency: form.settlementCurrency,
        config:
          Object.keys(buildConfig(form)).length > 0
            ? buildConfig(form)
            : undefined,
      };
      if (editingId) {
        const res = await apiClient.venues.paymentMethods.update(
          currentVenue.id,
          editingId,
          payload,
        );
        setMethods((prev) =>
          prev.map((m) => (m.id === editingId ? res.data.data : m)),
        );
      } else {
        const res = await apiClient.venues.paymentMethods.create(
          currentVenue.id,
          payload,
        );
        setMethods((prev) => [...prev, res.data.data]);
      }
      resetForm();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('No se pudo guardar el medio de pago.');
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (patch: Partial<PaymentMethodFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  if (loading) return <div className="text-sm text-muted">Cargando...</div>;

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        </div>
        <h2 className="section-heading">Medios de Pago</h2>
      </div>
      <p className="text-sm text-muted mb-6">
        Cada medio puede liquidar en una moneda distinta (por ejemplo efectivo
        en Bs. y transferencia en US$).
      </p>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded bg-green-50 text-green-700 text-sm">
          Guardado correctamente
        </div>
      )}

      <div className="space-y-3 mb-6">
        {methods.length === 0 && !showForm && (
          <p className="text-sm text-muted">
            No hay medios de pago configurados.
          </p>
        )}
        {methods.map((method) => {
          const summary = configSummary(method);
          const settlement = resolveCurrencyCode(
            method.settlementCurrency,
            defaultSettlementCurrency,
          );
          return (
            <div
              key={method.id}
              className="flex items-start justify-between gap-4 p-3 rounded-lg border border-outline hover:bg-surface-container transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-secondary-700">
                    {method.name}
                  </span>
                  <span className="text-xs text-muted px-2 py-0.5 rounded-full bg-surface-container">
                    {METHOD_TYPES.find((t) => t.value === method.type)?.label}
                  </span>
                  <span className="text-xs font-medium text-primary px-2 py-0.5 rounded-full bg-primary-50">
                    Liquida en {currencySymbol(settlement)} {settlement}
                  </span>
                  {!method.isActive && (
                    <span className="text-xs text-muted px-2 py-0.5 rounded-full bg-gray-100">
                      Inactivo
                    </span>
                  )}
                </div>
                {summary && (
                  <p className="text-xs text-muted truncate">{summary}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(method)}
                  className="text-xs text-secondary-600 hover:underline"
                >
                  {method.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(method)}
                  className="text-xs text-primary hover:underline"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(method.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-4 rounded-lg border border-outline bg-surface-container"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Tipo
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  updateForm({ type: e.target.value as PaymentMethodType })
                }
                className="w-full rounded border border-outline px-3 py-2 text-sm"
              >
                {METHOD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="Nombre de comercio o persona"
                className="w-full rounded border border-outline px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Moneda de liquidación
              </label>
              <select
                value={form.settlementCurrency}
                onChange={(e) =>
                  updateForm({
                    settlementCurrency: e.target.value as CurrencyCode,
                  })
                }
                className="w-full rounded border border-outline px-3 py-2 text-sm"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.type === 'BANK_TRANSFER' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Banco
                </label>
                <input
                  type="text"
                  value={form.bank ?? ''}
                  onChange={(e) => updateForm({ bank: e.target.value })}
                  className="w-full rounded border border-outline px-3 py-2 text-sm"
                  placeholder="Banesco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  N° de Cuenta
                </label>
                <input
                  type="text"
                  value={form.accountNumber ?? ''}
                  onChange={(e) =>
                    updateForm({ accountNumber: e.target.value })
                  }
                  className="w-full rounded border border-outline px-3 py-2 text-sm"
                  placeholder="0123-4567-8901"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Tipo de ID
                </label>
                <select
                  value={form.idType ?? ''}
                  onChange={(e) => updateForm({ idType: e.target.value })}
                  className="w-full rounded border border-outline px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar</option>
                  {ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  N° de ID
                </label>
                <input
                  type="text"
                  value={form.idNumber ?? ''}
                  onChange={(e) => updateForm({ idNumber: e.target.value })}
                  className="w-full rounded border border-outline px-3 py-2 text-sm"
                  placeholder="V-30123123"
                />
              </div>
            </div>
          )}

          {form.type === 'PAGO_MOVIL' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Banco
                </label>
                <input
                  type="text"
                  value={form.bank ?? ''}
                  onChange={(e) => updateForm({ bank: e.target.value })}
                  className="w-full rounded border border-outline px-3 py-2 text-sm"
                  placeholder="Banesco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={form.phoneNumber ?? ''}
                  onChange={(e) =>
                    updateForm({ phoneNumber: e.target.value })
                  }
                  className="w-full rounded border border-outline px-3 py-2 text-sm"
                  placeholder="0412-123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Tipo de ID
                </label>
                <select
                  value={form.idType ?? ''}
                  onChange={(e) => updateForm({ idType: e.target.value })}
                  className="w-full rounded border border-outline px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar</option>
                  {ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  N° de ID
                </label>
                <input
                  type="text"
                  value={form.idNumber ?? ''}
                  onChange={(e) => updateForm({ idNumber: e.target.value })}
                  className="w-full rounded border border-outline px-3 py-2 text-sm"
                  placeholder="V-30123123"
                />
              </div>
            </div>
          )}

          {(form.type === 'POS' || form.type === 'OTHER') && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Referencia
              </label>
              <input
                type="text"
                value={form.reference ?? ''}
                onChange={(e) => updateForm({ reference: e.target.value })}
                className="w-full rounded border border-outline px-3 py-2 text-sm"
                placeholder="Número de terminal, voucher, etc."
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary text-sm"
            >
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-secondary text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn btn-outline text-sm"
        >
          + Agregar medio de pago
        </button>
      )}
    </div>
  );
}
