import type {
  RefreshTokenCreateDTO,
  RefreshTokenDTO,
  RefreshTokenRepository,
  RefreshTokenRotateDTO,
} from '../../domain/ports/refresh_token_repository.js';

import { PRISMA } from '../prisma_client.js';

function mapRefreshToken(_row: {
  id: string;
  userId: string;
  jti: string;
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
  replacedByTokenId: string | null;
}): RefreshTokenDTO {
  return {
    id: _row.id,
    userId: _row.userId,
    jti: _row.jti,
    sessionId: _row.sessionId,
    createdAt: _row.createdAt,
    expiresAt: _row.expiresAt,
    revokedAt: _row.revokedAt,
    rotatedAt: _row.rotatedAt,
    replacedByTokenId: _row.replacedByTokenId,
  };
}

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  async createSV(_data: RefreshTokenCreateDTO): Promise<RefreshTokenDTO> {
    const ROW = await PRISMA.refreshToken.create({
      data: {
        userId: _data.userId,
        jti: _data.jti,
        sessionId: _data.sessionId,
        expiresAt: _data.expiresAt,
        userAgent: _data.userAgent,
        deviceId: _data.deviceId,
        ip: _data.ip,
      },
    });

    return mapRefreshToken(ROW);
  }

  async rotateSV(_data: RefreshTokenRotateDTO): Promise<RefreshTokenDTO | null> {
    const NOW = new Date();

    return PRISMA.$transaction(async (_tx) => {
      const EXISTING = await _tx.refreshToken.findUnique({
        where: { jti: _data.oldJti },
        select: {
          id: true,
          userId: true,
          jti: true,
          sessionId: true,
          createdAt: true,
          expiresAt: true,
          revokedAt: true,
          rotatedAt: true,
          replacedByTokenId: true,
        },
      });

      if (EXISTING === null) {
        return null;
      }

      const UPDATED = await _tx.refreshToken.updateMany({
        where: {
          jti: _data.oldJti,
          revokedAt: null,
          rotatedAt: null,
          expiresAt: { gt: NOW },
        },
        data: { rotatedAt: NOW },
      });

      if (UPDATED.count !== 1) {
        return null;
      }

      const NEW_ROW = await _tx.refreshToken.create({
        data: {
          userId: EXISTING.userId,
          sessionId: EXISTING.sessionId,
          jti: _data.newJti,
          expiresAt: _data.newExpiresAt,
        },
        select: {
          id: true,
          userId: true,
          jti: true,
          sessionId: true,
          createdAt: true,
          expiresAt: true,
          revokedAt: true,
          rotatedAt: true,
          replacedByTokenId: true,
        },
      });

      await _tx.refreshToken.updateMany({
        where: { jti: _data.oldJti },
        data: { replacedByTokenId: NEW_ROW.id },
      });

      return mapRefreshToken(NEW_ROW);
    });
  }

  async revokeByJtiSV(_jti: string): Promise<void> {
    const NOW = new Date();
    await PRISMA.refreshToken.updateMany({
      where: { jti: _jti, revokedAt: null },
      data: { revokedAt: NOW },
    });
  }
}

