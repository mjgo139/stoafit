import familia from './familia/tailwind-preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [familia],
  content: ['./index.html', './src/**/*.{ts,tsx}', './familia/**/*.tsx'],
  theme: {
    extend: {
      // Propio de StoaFit: el color de acento elegido en Perfil → Apariencia
      colors: { acento: 'var(--acento)', acentobg: 'var(--acentobg)' },
    },
  },
  plugins: [],
};
