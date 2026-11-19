/**
 * Global App Formatters
 * Dynamically formats currency, date, and time based on configured HR Settings.
 */
import type { HRSettings } from '@/hooks/useHRSettings';

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getCachedHRSettings(): Partial<HRSettings> {
  try {
    const raw = localStorage.getItem('hrms_cached_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // fallback to individual keys
  }
  return {
    currency_symbol: localStorage.getItem('hrms_currency_symbol') || '₹',
    currency_position: (localStorage.getItem('hrms_currency_position') as any) || 'Prefix',
    date_format: localStorage.getItem('hrms_date_format') || 'DD-MM-YYYY',
    time_format: localStorage.getItem('hrms_time_format') || '24h',
  };
}

export interface FormatCurrencyOptions {
  symbol?: string;
  position?: 'Prefix' | 'Postfix' | string;
  decimals?: number;
}

export function formatCurrency(
  value: number | string | null | undefined,
  settingsOrOptions?: Partial<HRSettings> | FormatCurrencyOptions,
): string {
  if (value === null || value === undefined || value === '') return '—';

  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return '—';

  const cached = getCachedHRSettings();

  let symbol = '₹';
  let position = 'Prefix';
  let decimals = 0;

  if (settingsOrOptions) {
    if ('currency_symbol' in settingsOrOptions && settingsOrOptions.currency_symbol) {
      symbol = settingsOrOptions.currency_symbol;
    } else if ('symbol' in settingsOrOptions && settingsOrOptions.symbol) {
      symbol = settingsOrOptions.symbol;
    } else if (cached.currency_symbol) {
      symbol = cached.currency_symbol;
    }

    if ('currency_position' in settingsOrOptions && settingsOrOptions.currency_position) {
      position = settingsOrOptions.currency_position;
    } else if ('position' in settingsOrOptions && settingsOrOptions.position) {
      position = settingsOrOptions.position;
    } else if (cached.currency_position) {
      position = cached.currency_position;
    }

    if ('decimals' in settingsOrOptions && typeof settingsOrOptions.decimals === 'number') {
      decimals = settingsOrOptions.decimals;
    }
  } else {
    symbol = cached.currency_symbol || '₹';
    position = cached.currency_position || 'Prefix';
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formattedNumber = absNum.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = isNegative ? '-' : '';

  if (position === 'Postfix') {
    return `${sign}${formattedNumber} ${symbol}`.trim();
  }
  return `${sign}${symbol}${formattedNumber}`;
}

export function formatDate(
  dateInput: string | Date | null | undefined,
  formatPattern?: string,
): string {
  if (!dateInput) return '—';

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const pattern = formatPattern || getCachedHRSettings().date_format || 'DD-MM-YYYY';

  const day = d.getDate();
  const dayStr = String(day).padStart(2, '0');
  const month = d.getMonth() + 1;
  const monthStr = String(month).padStart(2, '0');
  const year = d.getFullYear();
  const yearShort = String(year).slice(-2);
  const monthShort = MONTH_NAMES_SHORT[d.getMonth()] || monthStr;
  const monthLong = MONTH_NAMES_LONG[d.getMonth()] || monthStr;

  switch (pattern) {
    case 'DD-MM-YYYY':
      return `${dayStr}-${monthStr}-${year}`;
    case 'DD-MM-YY':
      return `${dayStr}-${monthStr}-${yearShort}`;
    case 'MM-DD-YYYY':
      return `${monthStr}-${dayStr}-${year}`;
    case 'MM-DD-YY':
      return `${monthStr}-${dayStr}-${yearShort}`;
    case 'YYYY-MM-DD':
      return `${year}-${monthStr}-${dayStr}`;

    case 'DD/MM/YYYY':
      return `${dayStr}/${monthStr}/${year}`;
    case 'DD/MM/YY':
      return `${dayStr}/${monthStr}/${yearShort}`;
    case 'MM/DD/YYYY':
      return `${monthStr}/${dayStr}/${year}`;
    case 'MM/DD/YY':
      return `${monthStr}/${dayStr}/${yearShort}`;
    case 'YYYY/MM/DD':
      return `${year}/${monthStr}/${dayStr}`;

    case 'DD.MM.YYYY':
      return `${dayStr}.${monthStr}.${year}`;
    case 'DD.MM.YY':
      return `${dayStr}.${monthStr}.${yearShort}`;
    case 'MM.DD.YYYY':
      return `${monthStr}.${dayStr}.${year}`;
    case 'MM.DD.YY':
      return `${monthStr}.${dayStr}.${yearShort}`;
    case 'YYYY.MM.DD':
      return `${year}.${monthStr}.${dayStr}`;

    case 'DD-MMM-YYYY':
      return `${dayStr}-${monthShort}-${year}`;
    case 'DD/MMM/YYYY':
      return `${dayStr}/${monthShort}/${year}`;
    case 'DD.MMM.YYYY':
      return `${dayStr}.${monthShort}.${year}`;
    case 'DD MMM, YYYY':
      return `${dayStr} ${monthShort}, ${year}`;
    case 'DD MMM YYYY':
      return `${dayStr} ${monthShort} ${year}`;
    case 'MMM DD, YYYY':
      return `${monthShort} ${dayStr}, ${year}`;
    case 'MMM DD YYYY':
      return `${monthShort} ${dayStr} ${year}`;
    case 'YYYY-MMM-DD':
      return `${year}-${monthShort}-${dayStr}`;

    default:
      return `${dayStr}-${monthStr}-${year}`;
  }
}

export function formatTime(
  timeInput: string | Date | null | undefined,
  formatPattern?: string,
): string {
  if (!timeInput) return '—';

  let hours = 0;
  let minutes = 0;

  if (typeof timeInput === 'string') {
    if (timeInput.includes('T') || timeInput.includes('-')) {
      const d = new Date(timeInput);
      if (!isNaN(d.getTime())) {
        hours = d.getHours();
        minutes = d.getMinutes();
      } else {
        return timeInput;
      }
    } else if (timeInput.includes(':')) {
      const parts = timeInput.split(':');
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    } else {
      return timeInput;
    }
  } else if (timeInput instanceof Date) {
    hours = timeInput.getHours();
    minutes = timeInput.getMinutes();
  }

  const pattern = formatPattern || getCachedHRSettings().time_format || '24h';

  if (pattern === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

