'use client';

import { useEffect, useState } from 'react';
import {
  currencySymbol,
  formatMajorAmountInput,
  majorAmountPlaceholder,
  parseMajorAmountInput,
  sanitizeMoneyInput,
  type CurrencyCode,
} from '~/lib/format-money';

interface CurrencyAmountInputProps {
  value: string;
  onChange: (_value: string) => void;
  currency: CurrencyCode;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function CurrencyAmountInput({
  value,
  onChange,
  currency,
  placeholder,
  className = '',
  inputClassName = '',
}: CurrencyAmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!isFocused) {
      setDraft(value);
    }
  }, [value, isFocused]);

  const _handleFocus = () => {
    setIsFocused(true);
    const _parsed = parseMajorAmountInput(value);
    if (_parsed !== null) {
      setDraft(String(_parsed).replace('.', ','));
    } else {
      setDraft(value);
    }
  };

  const _handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const _next = sanitizeMoneyInput(e.target.value);
    setDraft(_next);
    onChange(_next);
  };

  const _handleBlur = () => {
    setIsFocused(false);
    const _parsed = parseMajorAmountInput(draft);
    if (_parsed === null) {
      onChange('');
      setDraft('');
      return;
    }
    const _formatted = formatMajorAmountInput(_parsed, currency);
    onChange(_formatted);
    setDraft(_formatted);
  };

  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
        {currencySymbol(currency)}
      </span>
      <input
        type="text"
        inputMode="decimal"
        className={`input w-full pl-11 ${inputClassName}`}
        value={isFocused ? draft : value}
        onChange={_handleChange}
        onFocus={_handleFocus}
        onBlur={_handleBlur}
        placeholder={placeholder ?? majorAmountPlaceholder(currency)}
      />
    </div>
  );
}

