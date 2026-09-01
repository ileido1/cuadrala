import { AppError } from '../../domain/errors/app_error.js';
import type {
  MatchCrudRepository,
  MatchDetailDTO,
} from '../../domain/ports/match_crud_repository.js';
import type { MatchQueryRepository } from '../../domain/ports/match_query_repository.js';

/**
 * Cancelación administrativa de un partido.
 *
 * Se separa de `CancelMatchUseCase` porque la política de autorización es
 * distinta: acá no hay usuario actor —el router valida un secreto de
 * operación— así que no se verifica que quien cancela sea el organizador.
 * La transición de estado sí es la misma.
 */
export class AdminCancelMatchUseCase {
  constructor(
    private readonly _matchQueryRepository: MatchQueryRepository,
    private readonly _matchCrudRepository: MatchCrudRepository,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Cancela un partido que esté agendado o en curso.
   * @param {string} _matchId - Identificador del partido
   * @return {Promise<MatchDetailDTO>} Partido ya cancelado
   * @throws {AppError} 404 si no existe, 409 si su estado no admite cancelación
   */
  async executeSV(_matchId: string): Promise<MatchDetailDTO> {
    //? 1. El partido tiene que existir.
    const MATCH = await this._matchQueryRepository.getMatchByIdSV(_matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    //? 2. Solo se cancela lo que todavía no terminó ni fue cancelado antes.
    if (MATCH.status !== 'SCHEDULED' && MATCH.status !== 'IN_PROGRESS') {
      throw new AppError(
        'PARTIDO_NO_CANCELABLE',
        'No se puede cancelar el partido en su estado actual.',
        409,
      );
    }

    //? 3. Transición de estado.
    return this._matchCrudRepository.cancelMatchSV(_matchId);
  }
}
