export interface RankingEntryReadRepository {
  getPointsByUserIdsSV(_categoryId: string, _userIds: string[]): Promise<{ userId: string; points: number }[]>;
}

