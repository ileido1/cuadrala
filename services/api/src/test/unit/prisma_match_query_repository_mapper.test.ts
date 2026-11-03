import { describe, expect, it } from 'vitest';

import { toListItemDTO } from '../../infrastructure/adapters/prisma_match_query_repository.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseRow() {
  return {
    id: 'match-1',
    sportId: 'sport-1',
    categoryId: 'cat-1',
    category: { name: 'Intermedia' },
    type: 'REGULAR' as const,
    status: 'SCHEDULED' as const,
    scheduledAt: new Date('2026-06-01T10:00:00.000Z'),
    pricePerPlayerCents: 500,
    maxParticipants: 4,
    _count: { participants: 2 },
    court: {
      name: 'Cancha 1',
      surfaceType: 'Exterior' as string | null,
      venue: {
        name: 'Club X',
        pricingCurrency: 'USD',
        displayCurrency: 'BS',
        addressLine1: 'Av. Principal',
        addressCity: 'Caracas',
        formattedAddress: 'Av. Principal, Caracas',
        address: null,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// toListItemDTO — surfaceType (issue #126: Home's "Mis partidas" cards never
// showed the court surface tag because it never reached the mobile client)
// ---------------------------------------------------------------------------

describe('toListItemDTO — surfaceType', () => {
  it('includes surfaceType when the court has one', () => {
    const DTO = toListItemDTO(baseRow());

    expect(DTO.surfaceType).toBe('Exterior');
  });

  it('omits surfaceType when the court has none', () => {
    const ROW = baseRow();
    ROW.court!.surfaceType = null;
    const DTO = toListItemDTO(ROW);

    expect(DTO.surfaceType).toBeUndefined();
  });

  it('omits surfaceType when there is no court', () => {
    const ROW = { ...baseRow(), court: null };
    const DTO = toListItemDTO(ROW);

    expect(DTO.surfaceType).toBeUndefined();
  });
});
