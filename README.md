# vuejs.cyber.libs

Bibliothèque partagée de CYBER-NEXUS et CTI-NEXUS : thème Tailwind, styles communs, composants d'affichage, services.

## Installation

```bash
npm install git+https://github.com/venantvr-security/vuejs.cyber.libs.git
```

## Thème Tailwind

`tailwind.config.js` de l'application :

```js
import cyberVisualsPreset, { cyberLibsContent } from 'vuejs.cyber.libs/tailwind.preset.js'

export default {
  presets: [cyberVisualsPreset],
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}', cyberLibsContent],
}
```

Le preset fournit :
- les palettes `slate`, `cyan`, `emerald`, `amber`, `rose`, `purple`, `violet`, `blue`, `indigo` pilotées par variables CSS (mode jour automatique via `html.light`) ;
- l'échelle typographique relevée (`xs` 13px, `sm` 15px, `base` 16px) ;
- les familles `font-sans` / `font-heading` (Inter) et `font-mono` (JetBrains Mono) ;
- les ombres `shadow-glow-{cyan,emerald,success,amber,warning,rose,danger,purple}`.

## Styles

`src/style.css` de l'application, avant les directives Tailwind :

```css
@import 'vuejs.cyber.libs/styles/index.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

| Fichier | Contenu |
|---|---|
| `styles/tokens.css` | variables CSS (couleurs, ombres, polices) |
| `accessibility.css` | socle typographique, focus, sélection, `.cyber-container` (CSS pur, importable seul) |
| `styles/base.css` | fond de page, titres, chiffres tabulaires |
| `styles/components.css` | `glass-panel*`, barres de défilement, primitives `cn-*` |
| `styles/animations.css` | `animate-radar`, `animate-float`, `animate-fade-in` |
| `styles/theme-light.css` | mode jour (`html.light`) |

Polices à charger dans `index.html` :

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=JetBrains+Mono:wght@400..700&display=swap" rel="stylesheet">
```

### Primitives `cn-*`

| Classe | Usage |
|---|---|
| `cn-section-title`, `cn-section-dot` | titre de section en capitales + pastille |
| `cn-page-title`, `cn-page-subtitle` | titre et chapeau de vue |
| `cn-card`, `cn-inset` | carte vitrée, encart |
| `cn-body`, `cn-meta` | texte courant (`text-sm`), méta (`text-xs`) |
| `cn-pill` + `cn-pill-{cyan,emerald,amber,rose,violet,slate}` | pastille de statut |
| `cn-seg`, `cn-seg-item`, `cn-seg-item-active` | contrôle segmenté |
| `cn-btn`, `cn-btn-primary`, `cn-btn-ghost`, `cn-icon-btn` | boutons |
| `cn-input`, `cn-label` | champs de formulaire |
| `cn-bubble-user`, `cn-bubble-actor`, `cn-bubble-system` | bulles de chat |
| `cn-tab`, `cn-tab-active`, `cn-tab-mobile`, `cn-tab-mobile-active` | navigation principale |
| `cn-table-wrap`, `cn-table` | tableaux |

Règle typographique : texte courant en `text-sm`, `text-xs` réservé aux libellés, horodatages et pastilles ; titres en `font-heading`.

## Composants

Aucun texte n'est codé en dur : tout passe par props et slots (les applications gèrent l'i18n).

- `components/CyberModal.vue` : coque de modale (fond, panneau, en-tête, fermeture Échap/clic, pied).
- `components/CyberPageHeader.vue` : en-tête de vue (pastille, icône, titre, chapeau, actions).
- `components/CyberAccordion.vue` : accordéon `<details>`.
- `components/CyberTermTooltip.vue` : infobulle du lexique au survol.

## Services

- `services/voiceService.js` : synthèse et dictée vocales.
