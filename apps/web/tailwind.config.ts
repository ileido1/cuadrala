import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#17A34A',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#052e16',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0F172A',
        },
        tertiary: {
          400: '#d9ff00',
          500: '#C5FF00',
          600: '#a3cc00',
        },
        surface: '#FFFFFF',
        'surface-container': '#F3F4F6',
        outline: '#E5E7EB',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'radius-md': '12px',
        'radius-lg': '18px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 10px 25px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.08)',
        'glow': '0 0 20px rgba(22, 163, 74, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;