import type { CreateQuickMatchProposalNotificationEventUseCase } from './create_quick_match_proposal_notification_event.use_case.js';
import type { QuickMatchNotificationKind } from '../../domain/notifications/notification_content.js';
import { QUICK_MATCH_HOLD_MS } from '../../domain/ports/quick_match_repository.js';
import type { QuickMatchRefillDTO, QuickMatchRepository, QuickMatchSearchDTO } from '../../domain/ports/quick_match_repository.js';

const GROUP_SIZE = 4;

export class MatchQuickMatchUseCase {
  constructor(private readonly _repository: QuickMatchRepository, private readonly _notifyProposal: CreateQuickMatchProposalNotificationEventUseCase | null = null) {}

  async executeSV(_search: QuickMatchSearchDTO, _userId?: string): Promise<QuickMatchSearchDTO> {
    const PROPOSAL = _search.proposal;
    //? 1. Invitación por disponibilidad sin responder: se espera al invitado (S12)
    if (_search.invitedByAvailability && PROPOSAL?.status === 'PENDING') return _search;
    //? 2. Miembro de un lobby o de un ready check sin partido: se completan los cupos
    //? (buscadores, después invitaciones). playerIds puede estar desactualizado en
    //? grupos heredados: el repositorio decide si hay cupo.
    if (PROPOSAL?.type === 'NEW_GROUP' && typeof PROPOSAL.groupKey === 'string' && ['LOBBY', 'PENDING', 'CONFIRMED'].includes(PROPOSAL.status) && PROPOSAL.matchId === null) {
      //? Un buscador solo (lobby de 1) sigue pudiendo recibir una partida abierta (S8)
      if (PROPOSAL.status === 'LOBBY' && PROPOSAL.playerIds.length <= 1) {
        const OPEN = await this.tryOpenMatchSV(_search, _userId);
        if (OPEN !== null) return OPEN;
      }
      const REFILL = await this.refillGroupSV(PROPOSAL.groupKey, _userId);
      if (REFILL === null || _userId === undefined) return _search;
      return (await this._repository.findByUserIdSV(_userId)) ?? _search;
    }
    if (_search.status !== 'SEARCHING') return _search;
    //? 3. Partida abierta compatible (S8, sin cambios)
    const OPEN = await this.tryOpenMatchSV(_search, _userId);
    if (OPEN !== null) return OPEN;
    if (_userId === undefined) return this._repository.markNoMatchYetSV(_search.id);
    //? 4. Un grupo con cupo (ready check, después lobby) tiene prioridad sobre uno nuevo (S1/S5)
    const OPEN_GROUP_KEY = await this._repository.findOpenGroupKeySV(_search);
    if (OPEN_GROUP_KEY !== null) {
      const REFILL = await this.refillGroupSV(OPEN_GROUP_KEY, _userId);
      if (REFILL?.addedUserIds.includes(_userId)) return (await this._repository.findByUserIdSV(_userId)) ?? _search;
    }
    //? 5. Lobby nuevo con otro buscador solo, o de 1 si no hay nadie; después se invita
    //? por disponibilidad (S1/S12)
    const LOBBY = await this._repository.formLobbySV(_search);
    if (LOBBY !== null) {
      await this.notifyRefillSV(LOBBY, _userId);
      await this.refillGroupSV(LOBBY.groupKey, _userId);
      return (await this._repository.findByUserIdSV(_userId)) ?? _search;
    }
    //? 6. Un grupo con cupo pudo formarse mientras tanto (`formLobbySV` no arma otro): se
    //? intenta sumarse una vez más
    const LATE_GROUP_KEY = await this._repository.findOpenGroupKeySV(_search);
    if (LATE_GROUP_KEY !== null) {
      const REFILL = await this.refillGroupSV(LATE_GROUP_KEY, _userId);
      if (REFILL?.addedUserIds.includes(_userId)) return (await this._repository.findByUserIdSV(_userId)) ?? _search;
    }
    //? 7. Solo en la cola. Si otro buscador lo sumó a un grupo entretanto, se devuelve eso.
    return this._repository.markNoMatchYetSV(_search.id);
  }

  /** Oferta de partida abierta compatible, si la búsqueda la acepta (S8). */
  private async tryOpenMatchSV(_search: QuickMatchSearchDTO, _userId?: string): Promise<QuickMatchSearchDTO | null> {
    if (!_search.includeOpenMatches) return null;
    const CANDIDATE = await this._repository.findOpenCandidateSV(_search);
    if (CANDIDATE === null) return null;
    const OPEN = await this._repository.createOpenProposalSV(_search.id, CANDIDATE, new Date(Date.now() + QUICK_MATCH_HOLD_MS));
    if (OPEN !== null) await this.notifyOpenMatchSV(OPEN, _userId);
    return OPEN;
  }

