import type { CurrencyCode } from './currency_code.js';
import { parseCurrencyCode } from './currency_code.js';
import {
  CurrencyMismatchError,
  InvalidMoneyAmountError,
} from './money_errors.js';

/** Monto inmutable en unidades menores (2 decimales implícitos para BS/USD/EUR). */
export class MoneyAmount {
  public readonly amountMinor: bigint;

  public readonly currencyCode: CurrencyCode;

  private constructor(_amountMinor: bigint, _currencyCode: CurrencyCode) {
    this.amountMinor = _amountMinor;
    this.currencyCode = _currencyCode;
  }

  public static fromMinor(
    _currencyCode: CurrencyCode,
    _amountMinor: bigint,
  ): MoneyAmount {
    if (_amountMinor < 0n) {
      throw new InvalidMoneyAmountError(
        'amountMinor no puede ser negativo',
      );
    }
    return new MoneyAmount(_amountMinor, _currencyCode);
  }

  public static of(_currencyCode: string, _amountMinor: bigint): MoneyAmount {
    const CODE = parseCurrencyCode(_currencyCode);
    return MoneyAmount.fromMinor(CODE, _amountMinor);
  }

  /** Convierte unidades mayores (ej. 85.00) a minor con 2 decimales. */
  public static fromMajorUnits(
    _currencyCode: CurrencyCode,
    _majorUnits: number,
  ): MoneyAmount {
    if (!Number.isFinite(_majorUnits) || _majorUnits < 0) {
      throw new InvalidMoneyAmountError(
        'Las unidades mayores deben ser un número finito ≥ 0',
      );
    }
    const MINOR = BigInt(Math.round(_majorUnits * 100));
    return MoneyAmount.fromMinor(_currencyCode, MINOR);
  }

  public add(_other: MoneyAmount): MoneyAmount {
    this.assertSameCurrency(_other);
    return MoneyAmount.fromMinor(
      this.currencyCode,
      this.amountMinor + _other.amountMinor,
    );
  }

  public subtract(_other: MoneyAmount): MoneyAmount {
    this.assertSameCurrency(_other);
    const RESULT = this.amountMinor - _other.amountMinor;
    if (RESULT < 0n) {
      throw new InvalidMoneyAmountError(
        'La resta produciría un monto negativo',
      );
    }
    return MoneyAmount.fromMinor(this.currencyCode, RESULT);
  }

  public equals(_other: MoneyAmount): boolean {
    return (
      this.currencyCode === _other.currencyCode &&
      this.amountMinor === _other.amountMinor
    );
  }

  private assertSameCurrency(_other: MoneyAmount): void {
    if (this.currencyCode !== _other.currencyCode) {
      throw new CurrencyMismatchError(
        this.currencyCode,
        _other.currencyCode,
      );
    }
  }
}
