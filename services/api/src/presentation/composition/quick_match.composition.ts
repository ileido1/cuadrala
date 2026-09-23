import { CancelMyQuickMatchUseCase } from '../../application/use_cases/cancel_my_quick_match.use_case.js';
import { ConfirmMyQuickMatchProposalUseCase } from '../../application/use_cases/confirm_my_quick_match_proposal.use_case.js';
import { DismissMyQuickMatchProposalUseCase } from '../../application/use_cases/dismiss_my_quick_match_proposal.use_case.js';
import { GetMyQuickMatchUseCase } from '../../application/use_cases/get_my_quick_match.use_case.js';
import { MatchQuickMatchUseCase } from '../../application/use_cases/match_quick_match.use_case.js';
import { StartQuickMatchUseCase } from '../../application/use_cases/start_quick_match.use_case.js';
import { PrismaQuickMatchRepository } from '../../infrastructure/adapters/prisma_quick_match_repository.js';
import { CREATE_QUICK_MATCH_PROPOSAL_NOTIFICATION_EVENT_UC } from './notifications.composition.js';
import { JOIN_MATCH_UC } from './matches.composition.js';

const QUICK_MATCH_REPOSITORY = new PrismaQuickMatchRepository();

export const START_QUICK_MATCH_UC = new StartQuickMatchUseCase(QUICK_MATCH_REPOSITORY);
export const MATCH_QUICK_MATCH_UC = new MatchQuickMatchUseCase(QUICK_MATCH_REPOSITORY, CREATE_QUICK_MATCH_PROPOSAL_NOTIFICATION_EVENT_UC);
export const GET_MY_QUICK_MATCH_UC = new GetMyQuickMatchUseCase(QUICK_MATCH_REPOSITORY);
export const CANCEL_MY_QUICK_MATCH_UC = new CancelMyQuickMatchUseCase(QUICK_MATCH_REPOSITORY);
export const DISMISS_MY_QUICK_MATCH_PROPOSAL_UC = new DismissMyQuickMatchProposalUseCase(QUICK_MATCH_REPOSITORY);
export const CONFIRM_MY_QUICK_MATCH_PROPOSAL_UC = new ConfirmMyQuickMatchProposalUseCase(QUICK_MATCH_REPOSITORY, JOIN_MATCH_UC);
