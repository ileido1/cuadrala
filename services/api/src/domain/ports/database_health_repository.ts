export interface DatabaseHealthRepository {
  pingSV(): Promise<void>;
}
