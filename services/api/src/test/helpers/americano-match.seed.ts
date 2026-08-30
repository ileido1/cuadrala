import { PRISMA } from '../../infrastructure/prisma_client.js';

/**
 * @name    :seedAmericanoMatchSV
 * @version :2.0.0
 * @description :Crea un partido AMERICANO listo para usar como fixture.
 *
 * Reemplaza al endpoint `POST /api/v1/americanos`, eliminado por estar duplicado
 * con `POST /matches` y no tener ningún consumidor real. Los tests que solo
 * necesitaban un `matchId` para probar pagos, recibos o matchmaking usan esto.
 *
 * El deporte se deriva de la categoría: `Match.categoryId` y `Match.sportId` son
 * columnas independientes sin constraint que las relacione, así que fijar un
 * deporte a mano permitiría crear un partido de pádel en una categoría de tenis.
 * Ningún test fallaría, pero matchmaking filtra por `sportId` y devolvería vacío.
 * @param {{categoryId: string, participantUserIds: string[]}} _data - Categoría y
 * participantes; el primero queda como organizador
 * @return {Promise<{matchId: string}>} ID del partido creado
 */
export async function seedAmericanoMatchSV(_data: {
  categoryId: string;
  participantUserIds: string[];
}): Promise<{ matchId: string }> {
  const ORGANIZER_USER_ID = _data.participantUserIds[0];
  if (ORGANIZER_USER_ID === undefined) {
    throw new Error('seedAmericanoMatchSV requiere al menos un participante.');
  }

  //? 1. El deporte sale de la categoría, no de una constante.
  const CATEGORY = await PRISMA.category.findUniqueOrThrow({
    where: { id: _data.categoryId },
    select: { sportId: true },
  });

  //? 2. Preset AMERICANO vigente, resuelto igual que en producción
  //? (`PrismaFormatPresetRepository.findActiveBySportAndCodeSV`): sin el filtro
  //? de vigencia ni el orden por versión, una segunda versión del preset haría
  //? que el fixture tomara una fila arbitraria, incluso una inactiva.
  const PRESET = await PRISMA.tournamentFormatPreset.findFirstOrThrow({
    where: {
      sportId: CATEGORY.sportId,
      code: 'AMERICANO',
      isActive: true,
      effectiveFrom: { lte: new Date() },
    },
    orderBy: { version: 'desc' },
    select: { id: true },
  });

  //? 3. Partido y participantes, alternando equipos A/B en el orden recibido.
  const MATCH = await PRISMA.match.create({
    data: {
      categoryId: _data.categoryId,
      sportId: CATEGORY.sportId,
      formatPresetId: PRESET.id,
      organizerUserId: ORGANIZER_USER_ID,
      type: 'AMERICANO',
      status: 'SCHEDULED',
    },
    select: { id: true },
  });

  await PRISMA.matchParticipant.createMany({
    data: _data.participantUserIds.map((_userId, _index) => ({
      matchId: MATCH.id,
      userId: _userId,
      teamLabel: _index % 2 === 0 ? 'A' : 'B',
    })),
  });

  return { matchId: MATCH.id };
}
