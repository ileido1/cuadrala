export type SocialProvider = 'google' | 'apple';

export type SocialIdTokenClaimsDTO = {
  /** ID del proveedor (sub). */
  providerUserId: string;
  /** Email verificado o email del claim (si aplica). */
  email: string;
  /** Nombre (si el proveedor lo entrega). */
  name?: string;
};

export interface SocialIdTokenVerifier {
  verifyIdTokenSV(_provider: SocialProvider, _idToken: string): Promise<SocialIdTokenClaimsDTO>;
}

