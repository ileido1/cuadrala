import type { VenueStaffDTO, VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';

export class ListVenueStaffUseCase {
  constructor(
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(_input: {
    venueId: string;
  }): Promise<{ items: VenueStaffDTO[] }> {
    const ITEMS = await this._venueStaffRepository.listByVenueIdSV(_input.venueId);
    return { items: ITEMS };
  }
}
