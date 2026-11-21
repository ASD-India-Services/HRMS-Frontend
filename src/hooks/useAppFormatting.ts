/**
 * Hook to provide reactive formatting for currency, date, and time
 * based on live HR Settings.
 */
import { useMemo } from 'react';
import { useHRSettings } from './useHRSettings';
import {
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatTime as baseFormatTime,
  FormatCurrencyOptions,
} from '@/utils/formatters';

export function useAppFormatting() {
  const { data: settings } = useHRSettings();

  return useMemo(() => {
    return {
      settings,
      currencySymbol: settings?.currency_symbol || '₹',
      currencyPosition: settings?.currency_position || 'Prefix',
      dateFormat: settings?.date_format || 'DD/MM/YYYY',
      timeFormat: settings?.time_format || '12h',
      formatCurrency: (
        val: number | string | null | undefined,
        opts?: FormatCurrencyOptions
      ) => {
        return baseFormatCurrency(val, {
          currency_symbol: settings?.currency_symbol,
          currency_position: settings?.currency_position,
          ...opts,
        });
      },
      formatDate: (
        val: string | Date | null | undefined,
        formatPattern?: string
      ) => {
        return baseFormatDate(val, formatPattern || settings?.date_format);
      },
      formatTime: (
        val: string | Date | null | undefined,
        formatPattern?: string
      ) => {
        return baseFormatTime(val, formatPattern || settings?.time_format);
      },
    };
  }, [settings]);
}

