import { describe, expect, it } from 'vitest';

import type { QuickMatchRefillDTO, QuickMatchRepository, QuickMatchSearchDTO } from '../../domain/ports/quick_match_repository.js';
import { MatchQuickMatchUseCase } from './match_quick_match.use_case.js';

const SEARCH: QuickMatchSearchDTO = { id: 's', sportId: 'sport', categoryId: 'cat', targetDate: new Date(), slots: ['EVENING'], widenLevel: false, zoneKm: 10, includeOpenMatches: true, status: 'SEARCHING', noMatchYet: false, dismissedMatchIds: [], proposal: null, acceptedCount: 0, invitedByAvailability: false };
const LOBBY_SEARCH: QuickMatchSearchDTO = { ...SEARCH, proposal: { id: 'p', type: 'NEW_GROUP', status: 'LOBBY', matchId: null, groupKey: 'g1', playerIds: ['older', 'searcher'], venueOptions: [], expiresAt: new Date() } };
const REFILL: QuickMatchRefillDTO = { groupKey: 'g1', categoryId: 'cat', phase: 'LOBBY', addedUserIds: [], invitedUserIds: [], memberUserIds: ['older', 'searcher'], readyCheckStarted: false, notifySearchId: 's' };

//? Repositorio falso: todo lo que no se sobreescribe falla, así cada test declara qué camino espera.
function repositorySV(_overrides: Partial<QuickMatchRepository>): QuickMatchRepository {
  const FAIL = async () => { throw new Error('not expected'); };
  return {
    startForUserSV: FAIL, findByUserIdSV: FAIL, cancelForUserSV: FAIL, findOpenCandidateSV: async () => null, createOpenProposalSV: FAIL,
    formLobbySV: FAIL, markNoMatchYetSV: FAIL, dismissProposalForUserSV: FAIL, confirmProposalForUserSV: FAIL,
    findOpenGroupKeySV: async () => null, refillGroupSV: async () => null,
    ..._overrides,
  };
}

type Sent = { userIds: string[]; kind?: string; memberCount?: number };
function notifierSV(_sent: Sent[]) {
  return { executeSV: async (_dto: Sent) => { _sent.push({ userIds: _dto.userIds, ...(_dto.kind === undefined ? {} : { kind: _dto.kind }), ...(_dto.memberCount === undefined ? {} : { memberCount: _dto.memberCount }) }); } } as never;
}

