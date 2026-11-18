/** @type {import('tailwindcss').Config} */

// Setiap warna tema merujuk ke CSS variable berisi triplet RGB
// sehingga modifier opacity (mis. bg-panel/80) tetap bekerja.
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

const palette = (prefix) =>
  Object.fromEntries(STEPS.map((step) => [step, withAlpha(`--${prefix}-${step}`)]))

const tone = palette('tone')
const accent = palette('accent')

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Skala netral: canvas, panel, border, dan teks.
        // `surface` dipertahankan sebagai alias agar halaman lama ikut bertema.
        slate: tone,
        surface: tone,

        // Skala aksen: latar tint, border, teks aksen, dan sorotan.
        // `brand` dipertahankan sebagai alias agar halaman lama ikut bertema.
        indigo: accent,
        brand: accent,

        // Warna status (makna tetap sama di semua tema).
        emerald: palette('emerald'),
        amber: palette('amber'),
        rose: palette('rose'),
        sky: palette('sky'),

        // Token semantik
        canvas: withAlpha('--canvas'),
        panel: withAlpha('--panel'),
        line: withAlpha('--line'),
        ink: withAlpha('--ink'),
        muted: withAlpha('--muted'),

        cta: {
          DEFAULT: withAlpha('--cta'),
          hover: withAlpha('--cta-hover'),
          ink: withAlpha('--cta-ink'),
        },

        danger: {
          DEFAULT: withAlpha('--danger'),
          hover: withAlpha('--danger-hover'),
          ink: withAlpha('--danger-ink'),
        },

        sidebar: {
          DEFAULT: withAlpha('--sidebar'),
          ink: withAlpha('--sidebar-ink'),
          muted: withAlpha('--sidebar-muted'),
          accent: withAlpha('--sidebar-accent'),
          active: withAlpha('--sidebar-active'),
          'active-ink': withAlpha('--sidebar-active-ink'),
          hover: withAlpha('--sidebar-hover'),
          border: withAlpha('--sidebar-border'),
          footer: withAlpha('--sidebar-footer'),
        },

        // Aksen solid untuk elemen yang harus tetap pekat di mode gelap.
        solid: {
          emerald: '#047857',
          amber: '#b45309',
          rose: '#e11d48',
          sky: '#0284c7',
        },
      },
      ringOffsetColor: {
        DEFAULT: withAlpha('--panel'),
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'clean': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'button': '0.5rem', // 8px
        'card': '0.75rem',  // 12px
        'modal': '1rem',    // 16px
      }
    },
  },
  plugins: [],
}
