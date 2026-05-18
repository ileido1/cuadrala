/** Minutos desde las 08:00 (inicio del grid de agenda). */
export const SCHEDULE_GRID_START_HOUR = 8;

export type TimedBookingLike = {
  id: string;
  timeStart: string;
  timeEnd: string;
};

export type LayoutTimedBooking<T extends TimedBookingLike> = T & {
  layoutColumn: number;
  layoutColumnCount: number;
};

function timeToMinutesFromGridStart(_time: string): number {
  const [H, M] = _time.split(':').map(Number);
  return (H - SCHEDULE_GRID_START_HOUR) * 60 + (M ?? 0);
}

function rangesOverlap(
  _aStart: number,
  _aEnd: number,
  _bStart: number,
  _bEnd: number,
): boolean {
  return _aStart < _bEnd && _bStart < _aEnd;
}

function findOverlapClusterIds(
  _ranges: Array<{ id: string; startMin: number; endMin: number }>,
): Map<string, Set<string>> {
  const CLUSTER_BY_ID = new Map<string, Set<string>>();

  for (let i = 0; i < _ranges.length; i++) {
    for (let j = i + 1; j < _ranges.length; j++) {
      const A = _ranges[i]!;
      const B = _ranges[j]!;
      if (!rangesOverlap(A.startMin, A.endMin, B.startMin, B.endMin)) {
        continue;
      }
      const CLUSTER_A = CLUSTER_BY_ID.get(A.id) ?? new Set([A.id]);
      const CLUSTER_B = CLUSTER_BY_ID.get(B.id) ?? new Set([B.id]);
      const MERGED = new Set([...CLUSTER_A, ...CLUSTER_B]);
      for (const ID of MERGED) {
        CLUSTER_BY_ID.set(ID, MERGED);
      }
    }
  }

  return CLUSTER_BY_ID;
}

/**
 * Asigna columnas horizontales a reservas del mismo día que se solapan en el tiempo.
 */
export function layoutOverlappingBookings<T extends TimedBookingLike>(
  _bookings: T[],
): LayoutTimedBooking<T>[] {
  if (_bookings.length === 0) {
    return [];
  }

  const WITH_RANGE = _bookings
    .map((b) => ({
      booking: b,
      startMin: timeToMinutesFromGridStart(b.timeStart),
      endMin: timeToMinutesFromGridStart(b.timeEnd),
    }))
    .sort(
      (a, b) =>
        a.startMin - b.startMin
        || a.endMin - b.endMin
        || a.booking.id.localeCompare(b.booking.id),
    );

  const CLUSTER_MAP = findOverlapClusterIds(
    WITH_RANGE.map((r) => ({
      id: r.booking.id,
      startMin: r.startMin,
      endMin: r.endMin,
    })),
  );

  const COLUMN_ENDS_BY_CLUSTER = new Map<string, number[]>();
  const LAYOUT = new Map<string, { column: number; columnCount: number }>();

  for (const { booking, startMin, endMin } of WITH_RANGE) {
    const CLUSTER =
      CLUSTER_MAP.get(booking.id) ?? new Set([booking.id]);
    const CLUSTER_KEY = [...CLUSTER].sort().join('|');
    const COLUMN_ENDS = COLUMN_ENDS_BY_CLUSTER.get(CLUSTER_KEY) ?? [];

    let column = COLUMN_ENDS.findIndex((end) => end <= startMin);
    if (column === -1) {
      column = COLUMN_ENDS.length;
      COLUMN_ENDS.push(endMin);
    } else {
      COLUMN_ENDS[column] = endMin;
    }
    COLUMN_ENDS_BY_CLUSTER.set(CLUSTER_KEY, COLUMN_ENDS);

    LAYOUT.set(booking.id, {
      column,
      columnCount: Math.max(LAYOUT.get(booking.id)?.columnCount ?? 0, column + 1),
    });
  }

  // columnCount = máximo de columnas usadas en el cluster
  const MAX_COLUMNS_BY_CLUSTER = new Map<string, number>();
  for (const { booking } of WITH_RANGE) {
    const CLUSTER =
      CLUSTER_MAP.get(booking.id) ?? new Set([booking.id]);
    const CLUSTER_KEY = [...CLUSTER].sort().join('|');
    const CURRENT = LAYOUT.get(booking.id)!;
    const PREV = MAX_COLUMNS_BY_CLUSTER.get(CLUSTER_KEY) ?? 0;
    MAX_COLUMNS_BY_CLUSTER.set(
      CLUSTER_KEY,
      Math.max(PREV, CURRENT.column + 1),
    );
  }

  return WITH_RANGE.map(({ booking }) => {
    const CLUSTER =
      CLUSTER_MAP.get(booking.id) ?? new Set([booking.id]);
    const CLUSTER_KEY = [...CLUSTER].sort().join('|');
    const POS = LAYOUT.get(booking.id)!;
    return {
      ...booking,
      layoutColumn: POS.column,
      layoutColumnCount: MAX_COLUMNS_BY_CLUSTER.get(CLUSTER_KEY) ?? 1,
    };
  });
}
