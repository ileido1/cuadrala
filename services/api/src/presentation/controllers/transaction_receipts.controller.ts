import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  GET_TRANSACTION_RECEIPT_UC,
  UPLOAD_TRANSACTION_RECEIPT_UC,
} from '../composition/transaction_receipts.composition.js';
import {
  TRANSACTION_ID_PARAM_SCHEMA,
  TRANSACTION_RECEIPT_ID_PARAM_SCHEMA,
} from '../validation/transaction_receipts.validation.js';

type MulterFile = {
  mimetype: string;
  size: number;
  originalname: string;
  buffer: Buffer;
};

export async function postUploadTransactionReceiptCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = TRANSACTION_ID_PARAM_SCHEMA.parse(_req.params);

  const FILE = (_req as Request & { file?: MulterFile }).file;
  if (FILE === undefined) {
    throw new AppError('VALIDACION_FALLIDA', 'Se requiere un archivo en el campo file.', 400);
  }

  const RESULT = await UPLOAD_TRANSACTION_RECEIPT_UC.executeSV({
    transactionId: PARAMS.transactionId,
    actorUserId: USER_ID,
    mimeType: FILE.mimetype,
    sizeBytes: FILE.size,
    originalFileName: FILE.originalname,
    content: FILE.buffer,
  });

  _res.status(201).json({
    success: true,
    message: 'Comprobante adjuntado correctamente.',
    data: RESULT.receipt,
  });
}

export async function getTransactionReceiptCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = TRANSACTION_RECEIPT_ID_PARAM_SCHEMA.parse(_req.params);

  const RESULT = await GET_TRANSACTION_RECEIPT_UC.executeSV({
    transactionId: PARAMS.transactionId,
    receiptId: PARAMS.receiptId,
    actorUserId: USER_ID,
  });

  _res.status(200);
  _res.setHeader('Content-Type', RESULT.mimeType);
  _res.setHeader('Content-Length', String(RESULT.sizeBytes));
  _res.send(RESULT.content);
}

