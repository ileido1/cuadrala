import 'dotenv/config';

import { createApp } from './app.js';
import { ENV_CONST } from './config/env.js';

const APP = createApp();

APP.listen(ENV_CONST.PORT, () => {
  // Mensaje simple para confirmar bootstrap local.
  console.log(`API activa en puerto ${ENV_CONST.PORT}`);
});
