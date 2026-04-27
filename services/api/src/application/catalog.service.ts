import { listFormatPresetsBySportRepo } from '../infrastructure/repositories/format_preset.repository.js';
import { listSportsRepo } from '../infrastructure/repositories/sport.repository.js';

export async function listSportsSV(): Promise<{ id: string; code: string; name: string }[]> {
  const ROWS = await listSportsRepo();
  return ROWS.map((_r) => ({
    id: _r.id,
    code: _r.code,
    name: _r.name,
  }));
}

export async function listFormatPresetsBySportSV(
  _sportId: string,
): Promise<
  {
    id: string;
    sportId: string;
    code: string;
    name: string;
    schemaVersion: number;
    defaultParameters: unknown;
  }[]
> {
  const ROWS = await listFormatPresetsBySportRepo(_sportId);
  return ROWS.map((_r) => ({
    id: _r.id,
    sportId: _r.sportId,
    code: _r.code,
    name: _r.name,
    schemaVersion: _r.schemaVersion,
    defaultParameters: _r.defaultParameters,
  }));
}