describe('MatchQuickMatchUseCase', () => {
  it('should propose a compatible open match before any lobby', async () => {
    const UC = new MatchQuickMatchUseCase(repositorySV({
      findOpenCandidateSV: async () => ({ matchId: 'm', participantIds: ['a', 'b', 'c'] }),
      createOpenProposalSV: async () => ({ ...SEARCH, status: 'PROPOSAL', proposal: { id: 'p', type: 'OPEN_MATCH', status: 'PENDING', matchId: 'm', playerIds: ['a', 'b', 'c'], venueOptions: null, expiresAt: new Date() } }),
    }));
    expect((await UC.executeSV(SEARCH, 'searcher')).status).toBe('PROPOSAL');
  });

  //? S1: solo en la cola no hay propuesta.
  it('should keep searching alone when no other compatible player is in the queue', async () => {
    const UC = new MatchQuickMatchUseCase(repositorySV({ formLobbySV: async () => null, markNoMatchYetSV: async () => ({ ...SEARCH, noMatchYet: true }) }));
    expect(await UC.executeSV(SEARCH, 'searcher')).toMatchObject({ status: 'SEARCHING', noMatchYet: true, proposal: null });
  });

  //? S1/S13: dos buscadores se juntan en un lobby y se avisa al que esperaba.
  it('should form a lobby with another searcher and notify only the player who was waiting', async () => {
    const SENT: Sent[] = [];
    const UC = new MatchQuickMatchUseCase(repositorySV({
      formLobbySV: async () => ({ ...REFILL, addedUserIds: ['searcher'] }),
      findByUserIdSV: async () => LOBBY_SEARCH,
    }), notifierSV(SENT));
    expect(await UC.executeSV(SEARCH, 'searcher')).toBe(LOBBY_SEARCH);
    expect(SENT).toEqual([{ userIds: ['older'], kind: 'LOBBY_JOINED', memberCount: 2 }]);
  });

  //? S1: un grupo con cupo tiene prioridad sobre formar un lobby nuevo.
  it('should join an open group before forming a new lobby', async () => {
    const SENT: Sent[] = [];
    const UC = new MatchQuickMatchUseCase(repositorySV({
      findOpenGroupKeySV: async () => 'g1',
      refillGroupSV: async () => ({ ...REFILL, addedUserIds: ['searcher'], memberUserIds: ['a', 'b', 'searcher'] }),
      findByUserIdSV: async () => LOBBY_SEARCH,
    }), notifierSV(SENT));
    expect(await UC.executeSV(SEARCH, 'searcher')).toBe(LOBBY_SEARCH);
    expect(SENT).toEqual([{ userIds: ['a', 'b'], kind: 'LOBBY_JOINED', memberCount: 3 }]);
  });

  //? S2: el 4º del lobby dispara el ready check; se avisa a los otros 3.
  it('should notify the other three members when a lobby reaches 4', async () => {
    const SENT: Sent[] = [];
    const UC = new MatchQuickMatchUseCase(repositorySV({
      findOpenGroupKeySV: async () => 'g1',
      refillGroupSV: async () => ({ ...REFILL, phase: 'READY_CHECK', readyCheckStarted: true, addedUserIds: ['searcher'], memberUserIds: ['a', 'b', 'c', 'searcher'] }),
      findByUserIdSV: async () => LOBBY_SEARCH,
    }), notifierSV(SENT));
    await UC.executeSV(SEARCH, 'searcher');
    expect(SENT).toEqual([{ userIds: ['a', 'b', 'c'], kind: 'READY_CHECK' }]);
  });

  //? S12: un lobby que invita por disponibilidad avisa a los invitados.
  it('should notify new availability invitees with an invitation', async () => {
    const SENT: Sent[] = [];
    const UC = new MatchQuickMatchUseCase(repositorySV({
      refillGroupSV: async () => ({ ...REFILL, invitedUserIds: ['guest'] }),
      findByUserIdSV: async () => LOBBY_SEARCH,
    }), notifierSV(SENT));
    await UC.executeSV(LOBBY_SEARCH, 'searcher');
    expect(SENT).toEqual([{ userIds: ['guest'], kind: 'INVITATION' }]);
  });

  //? S12: mientras la invitación espera respuesta no se busca nada en su nombre.
  it('should leave a pending invitation untouched until the invitee answers', async () => {
    const INVITATION: QuickMatchSearchDTO = { ...SEARCH, status: 'PROPOSAL', invitedByAvailability: true, proposal: { ...LOBBY_SEARCH.proposal!, status: 'PENDING' } };
    const UC = new MatchQuickMatchUseCase(repositorySV({ refillGroupSV: async () => { throw new Error('must not refill for an invitee'); } }));
    await expect(UC.executeSV(INVITATION, 'guest')).resolves.toBe(INVITATION);
  });

  it('should not rematch a member who already accepted a ready check whose group is full', async () => {
    const CONFIRMED: QuickMatchSearchDTO = { ...SEARCH, status: 'CONFIRMED', proposal: { ...LOBBY_SEARCH.proposal!, status: 'CONFIRMED', playerIds: ['a', 'b', 'c', 'searcher'] } };
    const UC = new MatchQuickMatchUseCase(repositorySV({ refillGroupSV: async () => null }));
    await expect(UC.executeSV(CONFIRMED, 'searcher')).resolves.toBe(CONFIRMED);
  });

  //? S13/S2: aceptar una invitación avisa a quienes ya estaban; si llega a 4, el ready check.
  it('should notify lobby members after an invitee accepts, and the ready check when the accept makes 4', async () => {
    const SENT: Sent[] = [];
    const UC = new MatchQuickMatchUseCase(repositorySV({}), notifierSV(SENT));
    await UC.notifyAfterAcceptSV({ ...LOBBY_SEARCH, proposal: { ...LOBBY_SEARCH.proposal!, playerIds: ['a', 'b', 'guest'] } }, 'guest');
    await UC.notifyAfterAcceptSV({ ...LOBBY_SEARCH, status: 'PROPOSAL', proposal: { ...LOBBY_SEARCH.proposal!, status: 'PENDING', playerIds: ['a', 'b', 'c', 'guest'] } }, 'guest');
    expect(SENT).toEqual([{ userIds: ['a', 'b'], kind: 'LOBBY_JOINED', memberCount: 3 }, { userIds: ['a', 'b', 'c'], kind: 'READY_CHECK' }]);
  });
});
