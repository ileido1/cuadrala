-- Añade estado MAINTENANCE para canchas fuera de servicio temporal.
ALTER TYPE "CourtStatus" ADD VALUE IF NOT EXISTS 'MAINTENANCE';
