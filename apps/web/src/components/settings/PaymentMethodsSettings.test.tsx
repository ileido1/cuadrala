// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentMethodsSettings } from './PaymentMethodsSettings';

const { createMock, deleteMock, listAllMock, updateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  deleteMock: vi.fn(),
  listAllMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('~/contexts/venue-context', () => ({
  useVenue: () => ({ currentVenue: { id: 'venue-1' } }),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    venues: {
      paymentMethods: {
        create: createMock,
        delete: deleteMock,
        listAll: listAllMock,
        update: updateMock,
      },
    },
  },
}));

const USD_METHOD = {
  id: 'method-1',
  venueId: 'venue-1',
  type: 'CASH',
  name: 'Efectivo',
  config: null,
  settlementCurrency: 'USD',
  isActive: true,
  position: 0,
};

describe('PaymentMethodsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAllMock.mockResolvedValue({ data: { data: { items: [USD_METHOD] } } });
    updateMock.mockResolvedValue({
      data: {
        data: { ...USD_METHOD, settlementCurrency: 'BS' },
      },
    });
  });

  afterEach(cleanup);

  it('persists settlement currency through the dedicated payment method action', async () => {
    render(<PaymentMethodsSettings defaultSettlementCurrency="USD" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    const currencySelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(currencySelect, { target: { value: 'BS' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar método de pago' }),
    );

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        'venue-1',
        'method-1',
        expect.objectContaining({ settlementCurrency: 'BS' }),
      );
    });
    expect(await screen.findByText('Método de pago guardado')).toBeTruthy();
  });

  //? Pago Móvil liquida siempre en bolívares: la API rechaza otra moneda, así
  //? que el formulario la fija en BS en vez de dejar elegir.
  it('locks Pago Movil settlement currency to BS', async () => {
    render(<PaymentMethodsSettings defaultSettlementCurrency="USD" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    const [typeSelect, currencySelect] = screen.getAllByRole('combobox');
    fireEvent.change(typeSelect!, { target: { value: 'PAGO_MOVIL' } });

    expect((currencySelect as HTMLSelectElement).value).toBe('BS');
    expect((currencySelect as HTMLSelectElement).disabled).toBe(true);
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar método de pago' }),
    );
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        'venue-1',
        'method-1',
        expect.objectContaining({ type: 'PAGO_MOVIL', settlementCurrency: 'BS' }),
      );
    });
  });

  //? Un Pago Móvil viejo guardado en USD se corrige a BS al editarlo; si no,
  //? guardar mandaría USD y la API lo rechazaría.
  it('saves a legacy Pago Movil stored in USD as BS', async () => {
    listAllMock.mockResolvedValue({
      data: { data: { items: [{ ...USD_METHOD, type: 'PAGO_MOVIL', name: 'Pago Móvil' }] } },
    });
    render(<PaymentMethodsSettings defaultSettlementCurrency="USD" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar método de pago' }),
    );

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        'venue-1',
        'method-1',
        expect.objectContaining({ settlementCurrency: 'BS' }),
      );
    });
  });
});
