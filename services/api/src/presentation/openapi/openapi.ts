const OPENAPI_CONST = {
  openapi: '3.0.3',
  info: {
    title: 'Cuádrala API',
    version: '1.0.0',
    description:
      'Documentación OpenAPI del servicio API (Express + Prisma). Esta especificación está pensada como base y puede evolucionar por endpoint.',
  },
  servers: [
    {
      url: '/',
      description: 'Servidor actual',
    },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Profile' },
    { name: 'Catalog' },
    { name: 'Tournaments' },
    { name: 'Americanos' },
    { name: 'Matches' },
    { name: 'Matchmaking' },
    { name: 'Ranking' },
    { name: 'Monetization' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'OK',
          },
        },
      },
    },
    '/api/v1/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness check (dependencias: DB)',
        responses: {
          '200': {
            description: 'Ready',
          },
          '503': {
            description: 'Not ready',
          },
        },
      },
    },
    '/api/v1/sports': {
      get: {
        tags: ['Catalog'],
        summary: 'Listar deportes',
        responses: {
          '200': { description: 'OK' },
        },
      },
    },
    '/api/v1/sports/{sportId}/tournament-format-presets': {
      get: {
        tags: ['Catalog'],
        summary: 'Listar presets de formato por deporte',
        parameters: [
          {
            name: 'sportId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/tournaments': {
      post: {
        tags: ['Tournaments'],
        summary: 'Crear torneo parametrizado',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'categoryId', 'sportId'],
                properties: {
                  name: { type: 'string' },
                  categoryId: { type: 'string', format: 'uuid' },
                  sportId: { type: 'string', format: 'uuid' },
                  formatPresetId: { type: 'string', format: 'uuid' },
                  formatPresetCode: { type: 'string', description: 'Código del preset (ej. AMERICANO).' },
                  formatParameters: { type: 'object', additionalProperties: true },
                  startsAt: { type: 'string', format: 'date-time' },
                },
                anyOf: [{ required: ['formatPresetId'] }, { required: ['formatPresetCode'] }],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Creado' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/tournaments/{tournamentId}/americano-schedule:generate': {
      post: {
        tags: ['Tournaments'],
        summary: 'Generar calendario Americano (determinista)',
        parameters: [
          { name: 'tournamentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['participantUserIds'],
                properties: {
                  participantUserIds: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                    minItems: 4,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '409': { description: 'Calendario ya generado con inputs distintos' },
        },
      },
    },
    '/api/v1/tournaments/{tournamentId}/americano-schedule': {
      get: {
        tags: ['Tournaments'],
        summary: 'Consultar calendario Americano generado',
        parameters: [
          { name: 'tournamentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '404': { description: 'Calendario no encontrado' },
        },
      },
    },
    '/api/v1/tournaments/{tournamentId}/scoreboard': {
      get: {
        tags: ['Tournaments'],
        summary: 'Consultar scoreboard de un torneo',
        parameters: [
          { name: 'tournamentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '404': { description: 'Torneo no encontrado' },
        },
      },
    },
    '/api/v1/americanos': {
      post: {
        tags: ['Americanos'],
        summary: 'Crear partido (preset Americano)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['categoryId', 'participantUserIds'],
                properties: {
                  categoryId: { type: 'string', format: 'uuid' },
                  sportId: { type: 'string', format: 'uuid' },
                  tournamentId: { type: 'string', format: 'uuid' },
                  participantUserIds: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                    minItems: 2,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Creado' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/matches/open': {
      get: {
        tags: ['Matches'],
        summary: 'Listar partidas abiertas con cupos vacíos',
        parameters: [
          { name: 'sportId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'categoryId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          {
            name: 'scheduledFrom',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'scheduledTo',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/matches': {
      get: {
        tags: ['Matches'],
        summary: 'Listar partidos',
        parameters: [
          { name: 'sportId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'categoryId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'] },
          },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          {
            name: 'scheduledFrom',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'scheduledTo',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
      post: {
        tags: ['Matches'],
        summary: 'Crear partido',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sportId', 'categoryId'],
                properties: {
                  sportId: { type: 'string', format: 'uuid' },
                  categoryId: { type: 'string', format: 'uuid' },
                  type: { type: 'string', enum: ['AMERICANO', 'REGULAR'] },
                  scheduledAt: { type: 'string', format: 'date-time' },
                  courtId: { type: 'string', format: 'uuid' },
                  tournamentId: { type: 'string', format: 'uuid' },
                  maxParticipants: { type: 'integer', minimum: 2, maximum: 100 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Creado' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
        },
      },
    },
    '/api/v1/matches/{matchId}': {
      get: {
        tags: ['Matches'],
        summary: 'Obtener partido por id',
        parameters: [
          { name: 'matchId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '404': { description: 'Partido no encontrado' },
        },
      },
      patch: {
        tags: ['Matches'],
        summary: 'Actualizar partido',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'matchId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  scheduledAt: { type: ['string', 'null'], format: 'date-time' },
                  courtId: { type: ['string', 'null'], format: 'uuid' },
                  maxParticipants: { type: 'integer', minimum: 2, maximum: 100 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '403': { description: 'Prohibido' },
          '404': { description: 'Partido no encontrado' },
          '409': { description: 'Conflicto' },
        },
      },
    },
    '/api/v1/matches/{matchId}/cancel': {
      patch: {
        tags: ['Matches'],
        summary: 'Cancelar partido',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'matchId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '403': { description: 'Prohibido' },
          '404': { description: 'Partido no encontrado' },
          '409': { description: 'Conflicto' },
        },
      },
    },
    '/api/v1/matches/{matchId}/join': {
      post: {
        tags: ['Matches'],
        summary: 'Unirse a un partido (validación de cupo y categoría)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'matchId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'No autorizado' },
          '403': { description: 'Categoría no compatible' },
          '404': { description: 'Partido no encontrado' },
          '409': { description: 'Conflicto (lleno / ya unido / no abierto)' },
        },
      },
    },
    '/api/v1/matchmaking/{matchId}/suggestions': {
      get: {
        tags: ['Matchmaking'],
        summary: 'Sugerencias de jugadores para un partido',
        parameters: [
          {
            name: 'matchId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/ranking/recalculate/{categoryId}': {
      post: {
        tags: ['Ranking'],
        summary: 'Recalcular ranking por categoría',
        parameters: [
          {
            name: 'categoryId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar usuario',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refrescar token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
        },
      },
    },
    '/api/v1/users/me': {
      get: {
        tags: ['Profile'],
        summary: 'Consultar perfil propio',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'No autorizado' },
        },
      },
      patch: {
        tags: ['Profile'],
        summary: 'Actualizar perfil propio',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'No autorizado' },
        },
      },
    },
    '/api/v1/matches/{matchId}/transactions/create-obligations': {
      post: {
        tags: ['Monetization'],
        summary: 'Crear obligaciones por participante',
        parameters: [
          {
            name: 'matchId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amountBasePerPerson'],
                properties: {
                  amountBasePerPerson: { type: 'number', minimum: 0 },
                  participantUserIds: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/matches/{matchId}/transactions/summary': {
      get: {
        tags: ['Monetization'],
        summary: 'Resumen de obligaciones de un match',
        parameters: [
          {
            name: 'matchId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/transactions/{transactionId}/confirm-manual': {
      patch: {
        tags: ['Monetization'],
        summary: 'Confirmar pago manual',
        parameters: [
          {
            name: 'transactionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/users/{userId}/subscription': {
      patch: {
        tags: ['Monetization'],
        summary: 'Actualizar suscripción de un usuario',
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subscriptionType'],
                properties: {
                  subscriptionType: { type: 'string', enum: ['FREE', 'PRO'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/users/{userId}/transactions': {
      get: {
        tags: ['Monetization'],
        summary: 'Listar transacciones de un usuario',
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
  },
};

export { OPENAPI_CONST };

