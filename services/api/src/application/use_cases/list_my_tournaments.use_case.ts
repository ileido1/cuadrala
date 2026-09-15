import type {
  TournamentQueryRepository,
  ViewerTournamentItemDTO,
} from '../../domain/ports/tournament_query_repository.js';

/**
 * Los torneos del usuario actual: en los que esta inscripto, invitado, o que
 * organiza. Responde "Mis torneos" sin que el cliente tenga que cruzar tres
 * listados distintos.
 */
export class ListMyTournamentsUseCase {
  constructor(private readonly _tournamentQueryRepository: TournamentQueryRepository) {}

  async executeSV(_input: {
    actorUserId: string;
  }): Promise<{ items: ViewerTournamentItemDTO[] }> {
    const ITEMS = await this._tournamentQueryRepository.listViewerTournamentsSV(
      _input.actorUserId,
    );
    return { items: ITEMS };
  }
}
