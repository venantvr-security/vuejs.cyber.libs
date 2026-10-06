# vuejs.libs.nexus

Bibliothèque partagée officielle de l'écosystème **NEXUS** :
- **CYBER-NEXUS** (`vuejs.cyber.nexus`) : Gestion de crise cyber, gouvernance SSI & comitologie.
- **CTI-NEXUS** (`vuejs.cti.nexus`) : Cyber Threat Intelligence, analyse de la menace, matrices opérationnelles & ROI.
- **DEPLOY-NEXUS** (`vuejs.deploy.nexus`) : Déploiement de sécurité opérationnelle en environnement complexe (PSSI, durcissement, segmentation, supervision SOC/SIEM, PCA/PRA).

Elle rassemble le thème Tailwind v3 unifié, les styles visuels, un ensemble complet de 24 composants Vue 3 accessibles, les services vocaux et les moteurs d'arbitrage/évaluation (Gemini + fallback local).

Conçue selon les principes de préservation de la propriété intellectuelle : **aucun libellé métier en dur**, externalisation totale via props, slots et fonctions d'i18n `t('...')` sans valeur par défaut codée en dur.

---

## Sommaire

1. [Installation](#installation)
2. [Thème Tailwind](#thème-tailwind)
3. [Styles & Design System](#styles--design-system)
4. [Catalogue des Composants (24)](#catalogue-des-composants-24)
5. [Services Vocaux](#services-vocaux)
6. [Profils d'Acteurs & Analyse Lexicale](#profils-dacteurs--analyse-lexicale)
7. [Moteurs Applicatifs (Gemini + Local)](#moteurs-applicatifs-gemini--local)
8. [Propriété Intellectuelle & Bonnes Pratiques](#propriété-intellectuelle--bonnes-pratiques)

---

## Installation

```bash
npm install git+https://github.com/venantvr-security/vuejs.libs.nexus.git
```

Dans le `package.json` de votre application :

```json
"dependencies": {
  "vuejs.libs.nexus": "github:venantvr-security/vuejs.libs.nexus"
}
```

---

## Thème Tailwind

Dans le fichier `tailwind.config.js` de l'application cliente :

```javascript
import { nexusPreset, nexusLibsContent } from 'vuejs.libs.nexus/tailwind.preset.js'

export default {
  presets: [nexusPreset],
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    nexusLibsContent,
  ],
}
```

> **Note de compatibilité :** L'export par défaut ainsi que l'alias historique `cyberVisualsPreset` demeurent disponibles pour préserver la rétrocompatibilité.

### Capacités du Preset

- **Palettes dynamiques** : `slate`, `cyan`, `emerald`, `amber`, `rose`, `purple`, `violet`, `blue`, `indigo` pilotées par variables CSS (triplets RGB), inversées automatiquement en mode jour via la classe `html.light`.
- **Palette applicative `cyber`** : nuances `cyber-50` à `cyber-950`, teintes sémantiques `cyber-dark`, `cyber-card`, `cyber-panel`, `cyber-border`, `cyber-accent`, `cyber-highlight`, `cyber-danger`, `cyber-warning`.
- **Échelle typographique relevée (Accessibilité WCAG)** :
  - `tiny` : 12px (réservé aux micro-badges)
  - `xs` : 13px (libellés secondaires, méta-données)
  - `sm` : 15px (corps de texte par défaut)
  - `base` : 16px (titres intermédiaires, mise en avant)
- **Typographies** :
  - `font-sans` / `font-heading` : Inter
  - `font-mono` : JetBrains Mono
- **Ombres néon / Glows** : `shadow-glow-{cyan,emerald,success,amber,warning,rose,danger,purple}`.

---

## Styles & Design System

Importer la feuille globale dans `src/style.css` **avant** les directives Tailwind :

```css
@import 'vuejs.libs.nexus/styles/index.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Architecture des feuilles de style

| Fichier | Description |
|---|---|
| `styles/tokens.css` | Variables CSS racines (nuanciers RGB, ombres, polices). |
| `accessibility.css` | Socle typographique, contraste WCAG, anneaux de focus clavier (`.cn-focus`), sélection, `.cyber-container`. |
| `styles/base.css` | Fond de page sombre, titres, chiffres tabulaires. |
| `styles/components.css` | Panneaux vitrés `glass-panel*`, barres de défilement stylisées, primitives `cn-*`. |
| `styles/animations.css` | `animate-radar`, `animate-float`, `animate-fade-in`. |
| `styles/theme-light.css` | Adaptation des variables de surface et d'accent pour le mode jour (`html.light`). |

Polices Google Fonts recommandées dans `index.html` :

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=JetBrains+Mono:wght@400..700&display=swap" rel="stylesheet">
```

### Primitives CSS `cn-*`

| Classe | Usage |
|---|---|
| `cn-section-title`, `cn-section-dot` | Titre de section en capitales + pastille lumineuse. |
| `cn-page-title`, `cn-page-subtitle` | En-tête principal et chapeau descriptif d'une vue. |
| `cn-card`, `cn-inset` | Carte vitrée translucide, encart secondaire. |
| `cn-body`, `cn-meta` | Texte courant (`text-sm`), méta-données compactes (`text-xs`). |
| `cn-pill` + `cn-pill-{cyan,emerald,amber,rose,violet,slate,blue,purple}` | Pastille de statut ou badge compact. |
| `cn-chip`, `cn-chip-active` | Puce de filtrage ou onglet discret. |
| `cn-seg`, `cn-seg-item`, `cn-seg-item-active` | Sélecteur segmenté accessible. |
| `cn-btn`, `cn-btn-primary`, `cn-btn-ghost`, `cn-btn-danger` | Boutons d'action standards. |
| `cn-icon-btn`, `cn-icon-btn-sm` | Boutons carrés pour icônes d'action. |
| `cn-input`, `cn-label` | Champs de formulaire et libellés associés. |
| `cn-bubble-user`, `cn-bubble-actor`, `cn-bubble-system` | Bulles de dialogue dans les simulateurs. |
| `cn-tab`, `cn-tab-active`, `cn-tab-mobile`, `cn-tab-mobile-active` | Onglets de navigation principale desktop & mobile. |
| `cn-table-wrap`, `cn-table` | Conteneur avec défilement horizontal et tableau stylisé. |
| `cn-focus` | Anneau de focus visible pour navigation clavier conforme WCAG. |

---

## Catalogue des Composants (24)

Les composants sont conçus pour être universels : ils n'embarquent **aucun texte applicatif en dur**. Tous les libellés sont injectés par props ou slots (internationalisation `t('...')` déléguée aux applications clientes).

### 1. Navigation & Marque

- **`CyberBrand.vue`** : Bloc d'identité de marque Nexus avec logo bouclier dégradé, titre contrasté, pastille sous-titre et description facultative.
  - *Props :* `title`, `subtitle`, `description`.
- **`CyberPageHeader.vue`** : En-tête de vue standardisé avec pastille d'état, titre hiérarchisé (`as: 'h1' | 'h2' | 'h3'`), chapeau et slot d'actions.
  - *Props :* `title`, `subtitle`, `badge`, `as`, `icon`. *Slots :* `actions`, `badge`, `default`.
- **`CyberNavTabs.vue`** : Navigation principale réactive avec rail horizontal défilant sur desktop et grille compacte sur mobile.
  - *Props :* `items` (`id`, `label`, `mobileLabel`, `icon`, `badge`, `badgeClass`, `accent`), `modelValue` (onglet actif). *Slots :* `desktop-end`.
- **`CyberScrollRail.vue`** : Rail horizontal fluide avec défilement continu au survol des chevrons, défilement par page au clic et conversion de la molette verticale en axe horizontal.
  - *Props :* `trackClass`, `fadeClass`, `speed`, `wheel`. *Slots :* `default`.
- **`CyberSidebarRailText.vue`** : Libellé vertical décoratif (`writing-mode: vertical-rl`) pour séparateurs visuels et rails latéraux.
  - *Props :* `text`.
- **`CyberFooter.vue`** : Pied de page standardisé minimaliste avec bordure supérieure et slot de contenu.

### 2. Panneaux, Modales & Conteneurs

- **`CyberModal.vue`** : Fenêtre modale accessible avec fond semi-transparent flouté, panneau centré, capture de la touche Échap et fermeture au clic extérieur.
  - *Props :* `title`, `subtitle`, `badge`, `maxWidth`, `closeLabel`. *Slots :* `header-actions`, `default`, `footer`.
- **`CyberCardCollapsible.vue`** : Carte vitrée repliable avec en-tête cliquable, chevron rotatif animé, bouton aria et slot d'actions préservé.
  - *Props :* `collapsed`, `headerClass`, `t`. *Slots :* `header`, `actions`, `default`.
- **`CyberAccordion.vue`** : Accordéon basé sur la balise native `<details>` stylisée avec chevron rotatif et respect de l'accessibilité.
  - *Props :* `title`, `open`, `badge`. *Slots :* `default`.
- **`CyberEmptyState.vue`** : Écran d'état vide avec icône thématique, titre, description et boutons d'actions.
  - *Props :* `compact`. *Slots :* `icon`, `title`, `default`, `actions`.

### 3. Matrices & Outils Métier Cybersécurité

- **`CyberAdmiraltyMatrix.vue`** : Matrice de cotation du renseignement selon le code de l'Amirauté (OTAN STANAG 2511) croisant la fiabilité de la source (A–F) et la crédibilité de l'information (1–6). Supporte la sélection interactive (`v-model`), le zonage couleur et la légende personnalisée.
  - *Props :* `modelValue`, `interactive`, `reliabilityLabels`, `credibilityLabels`, `rowAxisLabel`, `colAxisLabel`, `legend`.
- **`CyberRaciMatrix.vue`** : Matrice RACI interactive (activités × rôles). Propose le filtrage par rôle spécifique, le filtrage par lettre R/A/C/I, la colonne de justification managériale et le défilement horizontal optimisé.
  - *Props :* `activities`, `roles`, `roleLabel`, `activityLabel`, `hasRationale`, `t`.
- **`CyberActorCard.vue`** : Carte d'évaluation d'une partie prenante / acteur de comitologie. Affiche l'avatar, l'indicateur d'humeur en direct, les boutons de changement de tempérament (coopératif, exigeant, hostile), les jauges psychologiques (agacement, confiance, stress, ouverture) et la synthèse vocale intégrée.
  - *Props :* `actor`, `t`. *Événements :* `changePreset`.

### 4. Indicateurs & Données Chiffrées

- **`CyberGauge.vue`** : Jauge de métrique ou de score avec barre de progression sémantique (`role="progressbar"`), calcul de pourcentage, accents colorés et zone de pied personnalisable.
  - *Props :* `value`, `max`, `unit`, `accent`, `badgeClass`, `icon`. *Slots :* `default`.
- **`CyberStatTile.vue`** : Tuile d'indicateur clé de performance (KPI) avec variante carte ou encart, valeur principale contrastée et slot d'indice/variation.
  - *Props :* `accent`, `variant` (`card` | `inset`). *Slots :* `label`, `default`, `hint`, `icon`.
- **`CyberFormulaTooltip.vue`** : Infobulle interactive décomposant les étapes d'un calcul (lignes de décomposition `+`, `-`, `=`, sous-totaux et formule explicative).
  - *Props :* `lines` (`[{ op, label, value }]`), `formula`, `triggerLabel`. *Slots :* `title`, `default`.
- **`CyberTermTooltip.vue`** : Infobulle au survol pour termes techniques et concepts du lexique.
  - *Props :* `term`, `definition`.

### 5. Marquage TLP (Traffic Light Protocol 2.0)

- **`CyberTlpBadge.vue`** : Badge normé TLP 2.0 (`RED`, `AMBER+STRICT`, `AMBER`, `GREEN`, `CLEAR`) avec code couleur officiel et style adapté.
  - *Props :* `level`, `t`.
- **`CyberTlpText.vue`** : Composant de rendu de texte qui détecte automatiquement les occurrences `TLP:XXX` dans une chaîne brute et les remplace inline par des `CyberTlpBadge`.
  - *Props :* `text`.

### 6. Contrôles Interactifs & Formulaires

- **`CyberSegmented.vue`** : Contrôle de sélection unique accessible (`role="radiogroup"`) avec navigation aux flèches clavier, variante segmentée compacte (`variant="seg"`) ou puces (`variant="chip"`), et support du défilement horizontal.
  - *Props :* `options`, `modelValue`, `variant`, `scroll`.
- **`CyberInlineAlert.vue`** : Alerte en ligne contextuelle (`role="alert"`) avec nuance de ton (`danger`, `warning`, `info`, `success`) et bouton de fermeture.
  - *Props :* `tone`, `dismissLabel`. *Événements :* `dismiss`.

### 7. Accessibilité Vocale

- **`CyberVoiceButton.vue`** : Bouton de lecture / arrêt par synthèse vocale (Web Speech API). Masquage automatique si le navigateur n'est pas compatible.
  - *Props :* `speechId`, `text`, `voice`, `playLabel`, `stopLabel`, `showLabel`, `size`.
- **`CyberDictationButton.vue`** : Bouton micro pour dictée vocale dans un champ de saisie avec animation d'écoute.
  - *Props :* `listening`, `supported`, `startLabel`, `stopLabel`, `unsupportedLabel`, `showLabel`. *Événements :* `toggle`.
- **`CyberFocusDictation.vue`** : Micro de dictée « flottant » à monter une seule fois à la racine de l'application (`App.vue`). Il détecte automatiquement le champ texte ayant le focus dans toute l'application et y attache un bouton de dictée vocale sans intrusion dans le layout.
  - *Props :* `startLabel`, `stopLabel`.

---

## Services Vocaux

Le module `services/voiceService.js` fournit des composables Vue 3 réactifs avec arrêt automatique au démontage du composant (`onScopeDispose`) :

```javascript
import {
  useVoiceSynthesis,
  useVoiceDictation,
  isSpeechSynthesisSupported,
  isSpeechRecognitionSupported,
} from 'vuejs.libs.nexus/services/voiceService.js'

// Synthèse vocale
const { isSpeaking, speak, stop } = useVoiceSynthesis()
speak('Alerte de sécurité', { voice: 'fr-FR' })

// Dictée vocale
const { isListening, transcript, error, start, stop: stopDictation } = useVoiceDictation({
  onResult: (text) => console.log('Dicté :', text),
})
```

---

## Profils d'Acteurs & Analyse Lexicale

Le module `services/stakeholderProfile.js` permet d'analyser le discours d'un apprenant ou d'un utilisateur par rapport aux attentes, lignes rouges et tolérance au jargon d'un décideur :

```javascript
import {
  normalize,
  containsTerm,
  matchTermGroups,
  assessAgainstStakeholder,
} from 'vuejs.libs.nexus'

// 1. Normalisation résistante (minuscules, diacritiques, unités '72h'/'150k€', ponctuations)
const clean = normalize("Déploiement d'un pare-feu sous 72 h !") // -> "deploiement d un pare feu sous 72h !"

// 2. Détection lexicale avec proposition niée
const hasFirewall = containsTerm(clean, 'pare feu', { affirmedOnly: true })

// 3. Évaluation par rapport aux attentes et lignes rouges d'un profil
const assessment = assessAgainstStakeholder(learnerText, stakeholderProfile)
```

---

## Moteurs Applicatifs (Gemini + Local)

### 1. `WarRoomEngine`

Moteur de simulation de tour de table en cellule de crise. Il sollicite l'API Gemini avec clé passée en en-tête `x-goog-api-key` (délai de 20s, bascule multi-modèles `gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-2.0-flash`) et valide strictement les répliques et deltas d'impact. En cas d'échec ou d'absence de clé, il bascule sur le simulateur local sans interruption de service.

```javascript
import { WarRoomEngine } from 'vuejs.libs.nexus'

const engine = new WarRoomEngine({
  apiKey: userApiKey,
  model: 'gemini-2.5-flash',
  systemPromptGenerator: (actors, scenario, metrics) => '...',
  localSimulator: (args) => ({ dialogues: [...], metricsImpact: {...} }),
})

const turn = await engine.playTurn({ actors, scenario, metrics, userMessage, history })
```

### 2. `TechToBoardEngine`

Moteur d'évaluation pédagogique de la communication d'un expert technique vers un décideur (Directeur Général, RSSI, DSI, Métier) :
- **Sécurité et neutralisation d'injections** : La réponse de l'apprenant est isolée dans `<reponse_apprenant>` et les balises malicieuses sont neutralisées.
- **Garde-fous stricts** : L'évaluation locale calcule systématiquement les lignes rouges et pièges franchis. Si une ligne rouge est franchie, la note Gemini est plafonnée à 45 et le feedback local est priorisé.
- **Schéma de réponse forcé** : `score`, `grade` (A–D), `feedback` (max 5 points), `stakeholderReaction`.

```javascript
import { TechToBoardEngine } from 'vuejs.libs.nexus'

const coach = new TechToBoardEngine({ apiKey: userApiKey })
const report = await coach.evaluateAnswer({
  text: learnerPitch,
  caseStudy: currentCase,
  stakeholder: selectedStakeholder,
})
```

---

## Propriété Intellectuelle & Bonnes Pratiques

Pour préserver la sanctuarisation de la propriété intellectuelle lors des échanges et développements :

1. **Aucune chaîne métier en dur** : Tous les composants d'interface de `vuejs.libs.nexus` délèguent leurs textes via props, slots ou la fonction `t('cle_i18n')`.
2. **Aucune valeur par défaut traduisible** : Les appels `t('key')` dans les templates ne doivent comporter aucun texte français/anglais en dur en second paramètre (ex. `t('btn_submit')` et NON `t('btn_submit', 'Valider')`).
3. **Fichiers de cadrage IA** : Chaque projet de l'écosystème Nexus intègre son fichier `CLAUDE.md` et `.claude/settings.json` interdisant la réinjection ou la dispersion de contenus pédagogiques confidentiels.

---

## Licence & Équipe

Projet interne — **Nexus Security Suite** (CYBER-NEXUS, CTI-NEXUS, DEPLOY-NEXUS).
Dépôt : [https://github.com/venantvr-security/vuejs.libs.nexus.git](https://github.com/venantvr-security/vuejs.libs.nexus.git)
