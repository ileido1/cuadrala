import { AppError } from '../../domain/errors/app_error.js';
import type {
  TournamentDetailDTO,
  RegistrationDTO,
  TournamentQueryRepository,
} from '../../domain/ports/tournament_query_repository.js';
import type { AssertTournamentViewAccessUseCase } from './assert_tournament_view_access.use_case.js';

export type GetTournamentInput = {
  readonly tournamentId: string;
  /** `undefined` cuando la request no trae sesión (ruta con `optionalAuth`). */
  readonly actorUserId?: string;
};

export class GetTournamentUseCase {
  constructor(
    private readonly _tournamentQueryRepository: TournamentQueryRepository,
    private readonly _assertTournamentViewAccess: AssertTournamentViewAccessUseCase,
  ) {}

  async executeSV(_input: GetTournamentInput): Promise<{
    tournament: TournamentDetailDTO;
    registrations: RegistrationDTO[];
  }> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentQueryRepository.getTournamentByIdSV(
      _input.tournamentId,
    );
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', `Torneo ${_input.tournamentId} no encontrado.`, 404);
    }

    //? 2. Si el torneo es PRIVATE, solo organizador/staff/participante pueden verlo
    await this._assertTournamentViewAccess.executeSV({
      tournamentId: _input.tournamentId,
      actorUserId: _input.actorUserId,
      visibility: TOURNAMENT.visibility,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 3. Recién ahora traer las inscripciones (evita el round-trip extra si se rechazó el acceso)
    const REGISTRATIONS = await this._tournamentQueryRepository.listTournamentRegistrationsSV(
      _input.tournamentId,
    );

    return { tournament: TOURNAMENT, registrations: REGISTRATIONS };
  }
}