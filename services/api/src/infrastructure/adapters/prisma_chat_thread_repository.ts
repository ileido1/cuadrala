import type { ChatThreadDTO, ChatThreadRepository } from '../../domain/ports/chat_thread_repository.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaChatThreadRepository implements ChatThreadRepository {
  async findByMatchIdSV(_matchId: string): Promise<ChatThreadDTO | null> {
    return await PRISMA.chatThread.findUnique({
      where: { matchId: _matchId },
      select: { id: true, matchId: true, tournamentId: true, createdAt: true },
    });
  }

  async findByTournamentIdSV(_tournamentId: string): Promise<ChatThreadDTO | null> {
    return await PRISMA.chatThread.findUnique({
      where: { tournamentId: _tournamentId },
      select: { id: true, matchId: true, tournamentId: true, createdAt: true },
    });
  }

  async getOrCreateForMatchSV(_matchId: string): Promise<ChatThreadDTO> {
    return await PRISMA.chatThread.upsert({
      where: { matchId: _matchId },
      update: {},
      create: { matchId: _matchId },
      select: { id: true, matchId: true, tournamentId: true, createdAt: true },
    });
  }

  async getOrCreateForTournamentSV(_tournamentId: string): Promise<ChatThreadDTO> {
    return await PRISMA.chatThread.upsert({
      where: { tournamentId: _tournamentId },
      update: {},
      create: { tournamentId: _tournamentId },
      select: { id: true, matchId: true, tournamentId: true, createdAt: true },
    });
  }
}

