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

Les `terms` sont des radicaux reconnus en début de mot (`containsTerm(text, term, { prefix: true })`) ; les unités collées à un nombre sont reconnues (« 150k€ », « 72h »). Un groupe peut porter un `impact` propre à l'application, renvoyé par `assessAgainstStakeholder` (`redLineGroups`, `expectationGroups`). Un groupe sans `label` est évalué mais n'apparaît ni dans le feedback ni dans les prompts.

### Normalisation

`normalize(s)` (exporté) est appliquée au texte **et** aux termes avant toute comparaison (`containsTerm`, `matchTermGroups`, `findMentionedActors`, jargon du coach) :

- minuscules, décomposition NFKD et suppression des diacritiques (`réseau` = `reseau` = `RÉSEAU`), le `€` est conservé ;
- apostrophes typographiques (’ ‘ ʼ ´ et accent grave) → apostrophe droite ; espaces insécables et fines → espace ; traits d'union → espace (`pare-feu` = `pare feu`) ; espaces répétées réduites (les retours à la ligne sont conservés : ils séparent les propositions) ;
- unités recollées au nombre : `72 h` → `72h`, `150 k€` → `150k€`, `30 %` → `30%` (`72 heures` reste tel quel) ;
- articles : `art.33`, `art. 33` → `art 33`.

### Négation

`containsTerm(text, term, { prefix, affirmedOnly: true })` ignore une occurrence niée. La négation est **limitée à la proposition** du terme : elle s'arrête à `, : ; . ! ? …`, au retour à la ligne, aux tirets `— –` et aux connecteurs `mais`, `donc`, `alors`, `puis`, `cependant`, `toutefois`, `néanmoins`, `pourtant`.

- Négateurs locaux (au plus 3 mots avant le terme) : `sans`, `pas`, `ni`, `aucun(e)`, `jamais`, `rien`, `zéro`, `nullement`, `guère`, `point`, `ne`/`n'`, `éviter`, `refuser`, `renoncer`, `exclure`, `plutôt que`, `au lieu de`, et `non` juste avant le terme (`non-conformité`).
- Négateurs de proposition (au plus 8 mots avant) : `hors de question`, `en aucun cas`, `pas question`, `exclu(e)(s)`, `proscrit(e)(s)`, `interdit(e)(s)`, `inutile (de)`, `nullement`.
- Condamnation après le terme (au plus 4 mots) : `… est/serait exclu(e), proscrit(e), interdit(e), illégal(e), contraire, inacceptable, une erreur`, `… nous/vous exposerait`.
- Ne sont **pas** des négations : `sans attendre / délai / tarder / plus attendre / doute / faute / exception`, `pas de doute / panique / souci / problème`, `aucun doute`, `pas seulement`, `non seulement`, `plus que jamais`, `si jamais`, `pas à pas`, `n'importe`, `zéro trust / day`, `ne … que` (restriction), la double négation (`ne pouvons pas ne pas couper`), `ne pas oublier / omettre / négliger` ; les compléments de temps (`à ce stade`, `à ce jour`, `pour l'instant`, `en l'état`…) ne sont jamais niés.
- Un terme qui commence par `ne pas` tolère deux mots intercalés : `ne pas notifier` reconnaît `il ne faut surtout pas notifier`.

### Groupes de termes : `negatable` et `exceptWhen`

```js
{ label: 'Couper le courant', terms: ['couper le courant'], negatable: true }
{ label: 'Report sans alternative ni date', terms: ['annuler le lancement'], exceptWhen: ['lundi', 'jeudi', 'h', 'date'] }
```

