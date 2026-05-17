import { z } from 'zod';

export const SEARCH_USERS_BY_DOCUMENT_QUERY_SCHEMA = z
  .object({
    documentNumber: z
      .string()
      .trim()
      .min(6, 'Documento inválido'),
  })
  .strict();
