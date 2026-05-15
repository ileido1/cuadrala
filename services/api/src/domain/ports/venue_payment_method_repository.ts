import type {
  VenuePaymentMethodDTO,
  VenuePaymentMethodType,
} from '../entities/venue_payment_method.entity.js';

export interface VenuePaymentMethodRepository {
  /** Lista todos los métodos activos de un venue, ordenados por position. */
  listActiveByVenueSV(_venueId: string): Promise<VenuePaymentMethodDTO[]>;

  /** Lista todos los métodos de un venue (incluye inactivos), ordenados por position. */
  listByVenueSV(_venueId: string): Promise<VenuePaymentMethodDTO[]>;

  /** Obtiene un método por ID. */
  findByIdSV(_id: string): Promise<VenuePaymentMethodDTO | null>;

  /** Crea un nuevo método de pago para un venue. */
  createSV(_data: {
    venueId: string;
    type: VenuePaymentMethodType;
    name: string;
    config: VenuePaymentMethodDTO['config'];
    position: number;
  }): Promise<VenuePaymentMethodDTO>;

  /** Actualiza un método de pago. */
  updateSV(_id: string, _data: {
    type?: VenuePaymentMethodType;
    name?: string;
    config?: VenuePaymentMethodDTO['config'];
    isActive?: boolean;
    position?: number;
  }): Promise<VenuePaymentMethodDTO>;

  /** Elimina un método de pago. */
  deleteSV(_id: string): Promise<void>;

  /** Obtiene la próxima position disponible para el venue. */
  getNextPositionSV(_venueId: string): Promise<number>;
}
