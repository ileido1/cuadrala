import { AppError } from '../../domain/errors/app_error.js';
import type {
  TournamentDetailDTO,
  RegistrationDTO,
  TournamentQueryRepository,
} from '../../domain/ports/tournament_query_repository.js';

export class GetTournamentUseCase {
  constructor(private readonly _tournamentQueryRepository: TournamentQueryRepository) {}

  async executeSV(_tournamentId: string): Promise<{
    tournament: TournamentDetailDTO;
    registrations: RegistrationDTO[];
  }> {
    const [TOURNAMENT, REGISTRATIONS] = await Promise.all([
      this._tournamentQueryRepository.getTournamentByIdSV(_tournamentId),
      this._tournamentQueryRepository.listTournamentRegistrationsSV(_tournamentId),
    ]);

    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', `Torneo ${_tournamentId} no encontrado.`, 404);
    }

    return { tournament: TOURNAMENT, registrations: REGISTRATIONS };
  }
}