import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';

export class UpsertVenueStaffUseCase {
  constructor(
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(_input: {
    venueId: string;
    userId: string;
    role?: string;
  }): Promise<{ created: boolean; staff: { id: string; venueId: string; userId: string; role: string } }> {
    const RESULT = await this._venueStaffRepository.upsertSV({
      venueId: _input.venueId,
      userId: _input.userId,
      ...(_input.role !== undefined && { role: _input.role }),
    });

    return {
      created: RESULT.created,
      staff: {
        id: RESULT.staff.id,
        venueId: RESULT.staff.venueId,
        userId: RESULT.staff.userId,
        role: RESULT.staff.role,
      },
    };
  }
}
