import { AppError } from '../../domain/errors/app_error.js';
import type { QuickMatchRepository, QuickMatchSearchDTO, QuickMatchVenueSelectionDTO } from '../../domain/ports/quick_match_repository.js';
import type { JoinMatchUseCase } from './join_match.use_case.js';

export class ConfirmMyQuickMatchProposalUseCase {
  constructor(
    private readonly _repository: QuickMatchRepository,
    private readonly _joinMatch: JoinMatchUseCase,
  ) {}

  async executeSV(_userId: string, _venueSelection?: QuickMatchVenueSelectionDTO): Promise<QuickMatchSearchDTO> {
    const SEARCH = await this._repository.findByUserIdSV(_userId);
    if (SEARCH === null || SEARCH.proposal === null || SEARCH.proposal.status !== 'PENDING') {
      throw new AppError('PROPUESTA_NO_DISPONIBLE', 'No hay una propuesta activa para confirmar.', 409);
    }
    const PROPOSAL = SEARCH.proposal;
    if (PROPOSAL.expiresAt.getTime() <= Date.now()) {
      // La lectura expira de forma perezosa en el repositorio; este guard cubre adaptadores alternativos.
      throw new AppError('PROPUESTA_VENCIDA', 'La propuesta ya venció.', 409);
    }
    if (PROPOSAL.type === 'OPEN_MATCH') {
      if (PROPOSAL.matchId === null) {
        throw new AppError('PROPUESTA_SIN_PARTIDO', 'Esta propuesta no tiene una partida confirmable.', 409);
      }
      await this._joinMatch.executeSV(PROPOSAL.matchId, _userId);
    }
    // Un grupo nuevo no aparta cancha ni genera pagos: cada jugador solo confirma interés.
    return this._repository.confirmProposalForUserSV(_userId, _venueSelection);
  }
}
