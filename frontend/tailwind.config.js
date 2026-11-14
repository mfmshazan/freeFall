/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#070a12',
          850: '#0b0f1a',
          800: '#0f1420',
          700: '#161c2b',
          600: '#1f2738',
          500: '#2b3650',
        },
        accent: { DEFAULT: '#60A5FA', dim: '#1E40AF' },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
