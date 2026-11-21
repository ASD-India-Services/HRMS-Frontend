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
  const directDateFormat = typeof window !== 'undefined' ? localStorage.getItem('hrms_date_format') : null;
  const directTimeFormat = typeof window !== 'undefined' ? localStorage.getItem('hrms_time_format') : null;
  const directCurrencySymbol = typeof window !== 'undefined' ? localStorage.getItem('hrms_currency_symbol') : null;
  const directCurrencyPosition = typeof window !== 'undefined' ? localStorage.getItem('hrms_currency_position') : null;

  let parsed: Partial<HRSettings> = {};
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('hrms_cached_settings') : null;
    if (raw) {
      const json = JSON.parse(raw);
      if (json && typeof json === 'object') {
        parsed = json;
      }
    }
  } catch {
    // fallback to individual keys
  }

  return {
    ...parsed,
    currency_symbol: directCurrencySymbol || parsed.currency_symbol || '₹',
    currency_position: (directCurrencyPosition || parsed.currency_position || 'Prefix') as any,
    date_format: directDateFormat || parsed.date_format || 'DD/MM/YYYY',
    time_format: directTimeFormat || parsed.time_format || '12h',
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

  let day: number;
  let month: number;
  let year: number;

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const parts = dateInput.trim().split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    day = d.getDate();
    month = d.getMonth() + 1;
    year = d.getFullYear();
  }

  const pattern = (formatPattern || getCachedHRSettings().date_format || 'DD/MM/YYYY').toUpperCase();

  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  const yearShort = String(year).slice(-2);
  const monthShort = MONTH_NAMES_SHORT[month - 1] || monthStr;
  const monthLong = MONTH_NAMES_LONG[month - 1] || monthStr;

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

    case 'DD MMMM, YYYY':
      return `${dayStr} ${monthLong}, ${year}`;
    case 'DD MMMM YYYY':
      return `${dayStr} ${monthLong} ${year}`;
    case 'MMMM DD, YYYY':
      return `${monthLong} ${dayStr}, ${year}`;
    case 'MMMM DD YYYY':
      return `${monthLong} ${dayStr} ${year}`;
    case 'DD-MMMM-YYYY':
      return `${dayStr}-${monthLong}-${year}`;

    default:
      return `${dayStr}/${monthStr}/${year}`;
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

  const pattern = (formatPattern || getCachedHRSettings().time_format || '12h').toLowerCase();

  if (pattern === '12h' || pattern.includes('12')) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatDateTime(
  dateTimeInput: string | Date | null | undefined,
  dateFormatPattern?: string,
  timeFormatPattern?: string,
): string {
  if (!dateTimeInput) return '—';
  const dStr = formatDate(dateTimeInput, dateFormatPattern);
  const tStr = formatTime(dateTimeInput, timeFormatPattern);
  if (dStr === '—' && tStr === '—') return '—';
  if (dStr === '—') return tStr;
  if (tStr === '—') return dStr;
  return `${dStr} ${tStr}`;
}

export function isIsoDateString(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(val.trim());
}

export function isIsoDateTimeString(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(val.trim());
}

