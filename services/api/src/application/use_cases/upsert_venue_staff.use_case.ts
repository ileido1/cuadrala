import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import { assertVenueStaffSV } from '../helpers/assert_venue_court_access.js';

export class UpsertVenueStaffUseCase {
  constructor(
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Registra o actualiza un staff de la sede. Solo el staff
   * actual de esa sede puede agregar o editar otro staff (issue #67). El
   * owner de la sede ya queda como VenueStaff role OWNER al crearse la sede
   * (ver createVenueSV), asi que no se necesita una excepcion de bootstrap
   * aparte: assertVenueStaffSV ya lo cubre.
   * @throws {AppError} 403 si el actor no es staff de la sede
   */
  async executeSV(_input: {
    actorUserId: string;
    venueId: string;
    userId: string;
    role?: string;
  }): Promise<{ created: boolean; staff: { id: string; venueId: string; userId: string; role: string } }> {
    await assertVenueStaffSV(_input.actorUserId, _input.venueId, this._venueStaffRepository);

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
