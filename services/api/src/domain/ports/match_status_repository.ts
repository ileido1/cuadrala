export interface MatchStatusRepository {
  //? Actualiza partidas SCHEDULED cuyo scheduledAt sea <= ahora a IN_PROGRESS
  updateScheduledToInProgressSV(): Promise<{ updatedCount: number }>;
}
