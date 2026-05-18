import { AppError } from '../../domain/errors/app_error.js';
import type {
  IdType,
  VenuePaymentMethodConfig,
  VenuePaymentMethodDTO,
  VenuePaymentMethodType,
} from '../../domain/entities/payments/venue_payment_method.entity.js';
import type { VenuePaymentMethodRepository } from '../../domain/ports/venue_payment_method_repository.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';

const VALID_TYPES: VenuePaymentMethodType[] = [
  'CASH',
  'BANK_TRANSFER',
  'PAGO_MOVIL',
  'POS',
  'OTHER',
];

const VALID_ID_TYPES: IdType[] = ['V', 'E', 'P', 'J', 'G', 'R'];

function validatePaymentMethodInputSV(_input: {
  type: string;
  name?: string;
  config?: unknown;
}): { type: VenuePaymentMethodType; name: string; config: VenuePaymentMethodConfig | null } {
  if (!_input.type || !_input.name) {
    throw new AppError('VALIDACION_FALLIDA', 'type y name son requeridos.', 400);
  }
  if (!VALID_TYPES.includes(_input.type as VenuePaymentMethodType)) {
    throw new AppError(
      'VALIDACION_FALLIDA',
      `type debe ser uno de: ${VALID_TYPES.join(', ')}.`,
      400,
    );
  }

  let CONFIG: VenuePaymentMethodConfig | null = null;
  if (_input.config != null && typeof _input.config === 'object') {
    const RECORD = _input.config as Record<string, unknown>;
    const CTYPE = RECORD.type as string | undefined;
    const IDTYPE = RECORD.idType as string | undefined;
    if (IDTYPE !== undefined && !VALID_ID_TYPES.includes(IDTYPE as IdType)) {
      throw new AppError(
        'VALIDACION_FALLIDA',
        `idType debe ser uno de: ${VALID_ID_TYPES.join(', ')}.`,
        400,
      );
    }
    if (CTYPE !== undefined && CTYPE !== _input.type) {
      throw new AppError(
        'VALIDACION_FALLIDA',
        'El type en config no coincide con el type del body.',
        400,
      );
    }
    CONFIG = _input.config as VenuePaymentMethodConfig;
  }

  return {
    type: _input.type as VenuePaymentMethodType,
    name: _input.name,
    config: CONFIG,
  };
}

export class ListActiveVenuePaymentMethodsUseCase {
  constructor(
    private readonly _repository: VenuePaymentMethodRepository,
  ) {}

  async executeSV(_venueId: string): Promise<{ items: VenuePaymentMethodDTO[] }> {
    const ITEMS = await this._repository.listActiveByVenueSV(_venueId);
    return { items: ITEMS };
  }
}

export class ListAllVenuePaymentMethodsUseCase {
  constructor(
    private readonly _repository: VenuePaymentMethodRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(
    _venueId: string,
    _actorUserId: string,
  ): Promise<{ items: VenuePaymentMethodDTO[] }> {
    await assertVenueStaffSV(this._venueStaffRepository, _actorUserId, _venueId);
    const ITEMS = await this._repository.listByVenueSV(_venueId);
    return { items: ITEMS };
  }
}

export class CreateVenuePaymentMethodUseCase {
  constructor(
    private readonly _repository: VenuePaymentMethodRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(
    _venueId: string,
    _actorUserId: string,
    _body: {
      type: string;
      name: string;
      config?: unknown;
      settlementCurrency?: string;
    },
  ): Promise<VenuePaymentMethodDTO> {
    await assertVenueStaffSV(this._venueStaffRepository, _actorUserId, _venueId);
    const VALIDATED = validatePaymentMethodInputSV(_body);
    const POSITION = await this._repository.getNextPositionSV(_venueId);
    return this._repository.createSV({
      venueId: _venueId,
      type: VALIDATED.type,
      name: VALIDATED.name,
      config: VALIDATED.config,
      position: POSITION,
      ...(_body.settlementCurrency !== undefined
        ? { settlementCurrency: _body.settlementCurrency }
        : {}),
    });
  }
}

export class UpdateVenuePaymentMethodUseCase {
  constructor(
    private readonly _repository: VenuePaymentMethodRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(
    _venueId: string,
    _paymentMethodId: string,
    _actorUserId: string,
    _body: {
      type?: string;
      name?: string;
      config?: unknown;
      isActive?: boolean;
      position?: number;
      settlementCurrency?: string;
    },
  ): Promise<VenuePaymentMethodDTO> {
    await assertVenueStaffSV(this._venueStaffRepository, _actorUserId, _venueId);

    if (_body.type !== undefined && !VALID_TYPES.includes(_body.type as VenuePaymentMethodType)) {
      throw new AppError(
        'VALIDACION_FALLIDA',
        `type debe ser uno de: ${VALID_TYPES.join(', ')}.`,
        400,
      );
    }

    if (_body.config != null && typeof _body.config === 'object') {
      const IDTYPE = (_body.config as Record<string, unknown>).idType as string | undefined;
      if (IDTYPE !== undefined && !VALID_ID_TYPES.includes(IDTYPE as IdType)) {
        throw new AppError(
          'VALIDACION_FALLIDA',
          `idType debe ser uno de: ${VALID_ID_TYPES.join(', ')}.`,
          400,
        );
      }
    }

    return this._repository.updateSV(_paymentMethodId, {
      ...(_body.type !== undefined
        ? { type: _body.type as VenuePaymentMethodType }
        : {}),
      ...(_body.name !== undefined ? { name: _body.name } : {}),
      ...(_body.config !== undefined
        ? { config: _body.config as VenuePaymentMethodConfig }
        : {}),
      ...(_body.isActive !== undefined ? { isActive: _body.isActive } : {}),
      ...(_body.position !== undefined ? { position: _body.position } : {}),
      ...(_body.settlementCurrency !== undefined
        ? { settlementCurrency: _body.settlementCurrency }
        : {}),
    });
  }
}

export class DeleteVenuePaymentMethodUseCase {
  constructor(
    private readonly _repository: VenuePaymentMethodRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(
    _venueId: string,
    _paymentMethodId: string,
    _actorUserId: string,
  ): Promise<void> {
    await assertVenueStaffSV(this._venueStaffRepository, _actorUserId, _venueId);
    await this._repository.deleteSV(_paymentMethodId);
  }
}

async function assertVenueStaffSV(
  _venueStaffRepository: VenueStaffRepository,
  _userId: string,
  _venueId: string,
): Promise<void> {
  const IS_STAFF = await _venueStaffRepository.isUserStaffOfVenueSV(_userId, _venueId);
  if (!IS_STAFF) {
    throw new AppError(
      'NO_AUTORIZADO',
      'Solo el staff de la sede puede gestionar los métodos de pago.',
      403,
    );
  }
}
