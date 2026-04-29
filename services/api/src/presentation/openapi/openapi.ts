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
    { name: 'Notifications' },
    { name: 'Venues' },
    { name: 'Geo' },
    { name: 'Admin' },
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
    '/api/v1/sports/{sportId}/tournament-format-presets/{code}/versions': {
      post: {
        tags: ['Catalog'],
        summary: 'Publicar nueva versión de preset (MVP)',
        parameters: [
          { name: 'sportId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'code', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'schemaVersion', 'defaultParameters'],
                properties: {
                  name: { type: 'string' },
                  schemaVersion: { type: 'integer', minimum: 1 },
                  defaultParameters: { type: 'object', additionalProperties: true },
                  effectiveFrom: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Creado' },
          '400': { description: 'Validación fallida' },
          '404': { description: 'Deporte no encontrado' },
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
                  formatParameters: {
                    description:
                      'Parámetros específicos del formato (schemaVersion=1). El backend rechaza keys extra (additionalProperties=false).',
                    oneOf: [
                      {
                        title: 'AMERICANO v1',
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          rounds: { type: 'integer', minimum: 1 },
                          courts: { type: 'integer', minimum: 1 },
                        },
                      },
                      {
                        title: 'ROUND_ROBIN v1',
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          doubleRound: { type: 'boolean' },
                        },
                      },
                    ],
                  },
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
          { name: 'near', in: 'query', required: false, schema: { type: 'string', example: '-34.6,-58.4' } },
          { name: 'radiusKm', in: 'query', required: false, schema: { type: 'number', minimum: 0.1, maximum: 200 } },
          { name: 'minPricePerPlayerCents', in: 'query', required: false, schema: { type: 'integer', minimum: 0 } },
          { name: 'maxPricePerPlayerCents', in: 'query', required: false, schema: { type: 'integer', minimum: 0 } },
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
                  pricePerPlayerCents: { type: 'integer', minimum: 0, maximum: 100000000 },
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
                  pricePerPlayerCents: { type: 'integer', minimum: 0, maximum: 100000000 },
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
    '/api/v1/matches/{matchId}/leave': {
      post: {
        tags: ['Matches'],
        summary: 'Salir de un partido (idempotente mientras esté SCHEDULED)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'matchId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'Sin contenido' },
          '401': { description: 'No autorizado' },
          '404': { description: 'Partido no encontrado' },
          '409': { description: 'Conflicto (no está SCHEDULED)' },
        },
      },
    },
    '/api/v1/matches/{matchId}/start': {
      post: {
        tags: ['Matches'],
        summary: 'Iniciar un partido (SCHEDULED -> IN_PROGRESS)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'matchId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'Sin contenido' },
          '401': { description: 'No autorizado' },
          '403': { description: 'Prohibido (no organizer)' },
          '404': { description: 'Partido no encontrado' },
          '409': { description: 'Conflicto (no está SCHEDULED)' },
        },
      },
    },
    '/api/v1/matches/{matchId}/finish': {
      post: {
        tags: ['Matches'],
        summary: 'Finalizar un partido (IN_PROGRESS -> FINISHED, requiere 4 participantes)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'matchId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'Sin contenido' },
          '401': { description: 'No autorizado' },
          '403': { description: 'Prohibido (no organizer)' },
          '404': { description: 'Partido no encontrado' },
          '409': { description: 'Conflicto (no está IN_PROGRESS o participantes != 4)' },
        },
      },
    },
    '/api/v1/matches/{matchId}/result-draft': {
      put: {
        tags: ['Matches'],
        summary: 'Guardar borrador de resultado (requiere partido FINISHED y 4 participantes)',
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
                required: ['scores'],
                properties: {
                  scores: {
                    type: 'array',
                    minItems: 4,
                    maxItems: 4,
                    items: {
                      type: 'object',
                      required: ['userId', 'points'],
                      properties: {
                        userId: { type: 'string', format: 'uuid' },
                        points: { type: 'integer', minimum: 0, maximum: 10000 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Actualizado' },
          '201': { description: 'Creado' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '403': { description: 'Prohibido' },
          '404': { description: 'Partido no encontrado' },
          '409': { description: 'Conflicto' },
        },
      },
    },
    '/api/v1/matches/{matchId}/result-draft/confirm': {
      post: {
        tags: ['Matches'],
        summary: 'Confirmar/rechazar borrador de resultado (al 4/4 CONFIRMED finaliza)',
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
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['CONFIRMED', 'REJECTED'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '201': { description: 'Finalizado' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '403': { description: 'Prohibido' },
          '404': { description: 'Borrador no encontrado' },
          '409': { description: 'Conflicto' },
        },
      },
    },
    '/api/v1/matches/{matchId}/result-draft/reproposal': {
      post: {
        tags: ['Matches'],
        summary: 'Crear re-propuesta de resultado tras REJECTED (versiona y resetea confirmaciones)',
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
                required: ['scores'],
                properties: {
                  scores: {
                    type: 'array',
                    minItems: 4,
                    maxItems: 4,
                    items: {
                      type: 'object',
                      required: ['userId', 'points'],
                      properties: {
                        userId: { type: 'string', format: 'uuid' },
                        points: { type: 'integer', minimum: 0, maximum: 10000 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Creado' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '403': { description: 'Prohibido' },
          '404': { description: 'Borrador no encontrado / partido no encontrado' },
          '409': { description: 'Conflicto (no REJECTED / no FINISHED)' },
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
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 50 } },
          { name: 'radiusKm', in: 'query', required: false, schema: { type: 'number', minimum: 0.1, maximum: 200 } },
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
          '201': { description: 'Creado' },
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
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Cerrar sesión (logout)',
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
    '/api/v1/users/me/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Consultar perfil técnico propio',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'No autorizado' },
        },
      },
      patch: {
        tags: ['Profile'],
        summary: 'Actualizar perfil técnico propio',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  dominantHand: { type: 'string', enum: ['RIGHT', 'LEFT', 'AMBIDEXTROUS'] },
                  sidePreference: { type: 'string', enum: ['RIGHT', 'LEFT', 'ANY'] },
                  birthYear: { type: ['integer', 'null'], minimum: 1900 },
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
    '/api/v1/users/{userId}/stats': {
      get: {
        tags: ['Profile'],
        summary: 'Consultar estadísticas públicas de un usuario',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '404': { description: 'Usuario no encontrado' },
        },
      },
    },
    '/api/v1/users/{userId}/ratings': {
      get: {
        tags: ['Profile'],
        summary: 'Consultar ratings Elo de un usuario',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'categoryId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              categoryId: { type: 'string', format: 'uuid' },
                              rating: { type: 'number' },
                              updatedAt: { type: 'string', format: 'date-time' },
                            },
                            required: ['categoryId', 'rating', 'updatedAt'],
                          },
                        },
                      },
                      required: ['items'],
                    },
                  },
                  required: ['success', 'message', 'data'],
                },
              },
            },
          },
          '400': { description: 'Validación fallida' },
          '404': { description: 'Usuario no encontrado' },
        },
      },
    },
    '/api/v1/users/{userId}/ratings/history': {
      get: {
        tags: ['Profile'],
        summary: 'Consultar historial de rating Elo de un usuario',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'categoryId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              matchId: { type: 'string', format: 'uuid' },
                              resultId: { type: 'string', format: 'uuid' },
                              previousRating: { type: 'number' },
                              newRating: { type: 'number' },
                              kFactor: { type: 'number' },
                              createdAt: { type: 'string', format: 'date-time' },
                            },
                            required: [
                              'matchId',
                              'resultId',
                              'previousRating',
                              'newRating',
                              'kFactor',
                              'createdAt',
                            ],
                          },
                        },
                        pageInfo: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' },
                          },
                          required: ['page', 'limit', 'total'],
                        },
                      },
                      required: ['items', 'pageInfo'],
                    },
                  },
                  required: ['success', 'message', 'data'],
                },
              },
            },
          },
          '400': { description: 'Validación fallida' },
          '404': { description: 'Usuario no encontrado' },
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
    '/api/v1/transactions/{transactionId}/receipt': {
      post: {
        tags: ['Monetization'],
        summary: 'Adjuntar comprobante (imagen) a transacción',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'transactionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '403': { description: 'No autorizado' },
          '404': { description: 'Transacción no encontrada' },
        },
      },
    },
    '/api/v1/transactions/{transactionId}/receipt/{receiptId}': {
      get: {
        tags: ['Monetization'],
        summary: 'Descargar comprobante (imagen) de transacción',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'transactionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'receiptId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'image/jpeg': { schema: { type: 'string', format: 'binary' } },
              'image/png': { schema: { type: 'string', format: 'binary' } },
              'image/webp': { schema: { type: 'string', format: 'binary' } },
            },
          },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '403': { description: 'No autorizado' },
          '404': { description: 'Comprobante no encontrado' },
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
    '/api/v1/users/me/notification-subscriptions': {
      get: {
        tags: ['Notifications'],
        summary: 'Listar suscripciones de notificación del usuario actual',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'No autorizado' },
        },
      },
      post: {
        tags: ['Notifications'],
        summary: 'Crear/actualizar una suscripción de notificación del usuario actual',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['enabled'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  categoryId: { type: 'string', format: 'uuid', nullable: true },
                  nearLat: { type: 'number', nullable: true },
                  nearLng: { type: 'number', nullable: true },
                  radiusKm: { type: 'number', nullable: true },
                  enabled: { type: 'boolean' },
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
    '/api/v1/users/me/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Listar notificaciones in-app del usuario actual',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['unread', 'all'], default: 'unread' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
        },
      },
    },
    '/api/v1/users/me/notifications/{deliveryId}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Marcar una notificación in-app como leída',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'deliveryId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '404': { description: 'No encontrado' },
        },
      },
    },
    '/api/v1/users/me/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Marcar todas las notificaciones in-app como leídas',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'No autorizado' },
        },
      },
    },
    '/api/v1/users/me/notification-subscriptions/{id}': {
      delete: {
        tags: ['Notifications'],
        summary: 'Deshabilitar una suscripción de notificación del usuario actual',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'No Content' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '404': { description: 'No encontrado' },
        },
      },
    },
    '/api/v1/users/me/device-push-tokens': {
      get: {
        tags: ['Notifications'],
        summary: 'Listar tokens de dispositivo del usuario actual',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'No autorizado' },
        },
      },
      post: {
        tags: ['Notifications'],
        summary: 'Registrar/actualizar token de dispositivo del usuario actual (FCM)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: { type: 'string' },
                  enabled: { type: 'boolean', default: true },
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
    '/api/v1/users/me/device-push-tokens/{id}': {
      delete: {
        tags: ['Notifications'],
        summary: 'Deshabilitar token de dispositivo del usuario actual',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'No Content' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '404': { description: 'No encontrado' },
        },
      },
    },
    '/api/v1/notifications/dispatch': {
      post: {
        tags: ['Notifications'],
        summary: 'Procesar eventos de notificación pendientes (endpoint interno)',
        parameters: [
          {
            name: 'x-dispatch-secret',
            in: 'header',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  limitEvents: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
                  limitDeliveries: { type: 'integer', minimum: 1, maximum: 10000, default: 1000 },
                  limitTokens: { type: 'integer', minimum: 1, maximum: 100000 },
                },
                additionalProperties: false,
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
    '/api/v1/notifications/events/match-cancelled': {
      post: {
        tags: ['Notifications'],
        summary: 'Crear evento MATCH_CANCELLED y deliveries (endpoint interno)',
        parameters: [
          { name: 'x-dispatch-secret', in: 'header', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['matchId', 'categoryId', 'userIds'],
                properties: {
                  matchId: { type: 'string', format: 'uuid' },
                  categoryId: { type: 'string', format: 'uuid' },
                  userIds: { type: 'array', minItems: 1, items: { type: 'string', format: 'uuid' } },
                  payload: { type: 'object', additionalProperties: true },
                },
                additionalProperties: false,
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
    '/api/v1/notifications/metrics': {
      get: {
        tags: ['Notifications'],
        summary: 'Métricas internas de notificaciones (endpoint interno)',
        parameters: [
          {
            name: 'x-dispatch-secret',
            in: 'header',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'No autorizado' },
        },
      },
    },
    '/api/v1/ratings/leaderboard': {
      get: {
        tags: ['Ranking'],
        summary: 'Leaderboard Elo por categoría',
        parameters: [
          { name: 'categoryId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
        },
      },
    },
    '/api/v1/geo/places/search': {
      get: {
        tags: ['Geo'],
        summary: 'Buscar lugares por texto (endpoint interno)',
        parameters: [
          { name: 'x-geo-secret', in: 'header', required: true, schema: { type: 'string' } },
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'near', in: 'query', required: false, schema: { type: 'string', example: '10.1,-70.2' } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 10 } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '501': { description: 'Proveedor no configurado' },
        },
      },
    },
    '/api/v1/geo/places/{placeId}': {
      get: {
        tags: ['Geo'],
        summary: 'Obtener detalle de un lugar por placeId (endpoint interno)',
        parameters: [
          { name: 'x-geo-secret', in: 'header', required: true, schema: { type: 'string' } },
          { name: 'placeId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '404': { description: 'No encontrado' },
          '501': { description: 'Proveedor no configurado' },
        },
      },
    },
    '/api/v1/venues/{venueId}/geocode': {
      post: {
        tags: ['Venues', 'Geo'],
        summary: 'Geocodificar una sede (endpoint interno)',
        parameters: [
          { name: 'x-geo-secret', in: 'header', required: true, schema: { type: 'string' } },
          { name: 'venueId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['placeId'],
                properties: { placeId: { type: 'string' } },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '404': { description: 'No encontrado' },
          '501': { description: 'Proveedor no configurado' },
        },
      },
    },
    '/api/v1/vacant-hours/publish': {
      post: {
        tags: ['Admin'],
        summary: 'Publicar una vacante (endpoint interno)',
        parameters: [{ name: 'x-admin-secret', in: 'header', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['venueId', 'courtId', 'sportId', 'categoryId', 'scheduledAt'],
                properties: {
                  venueId: { type: 'string', format: 'uuid' },
                  courtId: { type: 'string', format: 'uuid' },
                  sportId: { type: 'string', format: 'uuid' },
                  categoryId: { type: 'string', format: 'uuid' },
                  scheduledAt: { type: 'string', format: 'date-time' },
                  durationMinutes: { type: 'integer', minimum: 1 },
                  pricePerPlayerCents: { type: 'integer', minimum: 0, maximum: 100000000 },
                  maxParticipants: { type: 'integer', minimum: 2, maximum: 100, default: 4 },
                },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          '201': { description: 'Creado' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '409': { description: 'Conflicto' },
        },
      },
    },
    '/api/v1/vacant-hours': {
      get: {
        tags: ['Admin'],
        summary: 'Listar vacantes (endpoint interno)',
        parameters: [
          { name: 'x-admin-secret', in: 'header', required: true, schema: { type: 'string' } },
          { name: 'venueId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'courtId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['PUBLISHED', 'CANCELLED'] } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
        },
      },
    },
    '/api/v1/vacant-hours/{id}/cancel': {
      patch: {
        tags: ['Admin'],
        summary: 'Cancelar una vacante (endpoint interno)',
        parameters: [
          { name: 'x-admin-secret', in: 'header', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validación fallida' },
          '401': { description: 'No autorizado' },
          '404': { description: 'No encontrado' },
        },
      },
    },
  },
};

export { OPENAPI_CONST };

