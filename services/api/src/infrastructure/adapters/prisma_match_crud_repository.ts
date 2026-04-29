import type {
  CreateMatchInputDTO,
  MatchCrudRepository,
  MatchDetailDTO,
  UpdateMatchPatchDTO,
} from '../../domain/ports/match_crud_repository.js';

import { PRISMA } from '../prisma_client.js';

function computeDetailDTO(_row: {
  id: string;
  sportId: string;
  categoryId: string;
  type: 'AMERICANO' | 'REGULAR';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  scheduledAt: Date | null;
  courtId: string | null;
  tournamentId: string | null;
  pricePerPlayerCents: number;
  maxParticipants: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { participants: number };
}): MatchDetailDTO {
  return {
    id: _row.id,
    sportId: _row.sportId,
    categoryId: _row.categoryId,
    type: _row.type,
    status: _row.status,
    scheduledAt: _row.scheduledAt,
    courtId: _row.courtId,
    tournamentId: _row.tournamentId,
    pricePerPlayerCents: _row.pricePerPlayerCents,
    maxParticipants: _row.maxParticipants,
    participantCount: _row._count.participants,
    createdAt: _row.createdAt,
    updatedAt: _row.updatedAt,
  };
}

export class PrismaMatchCrudRepository implements MatchCrudRepository {
  async createMatchSV(_input: CreateMatchInputDTO, _creatorUserId: string): Promise<MatchDetailDTO> {
    const ROW = await PRISMA.match.create({
      data: {
        sportId: _input.sportId,
        categoryId: _input.categoryId,
        organizerUserId: _creatorUserId,
        type: _input.type,
        status: 'SCHEDULED',
        scheduledAt: _input.scheduledAt ?? null,
        courtId: _input.courtId ?? null,
        tournamentId: _input.tournamentId ?? null,
        pricePerPlayerCents: _input.pricePerPlayerCents ?? 0,
        maxParticipants: _input.maxParticipants,
        participants: {
          create: [{ userId: _creatorUserId }],
        },
      },
      select: {
        id: true,
        sportId: true,
        categoryId: true,
        type: true,
        status: true,
        scheduledAt: true,
        courtId: true,
        tournamentId: true,
        pricePerPlayerCents: true,
        maxParticipants: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { participants: true } },
      },
    });

    return computeDetailDTO(ROW);
  }

  async updateMatchSV(_matchId: string, _patch: UpdateMatchPatchDTO): Promise<MatchDetailDTO> {
    const ROW = await PRISMA.match.update({
      where: { id: _matchId },
      data: {
        ...(_patch.scheduledAt !== undefined ? { scheduledAt: _patch.scheduledAt } : {}),
        ...(_patch.courtId !== undefined ? { courtId: _patch.courtId } : {}),
        ...(_patch.pricePerPlayerCents !== undefined ? { pricePerPlayerCents: _patch.pricePerPlayerCents } : {}),
        ...(_patch.maxParticipants !== undefined ? { maxParticipants: _patch.maxParticipants } : {}),
      },
      select: {
        id: true,
        sportId: true,
        categoryId: true,
        type: true,
        status: true,
        scheduledAt: true,
        courtId: true,
        tournamentId: true,
        pricePerPlayerCents: true,
        maxParticipants: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { participants: true } },
      },
    });

    return computeDetailDTO(ROW);
  }

  async cancelMatchSV(_matchId: string): Promise<MatchDetailDTO> {
    const ROW = await PRISMA.$transaction(async (_tx) => {
      const DRAFT = await _tx.matchResultDraft.findUnique({
        where: { matchId: _matchId },
        select: { id: true },
      });
      if (DRAFT !== null) {
        await _tx.matchResultConfirmation.deleteMany({ where: { draftId: DRAFT.id } });
        await _tx.matchResultDraft.delete({ where: { id: DRAFT.id } });
      }

      return _tx.match.update({
        where: { id: _matchId },
        data: { status: 'CANCELLED' },
        select: {
          id: true,
          sportId: true,
          categoryId: true,
          type: true,
          status: true,
          scheduledAt: true,
          courtId: true,
          tournamentId: true,
          pricePerPlayerCents: true,
          maxParticipants: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { participants: true } },
        },
      });
    });

    return computeDetailDTO(ROW);
  }
}

