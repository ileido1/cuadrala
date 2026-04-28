import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorMiddleware } from './presentation/middleware/error.middleware.js';
import { DOCS_ROUTER } from './presentation/routes/docs.router.js';
import { API_V1_ROUTER } from './presentation/routes/api.v1.router.js';

/** Aplicación HTTP sin escuchar puerto (útil para tests con Supertest). */
export function createApp(): express.Express {
  const APP = express();

  APP.use(helmet());
  APP.use(cors());
  APP.use(express.json());
  APP.use(morgan('dev'));
  APP.use(DOCS_ROUTER);
  APP.use('/api/v1', API_V1_ROUTER);
  APP.use(errorMiddleware);

  return APP;
}
