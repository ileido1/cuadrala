import type { CreateQuickMatchProposalNotificationEventUseCase } from './create_quick_match_proposal_notification_event.use_case.js';
import type { QuickMatchRepository, QuickMatchSearchDTO } from '../../domain/ports/quick_match_repository.js';

const HOLD_MS = 2 * 60 * 1000;

export class MatchQuickMatchUseCase {
  constructor(private readonly _repository: QuickMatchRepository, private readonly _notifyProposal: CreateQuickMatchProposalNotificationEventUseCase | null = null) {}

  async executeSV(_search: QuickMatchSearchDTO, _userId?: string): Promise<QuickMatchSearchDTO> {
    if (_search.includeOpenMatches) {
      const CANDIDATE = await this._repository.findOpenCandidateSV(_search);
      if (CANDIDATE !== null) {
        const PROPOSAL = await this._repository.createOpenProposalSV(_search.id, CANDIDATE, new Date(Date.now() + HOLD_MS));
        if (PROPOSAL !== null) {
          await this.notifySV(PROPOSAL, _userId);
          return PROPOSAL;
        }
      }
    }
    const GROUP = await this._repository.findCompatibleGroupSV(_search);
    if (GROUP === null) return this._repository.markNoMatchYetSV(_search.id);
    const PROPOSAL = await this._repository.createGroupProposalsSV(_search, GROUP, new Date(Date.now() + HOLD_MS));
    if (PROPOSAL === null) return this._repository.markNoMatchYetSV(_search.id);
    await this.notifySV(PROPOSAL, _userId);
    return PROPOSAL;
  }

  private async notifySV(_search: QuickMatchSearchDTO, _fallbackUserId?: string): Promise<void> {
    if (this._notifyProposal === null || _search.proposal === null) return;
    await this._notifyProposal.executeSV({ quickMatchSearchId: _search.id, categoryId: _search.categoryId, userIds: _search.proposal.type === 'OPEN_MATCH' ? (_fallbackUserId === undefined ? [] : [_fallbackUserId]) : _search.proposal.playerIds, proposalType: _search.proposal.type });
  }
}
