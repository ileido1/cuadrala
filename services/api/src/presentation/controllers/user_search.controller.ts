import type { Request, Response } from 'express';

import { SEARCH_USERS_BY_DOCUMENT_UC } from '../composition/user_search.composition.js';
import { SEARCH_USERS_BY_DOCUMENT_QUERY_SCHEMA } from '../validation/user_search.validation.js';

export async function searchUsersByDocumentCON(_req: Request, _res: Response): Promise<void> {
  const QUERY = SEARCH_USERS_BY_DOCUMENT_QUERY_SCHEMA.parse(_req.query);

  const USERS = await SEARCH_USERS_BY_DOCUMENT_UC.executeSV(QUERY.documentNumber);

  _res.status(200).json({
    success: true,
    message: 'Usuarios encontrados',
    data: { items: USERS },
  });
}