  /** Suma jugadores a los cupos libres del grupo y avisa a quien corresponde. */
  async refillGroupSV(_groupKey: string, _triggerUserId?: string): Promise<QuickMatchRefillDTO | null> {
    const REFILL = await this._repository.refillGroupSV(_groupKey, new Date(Date.now() + QUICK_MATCH_HOLD_MS));
    if (REFILL !== null) await this.notifyRefillSV(REFILL, _triggerUserId);
    return REFILL;
  }

  /**
   * Avisos después de aceptar (`/proposal/confirm`): si un invitado entró al
   * lobby, se avisa a los que ya estaban (S13); si con él se llegó a 4, el ready
   * check a los otros 3 (S2).
   */
  async notifyAfterAcceptSV(_search: QuickMatchSearchDTO, _userId: string): Promise<void> {
    const PROPOSAL = _search.proposal;
    if (PROPOSAL?.type !== 'NEW_GROUP') return;
    const OTHERS = PROPOSAL.playerIds.filter((_id) => _id !== _userId);
    if (PROPOSAL.status === 'LOBBY') {
      await this.notifySV(_search.id, _search.categoryId, OTHERS, 'LOBBY_JOINED', PROPOSAL.playerIds.length);
    } else if (PROPOSAL.status === 'PENDING' && PROPOSAL.playerIds.length === GROUP_SIZE) {
      await this.notifySV(_search.id, _search.categoryId, OTHERS, 'READY_CHECK');
    }
  }

  /**
   * Avisos de una operación de grupo, sin avisarle a quien la disparó (ya ve el
   * resultado en su respuesta):
   * - el lobby llegó a 4 → ready check para todos (S2);
   * - alguien entró a un lobby → "Se sumó un jugador (N de 4)" a los que ya estaban (S13);
   * - alguien entró a un ready check con cupo → la propuesta para quien entró (S5);
   * - invitaciones nuevas → "Hay un grupo armándose a tu horario" (S12).
   */
  private async notifySV(_searchId: string | null, _categoryId: string, _userIds: string[], _kind: QuickMatchNotificationKind, _memberCount?: number): Promise<void> {
    if (this._notifyProposal === null || _searchId === null || _userIds.length === 0) return;
    await this._notifyProposal.executeSV({ quickMatchSearchId: _searchId, categoryId: _categoryId, userIds: _userIds, proposalType: 'NEW_GROUP', kind: _kind, ...(_memberCount === undefined ? {} : { memberCount: _memberCount }) });
  }

  private async notifyRefillSV(_refill: QuickMatchRefillDTO, _triggerUserId?: string): Promise<void> {
    const NOT_TRIGGER = (_id: string) => _id !== _triggerUserId;
    if (_refill.readyCheckStarted) {
      await this.notifySV(_refill.notifySearchId, _refill.categoryId, _refill.memberUserIds.filter(NOT_TRIGGER), 'READY_CHECK');
    } else if (_refill.addedUserIds.length > 0 && _refill.phase === 'LOBBY') {
      const PREVIOUS_MEMBERS = _refill.memberUserIds.filter((_id) => NOT_TRIGGER(_id) && !_refill.addedUserIds.includes(_id));
      await this.notifySV(_refill.notifySearchId, _refill.categoryId, PREVIOUS_MEMBERS, 'LOBBY_JOINED', _refill.memberUserIds.length);
    } else if (_refill.addedUserIds.length > 0) {
      await this.notifySV(_refill.notifySearchId, _refill.categoryId, _refill.addedUserIds.filter(NOT_TRIGGER), 'READY_CHECK');
    }
    await this.notifySV(_refill.notifySearchId, _refill.categoryId, _refill.invitedUserIds.filter(NOT_TRIGGER), 'INVITATION');
  }

  private async notifyOpenMatchSV(_search: QuickMatchSearchDTO, _userId?: string): Promise<void> {
    if (this._notifyProposal === null || _search.proposal === null || _userId === undefined) return;
    await this._notifyProposal.executeSV({ quickMatchSearchId: _search.id, categoryId: _search.categoryId, userIds: [_userId], proposalType: 'OPEN_MATCH' });
  }
}
