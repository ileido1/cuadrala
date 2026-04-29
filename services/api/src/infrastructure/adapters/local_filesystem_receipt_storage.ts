import fs from 'node:fs/promises';
import path from 'node:path';

import type { ReceiptGetDTO, ReceiptPutDTO, ReceiptStorage } from '../../domain/ports/receipt_storage.js';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class LocalFilesystemReceiptStorage implements ReceiptStorage {
  constructor(private readonly _baseDirAbs: string) {}

  async putSV(_data: ReceiptPutDTO): Promise<{ storageKey: string }> {
    const EXT = MIME_TO_EXT[_data.mimeType];
    if (EXT === undefined) {
      throw new Error('MIME_TYPE_NOT_ALLOWED');
    }

    // storageKey es relativo y controlado por nosotros (evita path traversal).
    const STORAGE_KEY = path.posix.join(
      'receipts',
      _data.transactionId,
      `${_data.receiptId}.${EXT}`,
    );

    const TARGET_ABS = this.resolveSafeAbsPathSV(STORAGE_KEY);
    await fs.mkdir(path.dirname(TARGET_ABS), { recursive: true });
    await fs.writeFile(TARGET_ABS, _data.content);

    return { storageKey: STORAGE_KEY };
  }

  async getSV(_storageKey: string): Promise<ReceiptGetDTO | null> {
    const TARGET_ABS = this.resolveSafeAbsPathSV(_storageKey);
    try {
      const CONTENT = await fs.readFile(TARGET_ABS);
      const EXT = path.extname(TARGET_ABS).slice(1).toLowerCase();
      const MIME = EXT === 'jpg' || EXT === 'jpeg' ? 'image/jpeg' : EXT === 'png' ? 'image/png' : 'image/webp';
      return { mimeType: MIME, sizeBytes: CONTENT.byteLength, content: CONTENT };
    } catch (_error) {
      if (typeof _error === 'object' && _error !== null && 'code' in _error) {
        const CODE = (_error as { code?: unknown }).code;
        if (CODE === 'ENOENT') return null;
      }
      throw _error;
    }
  }

  private resolveSafeAbsPathSV(_storageKey: string): string {
    const BASE = path.resolve(this._baseDirAbs);
    const TARGET = path.resolve(BASE, _storageKey);
    if (TARGET === BASE || !TARGET.startsWith(`${BASE}${path.sep}`)) {
      throw new Error('PATH_TRAVERSAL_DETECTED');
    }
    return TARGET;
  }
}

