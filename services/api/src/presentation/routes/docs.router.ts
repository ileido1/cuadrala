import { Router } from 'express';

import { OPENAPI_CONST } from '../openapi/openapi.js';

export const DOCS_ROUTER = Router();

DOCS_ROUTER.get('/openapi.json', (_req, _res) => {
  _res.status(200).json(OPENAPI_CONST);
});

DOCS_ROUTER.get('/docs', (_req, _res) => {
  const OPENAPI_URL = '/openapi.json';

  _res.status(200).type('html').send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Cuádrala API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: ${JSON.stringify(OPENAPI_URL)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout'
      });
    </script>
  </body>
</html>`);
});

