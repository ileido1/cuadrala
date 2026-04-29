import fs from 'node:fs/promises';
import path from 'node:path';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9v7tYAAAAASUVORK5CYII=',
  'base64',
);

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Integración receipts (upload + download)', () => {
  let categoryId: string;
  let userA: { id: string; token: string };
  let userB: string;
  let matchId: string;
  let txAId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    await ensureTestCatalogSV();

    const SLUG = `rct-cat-${Date.now()}`;
    const CAT = await PRISMA.category.create({
      data: { name: 'Cat receipts', slug: SLUG },
    });
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

    const CREATE = await request(APP)
      .post('/api/v1/americanos')
      .send({
        categoryId,
        participantUserIds: [userA.id, userB],
      })
      .set('Content-Type', 'application/json');

    expect(CREATE.status).toBe(201);
    matchId = CREATE.body.data.matchId as string;

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
  });
});

