-- Duplas fijas de padel: los jugadores se inscriben de a dos y juegan todo el
-- torneo con el mismo companero.
--
-- No confundir con AMERICANO, que tambien es 2v2 pero rota companero cada
-- ronda: ahi la inscripcion sigue siendo individual. Por eso el flag habla de
-- la INSCRIPCION y no de cuantos juegan.
--
-- El enlace es simetrico (las dos filas se apuntan entre si) y el indice unico
-- impide que una persona quede en dos duplas.
-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "pairedRegistration" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TournamentRegistration" ADD COLUMN     "partnerRegistrationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_partnerRegistrationId_key" ON "TournamentRegistration"("partnerRegistrationId");

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_partnerRegistrationId_fkey" FOREIGN KEY ("partnerRegistrationId") REFERENCES "TournamentRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

