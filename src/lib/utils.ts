import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_FORMATS: Record<string, { symbol: string; locale: string }> = {
  LKR: { symbol: 'Rs.', locale: 'en-LK' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  INR: { symbol: '₹', locale: 'en-IN' },
};

const SYMBOL_TO_CODE: Record<string, string> = {
  'Rs.': 'LKR',
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '₹': 'INR',
};

export function formatCurrency(
  amount: number | string,
  symbol: string = 'Rs.',
  code?: string
): string {
  const num = Number(amount) || 0;
  const digits = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

  // Resolve the code from the symbol when it isn't given, so that passing only a
  // symbol (e.g. formatCurrency(10, '$')) doesn't fall through to the default code.
  const resolvedCode = code ?? SYMBOL_TO_CODE[symbol] ?? 'LKR';
  const format = CURRENCY_FORMATS[resolvedCode];

  if (format) {
    return `${format.symbol}${format.symbol.endsWith('.') ? ' ' : ''}${num.toLocaleString(format.locale, digits)}`;
  }

  return `${symbol} ${num.toLocaleString(undefined, digits)}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
}
