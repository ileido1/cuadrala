import type { ExchangeRateRepository } from '../../domain/ports/exchange_rate_repository.js';
import type { ExchangeRateSnapshot } from '../../domain/money/exchange_rate_snapshot.js';
import type { CurrencyCode } from '../../domain/money/currency_code.js';
import { ExchangeRateNotFoundError } from '../../domain/money/money_errors.js';
import { exchangeRateDtoToSnapshotSV } from '../../domain/services/money/exchange_rate_snapshot.mapper.js';

export class GetRateForReservationDayUseCase {
  constructor(
    private readonly _exchangeRateRepository: ExchangeRateRepository,
  ) {}

  async executeSV(_input: {
    countryCode: string;
    currency: CurrencyCode;
    scheduledAt: Date;
    timezone: string;
    calendarDate?: Date;
  }): Promise<ExchangeRateSnapshot & { exchangeRateId: string }> {
    const EFFECTIVE_DATE = _input.calendarDate
      ?? this.localDateFromScheduledAtSV(_input.scheduledAt, _input.timezone);

    if (_input.currency === 'BS') {
      return {
        exchangeRateId: '',
        currencyCode: 'BS',
        rateBsMinorPerMajorUnit: 100n,
        effectiveAt: EFFECTIVE_DATE,
      };
    }

    const ROW = await this._exchangeRateRepository.findByCountryCurrencyAndDateSV(
      _input.countryCode,
      _input.currency,
      EFFECTIVE_DATE,
    );

    if (ROW === null) {
      throw new ExchangeRateNotFoundError(
        _input.countryCode,
        _input.currency,
        EFFECTIVE_DATE.toISOString().slice(0, 10),
      );
    }

    return {
      ...exchangeRateDtoToSnapshotSV(ROW),
      exchangeRateId: ROW.id,
    };
  }

  localDateFromScheduledAtSV(_scheduledAt: Date, _timezone: string): Date {
    const FORMATTED = new Intl.DateTimeFormat('en-CA', {
      timeZone: _timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(_scheduledAt);
    return new Date(`${FORMATTED}T00:00:00.000Z`);
  }
}
