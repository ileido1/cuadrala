/** Lectura de catálogo para resolver sportId/categoryId al crear bookings. */
export interface BookingCatalogReadRepository {
  resolveSportIdForCourtSV(_courtId: string): Promise<string>;
  resolveDefaultCategoryIdSV(): Promise<string>;
}
