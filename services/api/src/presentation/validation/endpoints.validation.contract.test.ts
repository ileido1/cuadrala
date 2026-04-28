import { describe, expect, it } from 'vitest';

import {
  LOGIN_BODY_SCHEMA,
  REFRESH_BODY_SCHEMA,
  REGISTER_BODY_SCHEMA,
} from './auth.validation.js';
import { CREATE_AMERICANO_BODY_SCHEMA } from './americano.validation.js';
import { MATCHMAKING_PARAMS_SCHEMA, MATCHMAKING_QUERY_SCHEMA } from './matchmaking.validation.js';
import {
  CREATE_OBLIGATIONS_BODY_SCHEMA,
  MATCH_ID_PARAM_SCHEMA,
  TRANSACTION_ID_PARAM_SCHEMA,
  UPDATE_SUBSCRIPTION_BODY_SCHEMA,
  USER_ID_PARAM_SCHEMA,
  USER_TRANSACTIONS_QUERY_SCHEMA,
} from './monetization.validation.js';
import { RECALCULATE_RANKING_PARAMS_SCHEMA } from './ranking.validation.js';
import {
  GENERATE_TOURNAMENT_AMERICANO_SCHEDULE_BODY_SCHEMA,
  TOURNAMENT_ID_PARAM_SCHEMA,
} from './tournament_americano_schedule.validation.js';

const SAMPLE_UUID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('CREATE_AMERICANO_BODY_SCHEMA', () => {
  it('rechaza menos de dos participantes', () => {
    const RESULT = CREATE_AMERICANO_BODY_SCHEMA.safeParse({
      categoryId: SAMPLE_UUID,
      participantUserIds: [OTHER_UUID],
    });
    expect(RESULT.success).toBe(false);
  });

  it('acepta cuerpo mínimo válido', () => {
    const RESULT = CREATE_AMERICANO_BODY_SCHEMA.safeParse({
      categoryId: SAMPLE_UUID,
      participantUserIds: [OTHER_UUID, SAMPLE_UUID],
    });
    expect(RESULT.success).toBe(true);
  });
});

describe('TOURNAMENT_ID_PARAM_SCHEMA', () => {
  it('rechaza tournamentId inválido', () => {
    const RESULT = TOURNAMENT_ID_PARAM_SCHEMA.safeParse({ tournamentId: 'x' });
    expect(RESULT.success).toBe(false);
  });
});

describe('GENERATE_TOURNAMENT_AMERICANO_SCHEDULE_BODY_SCHEMA', () => {
  it('rechaza duplicados', () => {
    const RESULT = GENERATE_TOURNAMENT_AMERICANO_SCHEDULE_BODY_SCHEMA.safeParse({
      participantUserIds: [SAMPLE_UUID, SAMPLE_UUID, OTHER_UUID, OTHER_UUID],
    });
    expect(RESULT.success).toBe(false);
  });

  it('rechaza conteo no múltiplo de 4', () => {
    const RESULT = GENERATE_TOURNAMENT_AMERICANO_SCHEDULE_BODY_SCHEMA.safeParse({
      participantUserIds: [SAMPLE_UUID, OTHER_UUID, SAMPLE_UUID, OTHER_UUID, SAMPLE_UUID],
    });
    expect(RESULT.success).toBe(false);
  });

  it('acepta cuerpo válido (múltiplo de 4)', () => {
    const RESULT = GENERATE_TOURNAMENT_AMERICANO_SCHEDULE_BODY_SCHEMA.safeParse({
      participantUserIds: [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440004',
      ],
    });
    expect(RESULT.success).toBe(true);
  });
});

describe('MATCHMAKING_PARAMS_SCHEMA', () => {
  it('rechaza matchId inválido', () => {
    const RESULT = MATCHMAKING_PARAMS_SCHEMA.safeParse({ matchId: 'no-uuid' });
    expect(RESULT.success).toBe(false);
  });
});

