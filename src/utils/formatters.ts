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

  const cleanDateFormat = (directDateFormat || parsed.date_format || 'DD/MM/YYYY').replace(/^["']|["']$/g, '').trim();
  const cleanTimeFormat = (directTimeFormat || parsed.time_format || '12h').replace(/^["']|["']$/g, '').trim();

  return {
    ...parsed,
    currency_symbol: directCurrencySymbol || parsed.currency_symbol || '₹',
    currency_position: (directCurrencyPosition || parsed.currency_position || 'Prefix') as any,
    date_format: cleanDateFormat,
    time_format: cleanTimeFormat,
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

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (isoMatch) {
      const hours = isoMatch[4];
      const minutes = isoMatch[5];
      const seconds = isoMatch[6];
      // Date-only or midnight UTC/local: prevent cross-timezone day shifting
      const isMidnight = !hours || (hours === '00' && minutes === '00' && (!seconds || seconds === '00'));
      if (isMidnight) {
        year = parseInt(isoMatch[1], 10);
        month = parseInt(isoMatch[2], 10);
        day = parseInt(isoMatch[3], 10);
      } else {
        const d = new Date(trimmed);
        if (isNaN(d.getTime())) {
          year = parseInt(isoMatch[1], 10);
          month = parseInt(isoMatch[2], 10);
          day = parseInt(isoMatch[3], 10);
        } else {
          day = d.getDate();
          month = d.getMonth() + 1;
          year = d.getFullYear();
        }
      }
    } else {
      const d = new Date(trimmed);
      if (isNaN(d.getTime())) return String(dateInput);
      day = d.getDate();
      month = d.getMonth() + 1;
      year = d.getFullYear();
    }
  } else if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '—';
    day = dateInput.getDate();
    month = dateInput.getMonth() + 1;
    year = dateInput.getFullYear();
  } else {
    return String(dateInput);
  }

  const rawPattern = formatPattern || getCachedHRSettings().date_format || 'DD/MM/YYYY';
  const pattern = rawPattern.replace(/^["']|["']$/g, '').trim().toUpperCase();

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
    const trimmed = timeInput.trim();
    if (trimmed.includes('T') || (trimmed.includes('-') && trimmed.includes(':'))) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        hours = d.getHours();
        minutes = d.getMinutes();
      } else {
        return timeInput;
      }
    } else if (trimmed.includes(':')) {
      const isPM = /pm/i.test(trimmed);
      const isAM = /am/i.test(trimmed);
      const clean = trimmed.replace(/[^0-9:]/g, '');
      const parts = clean.split(':');
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    } else {
      return timeInput;
    }
  } else if (timeInput instanceof Date) {
    if (isNaN(timeInput.getTime())) return '—';
    hours = timeInput.getHours();
    minutes = timeInput.getMinutes();
  } else {
    return String(timeInput);
  }

  const rawPattern = formatPattern || getCachedHRSettings().time_format || '12h';
  const pattern = rawPattern.replace(/^["']|["']$/g, '').trim().toLowerCase();
  const is24h = pattern === '24h' || pattern.includes('24');

  if (is24h) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
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
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
  return /^\d{4}-\d{2}-\d{2}[T ]00:00(?::00(?:\.0+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(trimmed);
}

export function isIsoDateTimeString(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(val.trim());
}

