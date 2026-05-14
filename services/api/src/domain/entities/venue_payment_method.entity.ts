/** Tipos de medio de pago configurables por venue. */
export type VenuePaymentMethodType = 'CASH' | 'BANK_TRANSFER' | 'PAGO_MOVIL' | 'POS' | 'OTHER';

/** Tipos de identificación venezolanos. */
export type IdType = 'V' | 'E' | 'P' | 'J' | 'G' | 'R';

/** Configuración según tipo de medio de pago. */
export type VenuePaymentMethodConfig =
  | { type: 'CASH' }
  | { type: 'BANK_TRANSFER'; accountNumber: string; bank: string; idType: IdType; idNumber: string }
  | { type: 'PAGO_MOVIL'; phoneNumber: string; idType: IdType; idNumber: string; bank: string }
  | { type: 'POS'; reference: string }
  | { type: 'OTHER'; reference: string };

/** DTO de medio de pago de venue para consumo por capas superiores. */
export type VenuePaymentMethodDTO = {
  readonly id: string;
  readonly venueId: string;
  readonly type: VenuePaymentMethodType;
  readonly name: string;
  readonly config: VenuePaymentMethodConfig | null;
  readonly isActive: boolean;
  readonly position: number;
};
