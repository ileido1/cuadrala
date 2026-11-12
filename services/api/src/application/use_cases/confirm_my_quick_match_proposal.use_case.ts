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
      try {
        await this._joinMatch.executeSV(PROPOSAL.matchId, _userId);
      } catch (_error) {
        //? #92: reintento seguro — un intento anterior puede haber unido al
        //? usuario al partido y fallado antes de confirmar la propuesta. Sin
        //? esto, reintentar queda atascado para siempre en 409 YA_UNIDO.
        if (!(_error instanceof AppError) || _error.code !== 'YA_UNIDO') throw _error;
      }
    }
    //? Grupo nuevo: cada jugador acepta el ready check; al aceptar el 4º, el
    //? repositorio crea el partido y reserva la primera cancha libre (S4).
    return this._repository.confirmProposalForUserSV(_userId, _venueSelection);
  }
}
