// tailwind.preset.js — thème partagé CYBER-NEXUS / CTI-NEXUS
import plugin from 'tailwindcss/plugin'

// Palettes Tailwind v3 (triplets RGB) pilotées par variables CSS.
// Mode nuit : valeurs d'origine. Mode jour (html.light) : échelle inversée,
// ce qui couvre automatiquement opacités (/40), dégradés (from/via/to) et états hover.
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

const PALETTES = {
  slate:   ['248 250 252', '241 245 249', '226 232 240', '203 213 225', '148 163 184', '100 116 139', '71 85 105', '51 65 85', '30 41 59', '15 23 42', '2 6 23'],
  cyan:    ['236 254 255', '207 250 254', '165 243 252', '103 232 249', '34 211 238', '6 182 212', '8 145 178', '14 116 144', '21 94 117', '22 78 99', '8 51 68'],
  emerald: ['236 253 245', '209 250 229', '167 243 208', '110 231 183', '52 211 153', '16 185 129', '5 150 105', '4 120 87', '6 95 70', '6 78 59', '2 44 34'],
  amber:   ['255 251 235', '254 243 199', '253 230 138', '252 211 77', '251 191 36', '245 158 11', '217 119 6', '180 83 9', '146 64 14', '120 53 15', '69 26 3'],
  rose:    ['255 241 242', '255 228 230', '254 205 211', '253 164 175', '251 113 133', '244 63 94', '225 29 72', '190 18 60', '159 18 57', '136 19 55', '76 5 25'],
  purple:  ['250 245 255', '243 232 255', '233 213 255', '216 180 254', '192 132 252', '168 85 247', '147 51 234', '126 34 206', '107 33 168', '88 28 135', '59 7 100'],
  violet:  ['245 243 255', '237 233 254', '221 214 254', '196 181 253', '167 139 250', '139 92 246', '124 58 237', '109 40 217', '91 33 182', '76 29 149', '46 16 101'],
  blue:    ['239 246 255', '219 234 254', '191 219 254', '147 197 253', '96 165 250', '59 130 246', '37 99 235', '29 78 216', '30 64 175', '30 58 138', '23 37 84'],
  indigo:  ['238 242 255', '224 231 255', '199 210 254', '165 180 252', '129 140 248', '99 102 241', '79 70 229', '67 56 202', '55 48 163', '49 46 129', '30 27 75'],
}

// Mode jour : teinte affichée -> teinte source.
// Accents : les textes clairs (200-400) deviennent foncés (lisibles sur blanc),
// les fonds sombres (700-950) deviennent des teintes pastel, 500/600 restent pleins.
const LIGHT_ACCENT_MAP = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 700, 500: 500, 600: 600, 700: 300, 800: 200, 900: 100, 950: 50 }
const LIGHT_SLATE_MAP = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 600, 500: 500, 600: 400, 700: 300, 800: 200, 900: 'surface', 950: 'white' }
const LIGHT_SLATE_EXTRA = { surface: '248 250 252', white: '255 255 255' }

const rgbOf = (name, shade) => PALETTES[name][SHADES.indexOf(shade)]

const themeColors = Object.fromEntries(
  Object.keys(PALETTES).map(name => [
    name,
    Object.fromEntries(SHADES.map(s => [s, `rgb(var(--c-${name}-${s}) / <alpha-value>)`])),
  ])
)

const themeVariables = plugin(({ addBase }) => {
  const dark = {}
  const light = {}
  for (const name of Object.keys(PALETTES)) {
    const map = name === 'slate' ? LIGHT_SLATE_MAP : LIGHT_ACCENT_MAP
    for (const s of SHADES) {
      dark[`--c-${name}-${s}`] = rgbOf(name, s)
      const src = map[s]
      light[`--c-${name}-${s}`] = typeof src === 'number' ? rgbOf(name, src) : LIGHT_SLATE_EXTRA[src]
    }
  }
  addBase({ ':root': dark, 'html.light': light })
})

const glow = rgb => `0 0 20px -3px rgba(${rgb}, 0.35)`

// Chemin à ajouter au `content` des apps pour que Tailwind scanne les composants partagés
export const cyberLibsContent = './node_modules/vuejs.cyber.libs/components/**/*.vue'

export default {
  darkMode: 'class',
  theme: {
    extend: {
      // Échelle typographique relevée : lisibilité WCAG (corps ≥ 13px)
      fontSize: {
        tiny: ['0.75rem', { lineHeight: '1rem' }],      // 12px, réservé aux micro-badges
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],   // 13px
        sm: ['0.9375rem', { lineHeight: '1.4rem' }],    // 15px
        base: ['1rem', { lineHeight: '1.6rem' }],       // 16px
      },
      colors: {
        ...themeColors,
        cyber: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#082f49',
          dark: '#070b14',
          card: '#0f172a',
          panel: '#1e293b',
          border: '#1e293b',
          accent: '#10b981',
          highlight: '#22d3ee',
          danger: '#ef4444',
          warning: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        heading: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': glow('6, 182, 212'),
        'glow-success': glow('16, 185, 129'),
        'glow-emerald': glow('16, 185, 129'),
        'glow-warning': glow('245, 158, 11'),
        'glow-amber': glow('245, 158, 11'),
        'glow-danger': glow('239, 68, 68'),
        'glow-rose': glow('244, 63, 94'),
        'glow-purple': glow('168, 85, 247'),
      },
    },
  },
  plugins: [themeVariables],
}
