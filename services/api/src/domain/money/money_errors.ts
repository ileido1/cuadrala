/** Error de dominio para operaciones monetarias. */
export class MoneyDomainError extends Error {
  public readonly code: string;

  public constructor(_code: string, _message: string) {
    super(_message);
    this.name = 'MoneyDomainError';
    this.code = _code;
  }
}

export class InvalidCurrencyCodeError extends MoneyDomainError {
  public constructor(_value: string) {
    super('MONEDA_INVALIDA', `Código de moneda no soportado: ${_value}`);
    this.name = 'InvalidCurrencyCodeError';
  }
}

export class InvalidMoneyAmountError extends MoneyDomainError {
  public constructor(_message: string) {
    super('MONTO_INVALIDO', _message);
    this.name = 'InvalidMoneyAmountError';
  }
}

export class CurrencyMismatchError extends MoneyDomainError {
  public constructor(_left: string, _right: string) {
    super(
      'MONEDA_INCOMPATIBLE',
      `No se pueden operar montos en ${_left} y ${_right}`,
    );
    this.name = 'CurrencyMismatchError';
  }
}
