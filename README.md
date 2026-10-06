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
| `cn-pill` + `cn-pill-{cyan,emerald,amber,rose,violet,slate,blue,purple}` | pastille de statut |
| `cn-chip`, `cn-chip-active` | puce de filtre / onglet compact |
| `cn-focus` | anneau de focus clavier (déjà inclus dans boutons, onglets, puces) |
| `cn-seg`, `cn-seg-item`, `cn-seg-item-active` | contrôle segmenté |
| `cn-btn`, `cn-btn-primary`, `cn-btn-ghost`, `cn-btn-danger`, `cn-icon-btn`, `cn-icon-btn-sm` | boutons |
| `cn-input`, `cn-label` | champs de formulaire |
| `cn-bubble-user`, `cn-bubble-actor`, `cn-bubble-system` | bulles de chat |
| `cn-tab`, `cn-tab-active`, `cn-tab-mobile`, `cn-tab-mobile-active` | navigation principale |
| `cn-table-wrap`, `cn-table` | tableaux |

Règle typographique : texte courant en `text-sm`, `text-xs` réservé aux libellés, horodatages et pastilles ; titres en `font-heading`.

## Composants

Aucun texte n'est codé en dur : tout passe par props et slots (les applications gèrent l'i18n).

- `components/CyberModal.vue` : coque de modale (fond, panneau, en-tête, fermeture Échap/clic, pied).
- `components/CyberPageHeader.vue` : en-tête de vue (pastille, icône, titre, chapeau, actions) ; prop `as` (`h1` par défaut, `h2`, `h3`).
- `components/CyberGauge.vue` : jauge de score (icône, titre, sous-titre, barre `role="progressbar"`, pied en slot par défaut ; props `value`, `max`, `unit`, `accent`, `badgeClass`).
- `components/CyberNavTabs.vue` : navigation principale (rail desktop défilant + grille mobile) depuis une liste `items` (`id`, `label`, `mobileLabel`, `icon`, `iconClass`, `title`, `badge`, `badgeClass`, `accent`) ; `v-model` = vue active ; slot `desktop-end`.
- `components/CyberVoiceButton.vue` : lecture / arrêt de synthèse vocale (`speechId`, `text`, `voice`, `playLabel`, `stopLabel`, `showLabel`, `size`) ; masqué si le navigateur ne la supporte pas.
- `components/CyberDictationButton.vue` : bouton micro de dictée (`listening`, `supported`, `startLabel`, `stopLabel`, `unsupportedLabel`, `showLabel`) ; émet `toggle`.
- `components/CyberInlineAlert.vue` : message d'erreur en ligne (`role="alert"`, `tone`, `dismissLabel`) ; émet `dismiss`.
- `components/CyberSegmented.vue` : choix unique (contrôle segmenté `variant="seg"` ou puces `variant="chip"`, `scroll` pour un rail) avec sémantique radiogroup et navigation aux flèches ; `options` (`value`, `label`, `icon`, `title`, `count`, `disabled`, `class`, `activeClass`) ; `v-model` ; slot `option`.
- `components/CyberStatTile.vue` : tuile de chiffre clé (`accent`, `variant` `card` | `inset`) ; slots `label`, défaut (valeur), `hint`, `icon`.
- `components/CyberEmptyState.vue` : état vide (`compact`) ; slots `icon`, `title`, défaut (message), `actions`.
- `components/CyberScrollRail.vue` : barre horizontale défilante pour les menus larges. Des contrôles apparaissent à gauche et à droite quand du contenu est masqué : survol = défilement continu, clic = une page ; molette verticale convertie en horizontal ; l'élément actif (`aria-current="page"`, `.cn-tab-active`…) est ramené dans la vue. Props : `track-class` (gap/alignement de la piste), `fade-class` (dégradé accordé au fond, ex. `from-slate-800 via-slate-800/80 to-transparent` dans une modale), `speed` (px/s), `wheel`.
- `components/CyberAccordion.vue` : accordéon `<details>`.
- `components/CyberTermTooltip.vue` : infobulle du lexique au survol.

## Services

- `services/voiceService.js` : synthèse et dictée vocales.

## Profils de parties prenantes et moteurs

`services/stakeholderProfile.js` (réexporté par `index.js`) lit un objet `profile` facultatif sur chaque acteur de `data/actors.js`. Le même profil alimente la War Room (routage des interpellations, réactions locales), le coach Tech-to-Board et les prompts Gemini.

```js
profile: {
  aliases: ['julien', 'rssi'],                       // interpellations reconnues
  mandate: 'Garant de la PSSI, prépare le dossier d\'homologation',
  decisionRights: { decides: [], vetoes: ['mise en production sans FARR'], advises: ['homologation'] },
  stakes: ['conformité HDS', 'traçabilité des dérogations'],
  evaluationCriteria: ['mesure compensatoire datée', 'risque résiduel formalisé'],
  expectations: [{ label: 'FARR signée et datée', terms: ['farr', 'acceptation du risque'] }],
  redLines: [{ label: 'dérogation sans échéance', terms: ['sans échéance', 'indéfiniment'] }],
  jargonTolerance: 'high',                            // low | medium | high
  regulatoryFocus: ['RGPD art. 32', 'référentiel HDS 2024'],
  communicationStyle: 'factuel, demande des preuves écrites'
}
```

Les `terms` sont des radicaux reconnus en début de mot (`containsTerm(text, term, { prefix: true })`) ; les unités collées à un nombre sont reconnues (« 150k€ », « 72h »). Les occurrences niées ne comptent pas (« sans FARR », « pas de coupure », « ne notifions pas ») : une ligne rouge dont la faute est une négation s'écrit avec elle (« ne pas notifier »). Un groupe peut porter un `impact` propre à l'application, renvoyé par `assessAgainstStakeholder` (`redLineGroups`, `expectationGroups`).

Dans le coach, un piège ou une ligne rouge franchis plafonnent la note à 45 (`rawScore` garde la note brute) ; la réaction hors ligne reprend `caseStudy.stakeholders[id].reactions` si le cas en fournit, sinon elle est tirée du profil.

Cas du coach (`TechToBoardEngine.evaluateAnswer({ text, caseStudy, stakeholder })`) : `context`, `technicalFact`, `decisionQuestion`, `idealAnswer`, `mustConvey` et `pitfalls` (groupes de termes), `jargonWords`, `businessWords`, `actionWords`, `keywordsToInclude`.

Fonctions : `containsTerm`, `matchTermGroups`, `findMentionedActors`, `describeStakeholderForPrompt`, `assessAgainstStakeholder`, constantes `DEFAULT_GEMINI_MODEL`, `FALLBACK_GEMINI_MODELS`.