describe('MATCHMAKING_QUERY_SCHEMA', () => {
  it('aplica límite por defecto', () => {
    const RESULT = MATCHMAKING_QUERY_SCHEMA.parse({});
    expect(RESULT.limit).toBe(10);
  });
});

describe('RECALCULATE_RANKING_PARAMS_SCHEMA', () => {
  it('rechaza categoryId inválido', () => {
    const RESULT = RECALCULATE_RANKING_PARAMS_SCHEMA.safeParse({ categoryId: 'x' });
    expect(RESULT.success).toBe(false);
  });
});

describe('MATCH_ID_PARAM_SCHEMA', () => {
  it('rechaza matchId inválido', () => {
    const RESULT = MATCH_ID_PARAM_SCHEMA.safeParse({ matchId: 'no-uuid' });
    expect(RESULT.success).toBe(false);
  });
});

describe('TRANSACTION_ID_PARAM_SCHEMA', () => {
  it('rechaza transactionId inválido', () => {
    const RESULT = TRANSACTION_ID_PARAM_SCHEMA.safeParse({ transactionId: 'x' });
    expect(RESULT.success).toBe(false);
  });
});

describe('USER_ID_PARAM_SCHEMA', () => {
  it('rechaza userId inválido', () => {
    const RESULT = USER_ID_PARAM_SCHEMA.safeParse({ userId: 'bad' });
    expect(RESULT.success).toBe(false);
  });
});

describe('CREATE_OBLIGATIONS_BODY_SCHEMA', () => {
  it('rechaza monto no positivo', () => {
    const RESULT = CREATE_OBLIGATIONS_BODY_SCHEMA.safeParse({
      amountBasePerPerson: 0,
    });
    expect(RESULT.success).toBe(false);
  });

  it('acepta cuerpo mínimo válido', () => {
    const RESULT = CREATE_OBLIGATIONS_BODY_SCHEMA.safeParse({
      amountBasePerPerson: 15.5,
    });
    expect(RESULT.success).toBe(true);
  });
});

describe('UPDATE_SUBSCRIPTION_BODY_SCHEMA', () => {
  it('rechaza tipo inválido', () => {
    const RESULT = UPDATE_SUBSCRIPTION_BODY_SCHEMA.safeParse({
      subscriptionType: 'PREMIUM',
    });
    expect(RESULT.success).toBe(false);
  });
});

describe('USER_TRANSACTIONS_QUERY_SCHEMA', () => {
  it('aplica limit por defecto', () => {
    const RESULT = USER_TRANSACTIONS_QUERY_SCHEMA.parse({});
    expect(RESULT.limit).toBe(50);
  });

  it('rechaza limit mayor a 100', () => {
    const RESULT = USER_TRANSACTIONS_QUERY_SCHEMA.safeParse({ limit: 200 });
    expect(RESULT.success).toBe(false);
  });
});

describe('REGISTER_BODY_SCHEMA', () => {
  it('rechaza contraseña corta', () => {
    const RESULT = REGISTER_BODY_SCHEMA.safeParse({
      email: 'a@b.com',
      password: 'short',
      name: 'Nombre',
    });
    expect(RESULT.success).toBe(false);
  });

  it('acepta registro valido', () => {
    const RESULT = REGISTER_BODY_SCHEMA.safeParse({
      email: 'a@b.com',
      password: 'password123',
      name: 'Nombre',
    });
    expect(RESULT.success).toBe(true);
  });
});

describe('LOGIN_BODY_SCHEMA', () => {
  it('rechaza email invalido', () => {
    const RESULT = LOGIN_BODY_SCHEMA.safeParse({
      email: 'no-email',
      password: 'x',
    });
    expect(RESULT.success).toBe(false);
  });
});

describe('REFRESH_BODY_SCHEMA', () => {
  it('rechaza refreshToken vacio', () => {
    const RESULT = REFRESH_BODY_SCHEMA.safeParse({ refreshToken: '' });
    expect(RESULT.success).toBe(false);
  });
});
