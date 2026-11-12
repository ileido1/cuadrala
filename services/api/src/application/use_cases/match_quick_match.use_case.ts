import type { CreateQuickMatchProposalNotificationEventUseCase } from './create_quick_match_proposal_notification_event.use_case.js';
import type { QuickMatchRefillDTO, QuickMatchRepository, QuickMatchSearchDTO } from '../../domain/ports/quick_match_repository.js';

const HOLD_MS = 2 * 60 * 1000;
const GROUP_SIZE = 4;

export class MatchQuickMatchUseCase {
  constructor(private readonly _repository: QuickMatchRepository, private readonly _notifyProposal: CreateQuickMatchProposalNotificationEventUseCase | null = null) {}

  async executeSV(_search: QuickMatchSearchDTO, _userId?: string): Promise<QuickMatchSearchDTO> {
    //? 1. Miembro de un grupo sin partido: si hay cupos libres, se reponen (S5)
    const PROPOSAL = _search.proposal;
    if (PROPOSAL?.type === 'NEW_GROUP' && typeof PROPOSAL.groupKey === 'string' && ['PENDING', 'CONFIRMED'].includes(PROPOSAL.status) && PROPOSAL.matchId === null) {
      //? playerIds puede estar desactualizado en grupos heredados: el repositorio decide si hay cupo.
      const REFILL = await this.refillGroupSV(PROPOSAL.groupKey, _userId);
      if (REFILL === null || _userId === undefined) return _search;
      return (await this._repository.findByUserIdSV(_userId)) ?? _search;
    }
    if (_search.status !== 'SEARCHING') return _search;
    //? 2. Partida abierta compatible (S8, sin cambios)
    if (_search.includeOpenMatches) {
      const CANDIDATE = await this._repository.findOpenCandidateSV(_search);
      if (CANDIDATE !== null) {
        const OPEN = await this._repository.createOpenProposalSV(_search.id, CANDIDATE, new Date(Date.now() + HOLD_MS));
        if (OPEN !== null) {
          await this.notifySV(OPEN, _userId);
          return OPEN;
        }
      }
    }
    //? 3. Un grupo con cupos libres tiene prioridad sobre formar uno nuevo (S5)
    if (_userId !== undefined) {
      const OPEN_GROUP_KEY = await this._repository.findOpenGroupKeySV(_search);
      if (OPEN_GROUP_KEY !== null) {
        const REFILL = await this.refillGroupSV(OPEN_GROUP_KEY, _userId);
        if (REFILL?.addedUserIds.includes(_userId)) return (await this._repository.findByUserIdSV(_userId)) ?? _search;
      }
    }
    //? 4. Grupo nuevo solo con 4 jugadores (S1)
    const GROUP = await this._repository.findCompatibleGroupSV(_search);
    if (GROUP === null || GROUP.userIds.length < GROUP_SIZE) return this._repository.markNoMatchYetSV(_search.id);
    const CREATED = await this._repository.createGroupProposalsSV(_search, GROUP, new Date(Date.now() + HOLD_MS));
    if (CREATED === null) return this._repository.markNoMatchYetSV(_search.id);
    //? Ready check (S2): avisa a los 4 miembros salvo a quien disparó el match,
    //? que ya ve la propuesta en la respuesta.
    await this.notifySV(CREATED, _userId, GROUP.userIds.filter((_id) => _id !== _userId));
    return CREATED;
  }

  /**
   * Repone los cupos libres de un grupo y avisa a quienes entraron, salvo a
   * quien disparó la reposición (ya ve el resultado en su respuesta).
   */
  async refillGroupSV(_groupKey: string, _triggerUserId?: string): Promise<QuickMatchRefillDTO | null> {
    const REFILL = await this._repository.refillGroupSV(_groupKey, new Date(Date.now() + HOLD_MS));
    const NOTIFY_USER_IDS = REFILL?.addedUserIds.filter((_id) => _id !== _triggerUserId) ?? [];
    if (this._notifyProposal !== null && REFILL?.notifySearchId != null && NOTIFY_USER_IDS.length > 0) {
      await this._notifyProposal.executeSV({ quickMatchSearchId: REFILL.notifySearchId, categoryId: REFILL.categoryId, userIds: NOTIFY_USER_IDS, proposalType: 'NEW_GROUP' });
    }
    return REFILL;
  }

  private async notifySV(_search: QuickMatchSearchDTO, _fallbackUserId?: string, _inviteUserIds?: string[]): Promise<void> {
    if (this._notifyProposal === null || _search.proposal === null) return;
    await this._notifyProposal.executeSV({ quickMatchSearchId: _search.id, categoryId: _search.categoryId, userIds: _search.proposal.type === 'OPEN_MATCH' ? (_fallbackUserId === undefined ? [] : [_fallbackUserId]) : (_inviteUserIds ?? []), proposalType: _search.proposal.type });
  }
}
