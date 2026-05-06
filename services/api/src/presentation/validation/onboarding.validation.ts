import { z } from 'zod';

export const REPLACE_SPORT_PROFILES_BODY_SCHEMA = z
  .object({
    items: z
      .array(
        z
          .object({
            sportId: z.string().uuid(),
            skillLevel: z.coerce.number().min(1.0).max(7.0),
            sidePreference: z.enum(['RIGHT', 'LEFT', 'ANY']).optional(),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();

const DAY_ENUM = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);
const SLOT_ENUM = z.enum(['MORNING', 'AFTERNOON', 'EVENING']);

export const REPLACE_AVAILABILITY_BODY_SCHEMA = z
  .object({
    items: z
      .array(
        z
          .object({
            dayOfWeek: DAY_ENUM,
            slot: SLOT_ENUM,
          })
          .strict(),
      )
      .max(21),
  })
  .strict();

export const UPSERT_LOCATION_BODY_SCHEMA = z
  .object({
    label: z.string().min(1).max(200).optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().int().min(1).max(100),
  })
  .strict();
