import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  LIST_MATCH_CHAT_MESSAGES_UC,
  LIST_TOURNAMENT_CHAT_MESSAGES_UC,
  POST_MATCH_CHAT_MESSAGE_UC,
  POST_TOURNAMENT_CHAT_MESSAGE_UC,
} from '../composition/chat.composition.js';
import {
  LIST_CHAT_MESSAGES_QUERY_SCHEMA,
  MATCH_ID_PARAM_SCHEMA,
  POST_CHAT_MESSAGE_BODY_SCHEMA,
  TOURNAMENT_ID_PARAM_SCHEMA,
} from '../validation/chat.validation.js';

export async function getMatchChatMessagesCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = LIST_CHAT_MESSAGES_QUERY_SCHEMA.parse(_req.query);
  const LIMIT = QUERY.limit ?? 50;
  const CURSOR = QUERY.cursorCreatedAt !== undefined ? new Date(QUERY.cursorCreatedAt) : undefined;

  const RESULT = await LIST_MATCH_CHAT_MESSAGES_UC.executeSV({
    matchId: PARAMS.matchId,
    limit: LIMIT,
    cursorCreatedAt: CURSOR,
  });

  _res.status(200).json({
    success: true,
    message: 'Mensajes obtenidos correctamente.',
    data: RESULT,
  });
}

export async function postMatchChatMessageCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = POST_CHAT_MESSAGE_BODY_SCHEMA.parse(_req.body);

  const RESULT = await POST_MATCH_CHAT_MESSAGE_UC.executeSV({
    matchId: PARAMS.matchId,
    senderUserId: USER_ID,
    text: BODY.text,
  });

  _res.status(201).json({
    success: true,
    message: 'Mensaje enviado correctamente.',
    data: RESULT,
  });
}

export async function getTournamentChatMessagesCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = TOURNAMENT_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = LIST_CHAT_MESSAGES_QUERY_SCHEMA.parse(_req.query);
  const LIMIT = QUERY.limit ?? 50;
  const CURSOR = QUERY.cursorCreatedAt !== undefined ? new Date(QUERY.cursorCreatedAt) : undefined;

  const RESULT = await LIST_TOURNAMENT_CHAT_MESSAGES_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    limit: LIMIT,
    cursorCreatedAt: CURSOR,
  });

  _res.status(200).json({
    success: true,
    message: 'Mensajes obtenidos correctamente.',
    data: RESULT,
  });
}

export async function postTournamentChatMessageCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = TOURNAMENT_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = POST_CHAT_MESSAGE_BODY_SCHEMA.parse(_req.body);

  const RESULT = await POST_TOURNAMENT_CHAT_MESSAGE_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    senderUserId: USER_ID,
    text: BODY.text,
  });

  _res.status(201).json({
    success: true,
    message: 'Mensaje enviado correctamente.',
    data: RESULT,
  });
}

