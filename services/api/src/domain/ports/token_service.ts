export type AccessTokenPayloadDTO = {
  sub: string;
  email: string;
};

export type RefreshTokenPayloadDTO = {
  sub: string;
};

export interface TokenService {
  getAccessTokenExpiresInSecondsSV(): number;
  signAccessTokenSV(_userId: string, _email: string): string;
  signRefreshTokenSV(_userId: string): string;
  verifyAccessTokenSV(_token: string): AccessTokenPayloadDTO;
  verifyRefreshTokenSV(_token: string): RefreshTokenPayloadDTO;
}

