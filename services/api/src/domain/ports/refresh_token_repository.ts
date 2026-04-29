export type RefreshTokenCreateDTO = {
  userId: string;
  jti: string;
  sessionId: string;
  expiresAt: Date;
  userAgent?: string;
  deviceId?: string;
  ip?: string;
};

export type RefreshTokenRotateDTO = {
  oldJti: string;
  newJti: string;
  newExpiresAt: Date;
};

export type RefreshTokenDTO = {
  id: string;
  userId: string;
  jti: string;
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
  replacedByTokenId: string | null;
};

export interface RefreshTokenRepository {
  createSV(_data: RefreshTokenCreateDTO): Promise<RefreshTokenDTO>;
  rotateSV(_data: RefreshTokenRotateDTO): Promise<RefreshTokenDTO | null>;
  revokeByJtiSV(_jti: string): Promise<void>;
}

