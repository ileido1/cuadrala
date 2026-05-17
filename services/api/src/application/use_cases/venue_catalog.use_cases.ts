import { AppError } from '../../domain/errors/app_error.js';
import type {
  CreateVenueInputDTO,
  PageDTO,
  VenueRepository,
} from '../../domain/ports/venue_repository.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';

export class ListVenuesUseCase {
  constructor(private readonly _venueRepository: VenueRepository) {}

  async executeSV(_input: {
    page: number;
    limit: number;
    near?: string;
    radiusKm: number;
  }) {
    const PAGE: PageDTO = { page: _input.page, limit: _input.limit };

    if (_input.near === undefined) {
      return this._venueRepository.listVenuesSV(PAGE);
    }

    const [LAT_STR, LNG_STR] = _input.near.split(',');
    const LAT = Number(LAT_STR);
    const LNG = Number(LNG_STR);

    return this._venueRepository.listVenuesNearSV({
      ...PAGE,
      lat: LAT,
      lng: LNG,
      radiusKm: _input.radiusKm,
    });
  }
}

export class ListMyVenuesUseCase {
  constructor(private readonly _venueRepository: VenueRepository) {}

  async executeSV(_userId: string) {
    const ITEMS = await this._venueRepository.listVenuesForUserSV(_userId);
    return {
      items: ITEMS,
      pageInfo: { page: 1, limit: ITEMS.length, total: ITEMS.length },
    };
  }
}

export class CreateVenueUseCase {
  constructor(
    private readonly _venueRepository: VenueRepository,
    private readonly _userRepository: UserRepository,
  ) {}

  async executeSV(_input: CreateVenueInputDTO) {
    if (_input.ownerUserId !== undefined && _input.ownerUserId !== null) {
      const USER = await this._userRepository.findByIdSV(_input.ownerUserId);
      if (USER === null) {
        throw new AppError(
          'USUARIO_NO_ENCONTRADO',
          'El usuario indicado como propietario no existe.',
          400,
        );
      }
    }

    return this._venueRepository.createVenueSV(_input);
  }
}

export class GetVenueDetailUseCase {
  constructor(private readonly _venueRepository: VenueRepository) {}

  async executeSV(_venueId: string) {
    const VENUE = await this._venueRepository.getVenueDetailSV(_venueId);
    if (VENUE === null) {
      throw new AppError('NO_ENCONTRADO', 'Sede no encontrada.', 404);
    }
    return VENUE;
  }
}

export class GetVenuePaymentInfoUseCase {
  constructor(private readonly _venueRepository: VenueRepository) {}

  async executeSV(_venueId: string) {
    const VENUE = await this._venueRepository.getPaymentInfoWithNameSV(_venueId);
    if (VENUE === null) {
      throw new AppError('NO_ENCONTRADO', 'Sede no encontrada.', 404);
    }
    return VENUE;
  }
}
