export type VenueFeeRuleDTO = {
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
} | null;

export interface VenueFeeRuleRepository {
  findActiveForScopeSV(_scope: 'MATCH' | 'RESERVATION'): Promise<VenueFeeRuleDTO>;
}
