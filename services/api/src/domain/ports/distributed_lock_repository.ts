export interface DistributedLockRepository {
  /**
   * Intenta tomar un lock global por nombre.
   * Devuelve true si lo tomó, false si otro proceso lo tiene.
   */
  tryAcquireSV(_lockName: string): Promise<boolean>;

  /**
   * Libera el lock global por nombre (best-effort).
   * Si el proceso se cae, Postgres libera el lock al cerrar la conexión.
   */
  releaseSV(_lockName: string): Promise<void>;
}

