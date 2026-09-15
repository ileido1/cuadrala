import type { FormatParameterFieldSchema } from '../../ports/tournament_format_parameters_validator.js';

/** Base format codes that every sport gets as a v1 preset. */
export type FormatPresetV1Code = 'AMERICANO' | 'ROUND_ROBIN' | 'SINGLE_ELIMINATION';

/**
 * @name    :FORMAT_PRESET_V1_PARAMETERS_SCHEMAS
 * @version :1.0.0
 * @description :`parametersSchema` of each base v1 preset. The validator only
 * reads the preset's schema, so a v1 preset stored without one rejects every
 * `formatParameters` key. The seed and the test catalog helper read this single
 * source; migration `20260911120000_backfill_v1_preset_parameters_schema` wrote
 * the same values into presets created before the column existed.
 */
export const FORMAT_PRESET_V1_PARAMETERS_SCHEMAS: Record<
  FormatPresetV1Code,
  FormatParameterFieldSchema[]
> = {
  AMERICANO: [
    { key: 'rounds', type: 'int', label: 'Rondas', required: false, min: 1, max: 50 },
    { key: 'courts', type: 'int', label: 'Canchas', required: false, min: 1, max: 10 },
  ],
  ROUND_ROBIN: [{ key: 'doubleRound', type: 'boolean', label: 'Doble vuelta', required: false }],
  SINGLE_ELIMINATION: [
    { key: 'thirdPlaceMatch', type: 'boolean', label: 'Tercer lugar', required: false },
  ],
};
