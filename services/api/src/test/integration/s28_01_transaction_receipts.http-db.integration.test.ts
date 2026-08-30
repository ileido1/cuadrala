import fs from 'node:fs/promises';
import path from 'node:path';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { seedAmericanoMatchSV } from '../helpers/americano-match.seed.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();

const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9v7tYAAAAASUVORK5CYII=',
  'base64',
);

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Integración receipts (upload + download)', () => {
  let sportPadelId: string;
  let categoryId: string;
  let userA: { id: string; token: string };
  let userB: string;
  let matchId: string;
  let txAId: string;
  let venueId: string;
  let venueStaffUserIds: string[];

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;

    const SLUG = `rct-cat-${Date.now()}`;
    const CAT = await createTestCategorySV(sportPadelId, SLUG, 'Cat receipts');
    categoryId = CAT.id;

    const TS = Date.now();
    const U1 = await PRISMA.user.create({
      data: { email: `ra-${TS}@test.local`, name: 'A' },
    });
    userA = { id: U1.id, token: signAccessTokenSV(U1.id, U1.email) };

    const U2 = await PRISMA.user.create({
      data: { email: `rb-${TS}@test.local`, name: 'B' },
    });
    userB = U2.id;

    const CREATED_MATCH = await seedAmericanoMatchSV({
      categoryId,
      participantUserIds: [userA.id, userB],
    });
    matchId = CREATED_MATCH.matchId;

    // Setup: Venue + Court + VenueStaff para que el aviso de pago pendiente a staff dispare (US-E8-05).
    const VENUE = await PRISMA.venue.create({ data: { name: 'Sede Test Receipts' } });
    venueId = VENUE.id;
    const COURT = await PRISMA.court.create({
      data: { name: 'Cancha Receipts', venueId },
    });
    await PRISMA.match.update({
      where: { id: matchId },
      data: { courtId: COURT.id },
    });
    const STAFF_1 = await PRISMA.user.create({
      data: { email: `staff1-${TS}@test.local`, name: 'Staff 1' },
    });
    const STAFF_2 = await PRISMA.user.create({
      data: { email: `staff2-${TS}@test.local`, name: 'Staff 2' },
    });
    await PRISMA.venueStaff.createMany({
      data: [
        { venueId, userId: STAFF_1.id, role: 'STAFF' },
        { venueId, userId: STAFF_2.id, role: 'OWNER' },
      ],
    });
    venueStaffUserIds = [STAFF_1.id, STAFF_2.id];

    const TX = await PRISMA.transaction.create({
      data: {
        matchId,
        userId: userA.id,
        amountBase: '10.0000',
        feeAmount: '0.0000',
        amountTotal: '10.0000',
        status: 'PENDING',
        paymentMethod: 'MANUAL',
      },
      select: { id: true },
    });
    txAId = TX.id;

    // Limpieza defensiva de uploads por si hay restos locales.
    const RECEIPTS_DIR = path.resolve(process.cwd(), 'uploads', 'receipts', txAId);
    await fs.rm(RECEIPTS_DIR, { recursive: true, force: true });
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('POST receipt + GET receipt: persiste en DB y FS', async () => {
    const UPLOAD = await request(APP)
      .post(`/api/v1/transactions/${txAId}/receipt`)
      .set('Authorization', `Bearer ${userA.token}`)
      .attach('file', ONE_PX_PNG, { filename: 'receipt.png', contentType: 'image/png' });

    expect(UPLOAD.status).toBe(201);
    expect(UPLOAD.body.data.transactionId).toBe(txAId);
    expect(UPLOAD.body.data.uploaderUserId).toBe(userA.id);
    expect(UPLOAD.body.data.mimeType).toBe('image/png');
    expect(UPLOAD.body.data.sizeBytes).toBe(ONE_PX_PNG.byteLength);

    const RECEIPT_ID = UPLOAD.body.data.id as string;

    const DB = await PRISMA.transactionReceipt.findUnique({ where: { id: RECEIPT_ID } });
    expect(DB).not.toBeNull();
    expect(DB?.transactionId).toBe(txAId);
    expect(DB?.storageKey).toContain(`receipts/${txAId}/`);

    const FILE_ABS = path.resolve(process.cwd(), 'uploads', DB!.storageKey);
    const STAT = await fs.stat(FILE_ABS);
    expect(STAT.size).toBe(ONE_PX_PNG.byteLength);

    const DOWNLOAD = await request(APP)
      .get(`/api/v1/transactions/${txAId}/receipt/${RECEIPT_ID}`)
      .set('Authorization', `Bearer ${userA.token}`)
      .buffer(true)
      .parse((_res, _cb) => {
        const CHUNKS: Buffer[] = [];
        _res.on('data', (_chunk) => CHUNKS.push(Buffer.from(_chunk)));
        _res.on('end', () => _cb(null, Buffer.concat(CHUNKS)));
      });

    expect(DOWNLOAD.status).toBe(200);
    expect(DOWNLOAD.headers['content-type']).toContain('image/png');
    expect(Buffer.isBuffer(DOWNLOAD.body)).toBe(true);
    expect(Buffer.compare(DOWNLOAD.body as Buffer, ONE_PX_PNG)).toBe(0);

    // US-E8-05: al subir el comprobante, cada VenueStaff de la sede recibe un delivery.
    const STAFF_DELIVERIES = await PRISMA.notificationDelivery.findMany({
      where: { userId: { in: venueStaffUserIds } },
      include: { event: true },
    });
    expect(STAFF_DELIVERIES).toHaveLength(venueStaffUserIds.length);
    for (const DELIVERY of STAFF_DELIVERIES) {
      expect(DELIVERY.event.type).toBe('PAYMENT_PENDING');
      expect(DELIVERY.event.matchId).toBe(matchId);
      expect(DELIVERY.event.payload).toMatchObject({
        kind: 'VENUE_PAYMENT_PENDING',
        venueId,
        transactionId: txAId,
        payerUserId: userA.id,
        receiptId: RECEIPT_ID,
      });
    }
  });
});

