import { AppError } from '../../domain/errors/app_error.js';
import type { MatchNotificationContextReadRepository } from '../../domain/ports/match_notification_context_read_repository.js';
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchmakingCandidateRepository } from '../../domain/ports/matchmaking_candidate_repository.js';
import type { RankingEntryReadRepository } from '../../domain/ports/ranking_entry_read_repository.js';
import type { UserGeoReadRepository } from '../../domain/ports/user_geo_read_repository.js';
import type { UserRatingRepository } from '../../domain/ports/user_rating_repository.js';

export type MatchmakingSuggestionV2DTO = {
  userId: string;
  name: string;
  source: 'ranking' | 'directory';
  points?: number;
  rating?: number;
};

function haversineKmSV(_lat1: number, _lng1: number, _lat2: number, _lng2: number): number {
  const R = 6371;
  const dLat = ((_lat2 - _lat1) * Math.PI) / 180;
  const dLng = ((_lng2 - _lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((_lat1 * Math.PI) / 180) *
      Math.cos((_lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function avgSV(_nums: number[]): number | null {
  if (_nums.length === 0) return null;
  const SUM = _nums.reduce((_acc, _n) => _acc + _n, 0);
  return SUM / _nums.length;
}

export class GetMatchmakingSuggestionsV2UseCase {
  constructor(
    private readonly _matchContextReadRepository: MatchNotificationContextReadRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository,
    private readonly _candidateRepository: MatchmakingCandidateRepository,
    private readonly _userRatingRepository: UserRatingRepository,
    private readonly _rankingEntryReadRepository: RankingEntryReadRepository,
    private readonly _userGeoReadRepository: UserGeoReadRepository,
  ) {}

  async executeSV(_input: {
    matchId: string;
    limit: number;
    radiusKm?: number;
    defaultRadiusKm?: number;
  }): Promise<MatchmakingSuggestionV2DTO[]> {
    const MATCH = await this._matchContextReadRepository.getByMatchIdSV(_input.matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    const CAP = Math.min(Math.max(_input.limit, 1), 50);
    const PARTICIPANT_IDS = await this._matchParticipationRepository.listParticipantUserIdsSV(_input.matchId);
    const EXCLUDE_IDS = [...new Set<string>(PARTICIPANT_IDS)];

    const WANT_GEO_FILTER =
      MATCH.venueLat !== null &&
      MATCH.venueLng !== null &&
      (_input.radiusKm !== undefined || _input.defaultRadiusKm !== undefined);
    const RADIUS_KM = _input.radiusKm ?? _input.defaultRadiusKm;

    const TARGET_RATING = await this.computeTargetRatingSV(MATCH.categoryId, PARTICIPANT_IDS);
    const TARGET_POINTS = TARGET_RATING === null ? await this.computeTargetPointsSV(MATCH.categoryId, PARTICIPANT_IDS) : null;

    const CANDIDATE_POOL = Math.min(Math.max(CAP * 25, 100), 500);

    if (TARGET_RATING !== null) {
      const RAW = await this._candidateRepository.listEloCandidatesSV({
        categoryId: MATCH.categoryId,
        excludeUserIds: EXCLUDE_IDS,
        limit: CANDIDATE_POOL,
      });

      const FILTERED = await this.applyGeoFilterSV(
        RAW.map((_r) => ({ userId: _r.userId, name: _r.name, rating: _r.rating })),
        WANT_GEO_FILTER ? { lat: MATCH.venueLat as number, lng: MATCH.venueLng as number, radiusKm: RADIUS_KM as number } : null,
      );

      const ORDERED = FILTERED.sort((_a, _b) => {
        const DA = Math.abs((_a.rating as number) - TARGET_RATING);
        const DB = Math.abs((_b.rating as number) - TARGET_RATING);
        if (DA !== DB) return DA - DB;
        return (_b.rating as number) - (_a.rating as number);
      });

      return ORDERED.slice(0, CAP).map((_r) => ({
        userId: _r.userId,
        name: _r.name,
        source: 'ranking',
        rating: _r.rating,
      }));
    }

    if (TARGET_POINTS !== null) {
      const RAW = await this._candidateRepository.listRankingCandidatesSV({
        categoryId: MATCH.categoryId,
        excludeUserIds: EXCLUDE_IDS,
        limit: CANDIDATE_POOL,
      });

      const FILTERED = await this.applyGeoFilterSV(
        RAW.map((_r) => ({ userId: _r.userId, name: _r.name, points: _r.points })),
        WANT_GEO_FILTER ? { lat: MATCH.venueLat as number, lng: MATCH.venueLng as number, radiusKm: RADIUS_KM as number } : null,
      );

      const ORDERED = FILTERED.sort((_a, _b) => {
        const DA = Math.abs((_a.points as number) - TARGET_POINTS);
        const DB = Math.abs((_b.points as number) - TARGET_POINTS);
        if (DA !== DB) return DA - DB;
        return (_b.points as number) - (_a.points as number);
      });

      return ORDERED.slice(0, CAP).map((_r) => ({
        userId: _r.userId,
        name: _r.name,
        source: 'ranking',
        points: _r.points,
      }));
    }

    const FALLBACK = await this._candidateRepository.listDirectoryCandidatesSV({
      categoryId: MATCH.categoryId,
      excludeUserIds: EXCLUDE_IDS,
      limit: CANDIDATE_POOL,
    });

    const FILTERED = await this.applyGeoFilterSV(
      FALLBACK.map((_u) => ({ userId: _u.userId, name: _u.name })),
      WANT_GEO_FILTER ? { lat: MATCH.venueLat as number, lng: MATCH.venueLng as number, radiusKm: RADIUS_KM as number } : null,
    );

    return FILTERED.slice(0, CAP).map((_u) => ({ userId: _u.userId, name: _u.name, source: 'directory' }));
  }

  private async computeTargetRatingSV(_categoryId: string, _participantUserIds: string[]): Promise<number | null> {
    const PARTICIPANT_RATINGS = await this._userRatingRepository.getRatingsByUserIdsSV(
      _categoryId,
      _participantUserIds,
    );
    const AVG_PARTICIPANTS = avgSV(PARTICIPANT_RATINGS.map((_r) => _r.rating));
    if (AVG_PARTICIPANTS !== null) return AVG_PARTICIPANTS;
    return this._candidateRepository.getCategoryAverageEloSV(_categoryId);
  }

  private async computeTargetPointsSV(_categoryId: string, _participantUserIds: string[]): Promise<number | null> {
    const PARTICIPANT_POINTS = await this._rankingEntryReadRepository.getPointsByUserIdsSV(
      _categoryId,
      _participantUserIds,
    );
    const AVG_PARTICIPANTS = avgSV(PARTICIPANT_POINTS.map((_r) => _r.points));
    if (AVG_PARTICIPANTS !== null) return AVG_PARTICIPANTS;
    return this._candidateRepository.getCategoryAveragePointsSV(_categoryId);
  }

  private async applyGeoFilterSV<T extends { userId: string; name: string; rating?: number; points?: number }>(
    _rows: T[],
    _filter: { lat: number; lng: number; radiusKm: number } | null,
  ): Promise<T[]> {
    if (_filter === null) return _rows;
    if (!Number.isFinite(_filter.radiusKm) || _filter.radiusKm <= 0) return _rows;

    const USER_IDS = _rows.map((_r) => _r.userId);
    const GEO_ROWS = await this._userGeoReadRepository.getByUserIdsSV(USER_IDS);
    const BY_USER = new Map<string, { nearLat: number | null; nearLng: number | null }>();
    for (const _g of GEO_ROWS) {
      BY_USER.set(_g.userId, { nearLat: _g.nearLat, nearLng: _g.nearLng });
    }

    return _rows.filter((_r) => {
      const GEO = BY_USER.get(_r.userId);
      // Si no hay geo, no filtramos al usuario.
      if (GEO === undefined || GEO.nearLat === null || GEO.nearLng === null) return true;
      const D = haversineKmSV(GEO.nearLat, GEO.nearLng, _filter.lat, _filter.lng);
      return D <= _filter.radiusKm;
    });
  }
}

