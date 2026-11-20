import type { Config } from 'tailwindcss'

/**
 * Minimal-template design tokens. Values live once, as RGB channels, in src/index.css.
 *
 * Naming scheme:
 *  - palette colours   : {primary|secondary|info|success|warning|error}-{lighter|light|main|dark|darker|contrast}
 *  - greys             : grey-50 ... grey-900
 *  - text colours      : ink-primary | ink-secondary | ink-disabled      (text-ink-secondary)
 *  - backgrounds       : surface-paper | surface-default | surface-neutral (bg-surface-paper)
 *  - divider           : divider (border-divider), already 20% alpha
 *  - shadows           : shadow-{z1..z24|card|dropdown|dialog|primary|...}
 *  - sizes             : nav 300px, nav-mini 88px, header 72px (w-nav, w-nav-mini, h-header, ...)
 *
 * Compatibility aliases (removed in FEAT-006): primary-50..950 and gray-50..900.
 */
const channel = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const palette = (name: string) => ({
  lighter: channel(`${name}-lighter`),
  light: channel(`${name}-light`),
  main: channel(`${name}-main`),
  dark: channel(`${name}-dark`),
  darker: channel(`${name}-darker`),
  contrast: channel(`${name}-contrast`),
})

const greyScale = Object.fromEntries(
  ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map((s) => [s, channel(`grey-${s}`)]),
)

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          ...palette('primary'),
          // compat aliases for unmigrated pages
          50: channel('primary-lighter'),
          100: channel('primary-lighter'),
          200: channel('primary-light'),
          300: channel('primary-light'),
          400: channel('primary-light'),
          500: channel('primary-main'),
          600: channel('primary-main'),
          700: channel('primary-dark'),
          800: channel('primary-dark'),
          900: channel('primary-darker'),
          950: channel('primary-darker'),
        },
        secondary: palette('secondary'),
        info: palette('info'),
        success: palette('success'),
        warning: palette('warning'),
        error: palette('error'),
        grey: greyScale,
        // compat alias for unmigrated pages
        gray: { ...greyScale, 950: channel('grey-900') },
        ink: {
          primary: channel('ink-primary'),
          secondary: channel('ink-secondary'),
          disabled: channel('ink-disabled'),
        },
        surface: {
          paper: channel('surface-paper'),
          default: channel('surface-default'),
          neutral: channel('surface-neutral'),
        },
        divider: 'rgb(var(--divider) / 0.2)',
      },
      fontFamily: {
        sans: ["'Public Sans Variable'", 'system-ui', '-apple-system', "'Segoe UI'", 'Roboto', "'Helvetica Neue'", 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '16px',
      },
      boxShadow: {
        z1: 'var(--shadow-z1)',
        z4: 'var(--shadow-z4)',
        z8: 'var(--shadow-z8)',
        z12: 'var(--shadow-z12)',
        z16: 'var(--shadow-z16)',
        z20: 'var(--shadow-z20)',
        z24: 'var(--shadow-z24)',
        card: 'var(--shadow-card)',
        dropdown: 'var(--shadow-dropdown)',
        dialog: 'var(--shadow-dialog)',
        primary: 'var(--shadow-primary)',
        secondary: 'var(--shadow-secondary)',
        info: 'var(--shadow-info)',
        success: 'var(--shadow-success)',
        warning: 'var(--shadow-warning)',
        error: 'var(--shadow-error)',
      },
      spacing: { nav: '300px', 'nav-mini': '88px', header: '72px' },
    },
  },
  plugins: [],
} satisfies Config
