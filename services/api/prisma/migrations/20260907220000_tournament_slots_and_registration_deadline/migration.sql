-- Cupo maximo y cierre de inscripcion del torneo.
--
-- Los dos son opcionales: los torneos ya creados no declaran cupo ni fecha de
-- cierre, y seguir sin declararlos es un estado valido (el organizador cierra
-- a mano cambiando el status).
ALTER TABLE "Tournament" ADD COLUMN "maxSlots" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN "registrationClosesAt" TIMESTAMP(3);
