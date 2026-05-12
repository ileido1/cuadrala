import { Request, Response } from 'express';
import { AppError } from '../../domain/errors/app_error.js';
import { userRepository } from '../../infrastructure/repositories/user.repository.js';

export async function searchUsersByDocumentCON(_req: Request, _res: Response): Promise<void> {
  const { documentNumber } = _req.query;

  if (!documentNumber || typeof documentNumber !== 'string' || documentNumber.trim().length < 6) {
    throw new AppError('VALIDACION_FALLIDA', 'Documento inválido', 400);
  }

  const users = await userRepository.findByDocumentNumberSV(documentNumber.trim());

  _res.status(200).json({
    success: true,
    message: 'Usuarios encontrados',
    data: { items: users },
  });
}