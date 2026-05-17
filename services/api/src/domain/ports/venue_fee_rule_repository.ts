export type VenueFeeRuleDTO = {
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
  source: 'VENUE' | 'GLOBAL';
} | null;

export interface VenueFeeRuleRepository {
  /** @deprecated Usar findActiveForVenueAndScopeSV */
  findActiveForScopeSV(_scope: 'MATCH' | 'RESERVATION'): Promise<VenueFeeRuleDTO>;

  findActiveForVenueAndScopeSV(
    _venueId: string,
    _scope: 'MATCH' | 'RESERVATION',
  ): Promise<VenueFeeRuleDTO>;
}
