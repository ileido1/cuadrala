-- Paso 2 de 2: la exclusividad del turno pasa a mirar el estado.
--
-- `Reservation_courtId_scheduledAt_key` cubria TODAS las filas. Cancelar solo
-- escribe `status: 'CANCELLED'` y deja la fila, asi que el turno quedaba tomado
-- para siempre: la validacion de la aplicacion dejaba pasar (mira
-- `status === 'CONFIRMED'`) y la insercion reventaba contra la base.
--
-- El indice parcial solo alcanza a los turnos vivos, HELD y CONFIRMED. Un turno
-- cancelado o vencido libera la cancha, que es lo que el flujo de torneo
-- necesita: apartar, y soltar si nadie confirma.
--
-- El DROP y el CREATE van juntos para que no haya ni un instante sin proteccion
-- contra la doble reserva.
DROP INDEX IF EXISTS "Reservation_courtId_scheduledAt_key";

CREATE UNIQUE INDEX "Reservation_court_slot_live_uniq"
  ON "Reservation" ("courtId", "scheduledAt")
  WHERE "status" IN ('HELD', 'CONFIRMED');