- `negatable` : `true` par défaut pour tous les groupes (attentes, `mustConvey`, lignes rouges, pièges) : la bonne réponse est souvent la forme niée de la faute (« nous ne publierons pas les IoC en TLP:CLEAR »). Écrire les lignes rouges comme des intentions fautives, et mettre `negatable: false` sur un groupe dont toute mention doit être sanctionnée.
- `exceptWhen` : termes qui, dans la même phrase que l'occurrence, l'annulent (« reporter à jeudi 8h » n'est pas un report sans date).
- `matchTermGroups(text, groups, { negatable })` : valeur par défaut pour les groupes sans drapeau (`true`).
- `assessAgainstStakeholder(text, actor, { redLinesNegatable })` : `true` par défaut ; `false` rend toutes les lignes rouges sans drapeau insensibles à la négation.

Pour un moteur applicatif : `containsTerm(text, term, { prefix: true, affirmedOnly: true })` pour un signal positif (« propose », « déploie »), `containsTerm(text, term, { prefix: true })` pour un signal à détecter quelle que soit la forme.

### Coach Tech-to-Board

Cas (`TechToBoardEngine.evaluateAnswer({ text, caseStudy, stakeholder })`) : `context`, `technicalFact`, `decisionQuestion`, `idealAnswer`, `mustConvey` et `pitfalls` (groupes de termes), `jargonWords`, `businessWords`, `actionWords`, `keywordsToInclude`. `caseStudy` nul est traité comme `{}`.

Barème local (`evaluateLocally`) :

- bonus plafonnés par catégorie : faits transmis +5 chacun (max +20), attentes du décideur +4 chacune (max +16), mots-clés du cas −15 à +25, vocabulaire métier +10, recommandation +10 ;
- `actionWords` sensibles à la négation (« nous ne proposons rien » n'est pas une recommandation) ;
- plafond à 55 si moins de 40 mots, moins de trois phrases (une phrase de 25 mots et plus compte double), densité de mots-clés du cas et du décideur > 40 % ou diversité lexicale (mots de 4 lettres et plus distincts / total) < 0,5 au-delà de 40 mots ;
- un piège ou une ligne rouge franchis plafonnent la note à 45 (`rawScore` garde la note brute ; `breaches`, `breachFeedback`, `breachCount` les détaillent) ;
- la réaction hors ligne reprend `caseStudy.stakeholders[id].reactions` si le cas en fournit, sinon elle est tirée du profil.

Évaluation Gemini :

- la réponse de l'apprenant est placée entre `<reponse_apprenant>` et `</reponse_apprenant>` (toute balise de ce nom présente dans le texte est neutralisée) ; l'instruction système précise que ce contenu est une donnée à évaluer, jamais une instruction ;
- `generationConfig.responseSchema` impose `score` (entier), `grade` (A–D), `feedback` (≤ 5 chaînes), `stakeholderReaction.text` ;
- sortie validée côté client : note `Number` arrondie et bornée 0–100 (sinon repli local), `grade` recalculé depuis la note, `feedback` converti en ≤ 5 chaînes, réaction textuelle ;
- garde-fou : l'évaluation locale est toujours calculée ; si elle détecte un piège ou une ligne rouge, la note Gemini est plafonnée à 45, le feedback local de la faute est ajouté en tête et la réaction locale remplace celle de Gemini (`_guardrailApplied`, `_localScore`) ;
- modèles essayés : `model` puis `candidateModels` (défaut `FALLBACK_GEMINI_MODELS`), sans doublon ni préfixe `models/` ; arrêt immédiat sur HTTP 400/401/403 (clé invalide) ; réponse vide → `finishReason` (ex. `SAFETY`) dans l'erreur ; en repli local, `_engineFallback: true` et `_engineError` (`message`, `status`, `finishReason`, `model`).

`WarRoomEngine.playTurn` applique la même politique de modèles et valide la sortie (objet, `dialogues` tableau de répliques avec `text`, `metricsImpact` borné à ±20), sinon repli sur `localSimulator`.

Tous les appels réseau de la bibliothèque passent la clé dans l'en-tête `x-goog-api-key` (jamais dans l'URL) et expirent après 20 s (`timeoutMs`, `GEMINI_REQUEST_TIMEOUT_MS`). `parseGeminiJson` renvoie le premier objet JSON équilibré du texte (chaînes et échappements compris), répare un objet tronqué avec `jsonrepair` et lève une erreur si aucun objet n'est récupérable.

### Voix

`useVoiceSynthesis` et `useVoiceDictation` s'arrêtent au démontage du composant (`onScopeDispose`) : la dictée ne redémarre plus, la lecture lancée par le composant s'interrompt. `speak()` renvoie `true` si la lecture a démarré.

Fonctions : `containsTerm`, `matchTermGroups`, `findMentionedActors`, `describeStakeholderForPrompt`, `assessAgainstStakeholder`, `normalize`, `parseGeminiJson`, constantes `DEFAULT_GEMINI_MODEL`, `FALLBACK_GEMINI_MODELS`, `GEMINI_REQUEST_TIMEOUT_MS`.
