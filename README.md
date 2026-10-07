# vuejs.libs.nexus

Bibliothèque partagée officielle de l'écosystème **NEXUS** :
- **CYBER-NEXUS** (`vuejs.cyber.nexus`) : Gestion de crise cyber, gouvernance SSI & comitologie.
- **CTI-NEXUS** (`vuejs.cti.nexus`) : Cyber Threat Intelligence, analyse de la menace, matrices opérationnelles & ROI.
- **DEPLOY-NEXUS** (`vuejs.deploy.nexus`) : Déploiement de sécurité opérationnelle en environnement complexe (PSSI, durcissement, segmentation, supervision SOC/SIEM, PCA/PRA).

Elle rassemble le thème Tailwind v3 unifié, les styles visuels, un ensemble complet de 25 composants Vue 3 accessibles, les services vocaux, l'API conversationnelle des War Rooms et les moteurs d'arbitrage/évaluation (Gemini + fallback local).

Conçue selon les principes de préservation de la propriété intellectuelle : **aucun libellé métier en dur**, externalisation totale via props, slots et fonctions d'i18n `t('...')` sans valeur par défaut codée en dur.

---

## Sommaire

1. [Installation](#installation)
2. [Thème Tailwind](#thème-tailwind)
3. [Styles & Design System](#styles--design-system)
4. [Catalogue des Composants (25)](#catalogue-des-composants-25)
5. [Services Vocaux](#services-vocaux)
6. [Profils d'Acteurs & Analyse Lexicale](#profils-dacteurs--analyse-lexicale)
7. [Lignes rouges génériques & garde-fous de notation](#lignes-rouges-génériques--garde-fous-de-notation)
8. [API conversationnelle (War Room)](#api-conversationnelle-war-room)
9. [Moteurs Applicatifs (Gemini + Local)](#moteurs-applicatifs-gemini--local)
10. [Tests](#tests)
11. [Propriété Intellectuelle & Bonnes Pratiques](#propriété-intellectuelle--bonnes-pratiques)

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

### Points d'entrée

| Import | Contenu |
|---|---|
| `vuejs.libs.nexus` | JavaScript pur (moteurs, API conversationnelle, analyse lexicale, Gemini). Importable sous Node : ni `.vue`, ni Vue, ni `tailwindcss` à l'exécution. Depuis 1.1.0, le preset Tailwind n'y est plus réexporté (aucune application ne l'importait par là). |
| `vuejs.libs.nexus/components/<Nom>.vue` | Un composant. Barrel : `vuejs.libs.nexus/components` (ou `/components/index.js`). |
| `vuejs.libs.nexus/services/voiceService.js` (alias `vuejs.libs.nexus/voice`) | Composables vocaux (Vue). |
| `vuejs.libs.nexus/i18n` (`services/i18n.js`) | `createI18n({ dictionaries, storageKey })` (Vue). |
| `vuejs.libs.nexus/theme` (`services/theme.js`) | `createThemeService(storageKey)` (Vue). |
| `vuejs.libs.nexus/red-lines` (`services/redLines.js`) | Familles de lignes rouges génériques (pur, aussi réexporté par le point d'entrée). |
| `vuejs.libs.nexus/scoring` (`services/scoring.js`) | Porte des lignes rouges et dégressivité des gains (pur, aussi réexporté). |
| `vuejs.libs.nexus/tailwind.preset.js` (alias `vuejs.libs.nexus/preset`) | Preset Tailwind. |
| `vuejs.libs.nexus/styles/*`, `vuejs.libs.nexus/accessibility.css` | Feuilles de style. |

Le champ `exports` du `package.json` conserve tous les sous-chemins existants (`"./*"`).

Dépendances : `jsonrepair` (dépendance) ; `vue` et `lucide-vue-next` (`>=0.363.0 <2`) en **pairs**, fournis par l'application (une seule copie de lucide dans le bundle) ; `tailwindcss` en pair facultatif.

### Services i18n et thème mutualisés

Les copies de `src/services/i18n.js` et `themeService.js` des trois applications se remplacent par deux fabriques, à API publique identique :

```javascript
// src/services/i18n.js
import { createI18n } from 'vuejs.libs.nexus/i18n'
import fr from '../locales/fr.json'
import en from '../locales/en.json'
const i18n = createI18n({ dictionaries: { fr, en }, storageKey: 'cti_nexus_locale' })
export const currentLocale = i18n.currentLocale     // ref
export const useI18n = i18n.useI18n                 // { t, currentLocale (computed), setLocale, toggleLocale }
// CYBER (clé absente → '' et avertissement en dev) : createI18n({ dictionaries: { fr }, missing: 'empty' })

// src/services/themeService.js
import { createThemeService } from 'vuejs.libs.nexus/theme'
export const { initTheme, setTheme, toggleTheme, useTheme } = createThemeService('cti_nexus_theme')
```

Options de `createI18n` : `defaultLocale` ('fr'), `fallbackLocale` ('fr'), `fallbackPerKey` (false), `missing` ('key' | 'empty' | fonction), `warnMissing`. `createThemeService(storageKey, { defaultTheme: 'dark', root })` pose `light` / `dark` sur `<html>`.

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
| `styles/animations.css` | `animate-radar`, `animate-float`, `animate-fade-in` ; `prefers-reduced-motion` neutralise aussi `animate-bounce`, `animate-spin`, `animate-pulse`, `animate-ping`. |
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
| `cn-btn`, `cn-btn-primary`, `cn-btn-ghost`, `cn-btn-danger` | Boutons d'action standards (`cn-btn-primary:disabled` reste lisible, en mode nuit comme en mode jour). |
| `cn-icon-btn`, `cn-icon-btn-sm` | Boutons carrés pour icônes d'action (`cn-icon-btn-sm` : 44 px au pointeur grossier ou sous `sm`). |
| `cn-touch` | Cible tactile : 44 × 44 px au moins au pointeur grossier ou sous `sm` (WCAG 2.5.8). |
| `cn-input`, `cn-label` | Champs de formulaire (placeholder `slate-400`, `#64748b` en mode jour) et libellés associés. |
| `cn-bubble-user`, `cn-bubble-actor`, `cn-bubble-system` | Bulles de dialogue dans les simulateurs. |
| `cn-tab`, `cn-tab-active`, `cn-tab-mobile`, `cn-tab-mobile-active` | Onglets de navigation principale desktop & mobile. |
| `cn-table-wrap`, `cn-table` | Conteneur avec défilement horizontal et tableau stylisé. |
| `cn-focus` | Anneau de focus visible pour navigation clavier conforme WCAG. |

---

## Catalogue des Composants (25)

Les composants sont conçus pour être universels : ils n'embarquent **aucun texte applicatif en dur**. Tous les libellés sont injectés par props ou slots (internationalisation `t('...')` déléguée aux applications clientes).

### 1. Navigation & Marque

- **`CyberBrand.vue`** : Bloc d'identité de marque Nexus avec logo bouclier dégradé, titre contrasté, pastille sous-titre et description facultative.
  - *Props :* `title`, `subtitle`, `description`.
- **`CyberPageHeader.vue`** : En-tête de vue standardisé avec pastille d'état, titre hiérarchisé (`as: 'h1' | 'h2' | 'h3'`), chapeau et slot d'actions.
  - *Props :* `title`, `subtitle`, `badge`, `as`, `icon`. *Slots :* `actions`, `badge`, `default`.
- **`CyberNavTabs.vue`** : Navigation principale réactive avec rail horizontal défilant sur desktop ; sur mobile, grille compacte (`mobileLayout: 'grid'`, défaut) ou une seule ligne défilante avec accrochage et onglet actif gardé visible (`mobileLayout: 'scroll'`, cibles de 44 px).
  - *Props :* `items` (`id`, `label`, `mobileLabel`, `icon`, `badge`, `badgeClass`, `accent`, `testId` → `data-testid`, `attrs` → attributs posés sur le bouton), `modelValue` (onglet actif), `mobileLayout`, `mobileCols`. *Slots :* `desktop-end`.
- **`CyberScrollRail.vue`** : Rail horizontal fluide avec défilement continu au survol des chevrons, défilement par page au clic et conversion de la molette verticale en axe horizontal.
  - *Props :* `trackClass`, `fadeClass`, `speed`, `wheel`. *Slots :* `default`.
- **`CyberSidebarRailText.vue`** : Libellé vertical décoratif (`writing-mode: vertical-rl`) pour séparateurs visuels et rails latéraux.
  - *Props :* `text`.
- **`CyberFooter.vue`** : Pied de page standardisé minimaliste avec bordure supérieure et slot de contenu.
  - *Props :* `hideOnMobile` (masqué sous `mobileBreakpoint`), `mobileBreakpoint` (`'sm'` | `'md'` | `'lg'`, défaut `'md'`).

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

### 7. Conversation

- **`CyberChatBubble.vue`** : Bulle de réplique d'une partie prenante. Avatar cerclé selon l'humeur, nom, rôle, pastille d'humeur, heure lisible (`slate-400`), flèche vers l'acteur visé quand la réplique s'adresse à un collègue (nom lu par les lecteurs d'écran via `labels.addressedTo`, texte `sr-only`). Une question adressée au joueur est sortie du corps et affichée dans un encadré mis en avant (`role="note"`, **sans** `aria-live` : la bulle est déjà annoncée par le journal `role="log"`) avec un bouton « Répondre » (44 px sur mobile). La correspondance question / texte ignore la casse, le vocatif initial (« Thomas, … ») et les préfixes de relance : la question n'apparaît qu'une fois. États de l'encadré : ouvert (ambre, réservé à la question), `answered` (« Répondu », bordure émeraude, sans opacité réduite : contraste AA), `superseded` (« reposée plus bas »), relance (`intent="relance"` → `labels.relaunched`). Une question posée à un collègue s'affiche dans un encadré cyan titré `labels.questionTo`. L'humeur « agacé » utilise le violet. Texte formaté par `formatChatText` (typographie française puis échappement HTML). Aucun texte en dur : un libellé absent masque l'élément.
  - *Props :* `actor` (`{ id, name, role, avatar, voice? }`), `text`, `sentiment` (`pleased` | `neutral` | `annoyed` | `furious`), `question`, `addressee` (`'player'` ou actorId), `addresseeName`, `intent`, `time`, `timePosition` (`'header'` | `'footer'`), `speechId`, `voice` (défaut : l'objet acteur, pour `actor.voice`), `audioPosition` (`'footer'` | `'header'`), `answered`, `superseded`, `showReply`, `detectQuestion`, `questionAttrs` (défaut `data-testid="chat-question"`), `replyAttrs` (défaut `data-testid="chat-reply-button"`, `data-actor-id`), `labels` (`{ questionForYou, answered, superseded, relaunched, questionTo, replyTo, addressedTo, play, stop, sentiment: { pleased, neutral, annoyed, furious } }`, `{name}` remplacé par le prénom), `formatter`.
  - *Attributs :* l'encadré porte `data-question-state` (`open` | `answered` | `superseded` | `peer`).
  - *Événements :* `reply(actorId, question)`. *Slots :* `avatar`, `body` (`{ body, html }`), `question-actions` (`{ question, actorId, state }`), `actions`.

### 8. Accessibilité Vocale

- **`CyberVoiceButton.vue`** : Bouton de lecture / arrêt par synthèse vocale (Web Speech API). Masquage automatique si le navigateur n'est pas compatible.
  - *Props :* `speechId`, `text`, `voice` (identifiant de profil, acteur `{ id, voice }` ou profil `{ pitch, rate, female }`), `playLabel`, `stopLabel`, `showLabel`, `size`.
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
  useConversationReplay,
  resolveVoiceProfile,
  speak,
  speakQueue,
  stopSpeaking,
  currentlySpeakingId,
} from 'vuejs.libs.nexus/services/voiceService.js'

// Lecture d'une réplique (bouton lecture / arrêt) : voix = identifiant, acteur ou profil
const { play, stop, currentlySpeakingId, isSupported } = useVoiceSynthesis()
play(`msg-${msg.id}`, msg.text, actor) // actor.voice { female, pitch, rate } prioritaire

// Lecture directe, avec profil explicite
speak('Alerte de sécurité', { voiceProfile: { female: true, pitch: 1.1, rate: 1 } })

// Relecture séquentielle de toute la conversation (surligne la bulle lue via currentlySpeakingId)
const { isReplaying, currentIndex, replay, stop: stopReplay } = useConversationReplay()
replay(messages, { resolveActor: (m) => actors.find((a) => a.id === (m.actorId || m.sender)), idOf: (m) => `msg-${m.id}` })

// Dictée vocale : langue suivant l'interface, messages d'erreur fournis par l'application
const { isListening, dictationError, start, stop: stopDictation, toggle } = useVoiceDictation({
  onTranscript: (text) => { input.value = text },
  lang: () => (currentLocale.value === 'en' ? 'en-US' : 'fr-FR'),   // chaîne, ref ou fonction ; défaut 'fr-FR'
  messages: { notAllowed: t('dictation_not_allowed') },             // clés de DICTATION_MESSAGES_FR
})

// Table des voix propre à l'application (acteurs absents de la table par défaut)
registerVoiceProfiles({ ciso: { female: true, pitch: 1.05, rate: 1 } })
```

`resolveVoiceProfile(actorOrId)` lit `actor.voice` (`{ female, pitch, rate }`), puis `actor.gender`, puis la table par identifiant (`dg`, `rssi`, `leaddev`, `auditor`, `dsi_local`, `soc_lead`, `ot_lead`, `cfo`, `cto`, `devsecops`, `dpo`…). Quand un même identifiant désigne des personnes différentes selon l'application (ex. `soc_lead`), renseigner `voice` dans les données de l'acteur.

---

## Profils d'Acteurs & Analyse Lexicale

Le module `services/stakeholderProfile.js` permet d'analyser le discours d'un apprenant ou d'un utilisateur par rapport aux attentes, lignes rouges et tolérance au jargon d'un décideur :

```javascript
import {
  normalize,
  containsTerm,
  matchTermGroups,
  assessAgainstStakeholder,
  findAddressedActors,
} from 'vuejs.libs.nexus'

// 1. Normalisation résistante (minuscules, diacritiques, unités '72h'/'150k€', ponctuations)
const clean = normalize("Déploiement d'un pare-feu sous 72 h !") // -> "deploiement d un pare feu sous 72h !"

// 2. Détection lexicale avec proposition niée
const hasFirewall = containsTerm(clean, 'pare feu', { affirmedOnly: true })

// 3. Évaluation par rapport aux attentes et lignes rouges d'un profil
const assessment = assessAgainstStakeholder(learnerText, actor, { hypotheticalAsQuestion: true })
// → { expectationsMet, expectationsMissed, redLinesCrossed, redLinesProbed, expectationGroups,
//     redLineGroups, redLineProbedGroups, totalScore, hasRedLine }

// 4. Interpellation (vocatif, « @alias », « qu'en pense X », « Madame la DG ») vs simple mention
const { addressedIds, mentionedIds } = findAddressedActors('Julien, quel délai ?', actors)
```

- Négation : « ne … point » nie, « faisons un point » non ; « rien que la FARR » est une restriction ; « sans attendre » n'est figé que sans complément (« sans attendre la FARR » nie la FARR).
- Ligatures : « œ » et « æ » sont dépliés (« mise en oeuvre » = « mise en œuvre »).
- Alias thématiques (« conformité », « RGPD », « CERT ») : les écrire `{ term, addressOnly: true }` dans `profile.aliases` pour qu'ils ne comptent qu'en interpellation directe.
- `describeStakeholderForPrompt(actor, options)` : `includeAliases` (true, « - Interpellé par : … »), `includeCriteria` (true), `includeAdvises` (true), `regulatoryFocus` (`'full'` | `'short'` | `'none'`), `regulatoryNote`, `compact` (raccourci : sans alias, critères ni avis, références réglementaires courtes via `shortRegulatoryRef`).

#### Groupes de termes enrichis (`TermGroup`)

```javascript
expectations: [
  { label: 'Notification ANSSI', all: [['notif', 'signal'], ['anssi']] },          // cooccurrence
  { label: 'Coût chiffré', terms: ['coût', 'budget'], requires: ['amount'] },      // preuve exigée
  { label: 'Date de retest', terms: ['retest'], question: 'Quelle date de retest ?', spoken: 'la date de retest' }
],
redLines: [
  { label: 'Dissimulation', patterns: ['concealment', 'lateNotification'] },     // motifs, sans liste de termes
  { label: 'Homologation contournée', patterns: ['bypassApproval'], question: 'Qui signe la FARR si on ouvre lundi ?' },
  { label: 'Coupure SCADA', terms: ['couper le scada'] }                          // « coupait / couperions le SCADA » reconnus
]
```

- `all` : chaque sous-liste doit avoir un terme présent ; `requires` : `amount`, `duration`, `amountOrEffort`, `riskScore`, `date`, `number` (`REQUIREMENT_PATTERNS`), RegExp ou fonction ; `patterns` : clés de `RED_LINE_PATTERNS` (historiques `concealment` alias `silence`, `lateNotification`, `untraced`, `bypassApproval`, `dropPentest` ; familles `bypassControl`, `evidenceTampering`, `stolenDataPayment` alias `ransomPayment`, `abruptShutdown`), RegExp ou fonction ; `families` : familles génériques reliées au groupe (voir section suivante). Les tournures refusées (« il est exclu de… », « nous ne déploierons pas sans homologation », « on n'ouvre pas sans homologation ») ne comptent pas.
- `conjugate: true` (par groupe, ou option de `matchTermGroups` / `containsTerm`) reconnaît les formes conjuguées d'un terme « verbe à l'infinitif + complément » ; activé par défaut pour les lignes rouges dans `assessAgainstStakeholder` (`conjugateRedLines: false` pour l'éteindre).
- `question` (attente ou ligne rouge) est reprise par `buildFollowUpQuestion` ; `spoken` donne la forme orale avec article.
- `isHypotheticalSentence` (inchangé) : interrogative, « et si… », conditionnel ou « si » + imparfait = phrase hypothétique. **Depuis 1.2.0, ce n'est plus ce qui décide si une ligne rouge est testée** : voir `redLineModality` ci-dessous.
- `assessAgainstStakeholder(text, actor, { hypotheticalAsQuestion: true })` : une PROPOSITION franchit la ligne rouge quelle que soit sa forme (conditionnel « on pourrait… », « il suffirait de… », impératif « évitons de… », infinitif « inutile d'en parler », euphémisme, question orientée « pourquoi ne pas… ? », demande d'accord « …, d'accord ? ») → `redLinesCrossed` ; seule une vraie question exploratoire (« Et si on… ? », « Que se passerait-il si… ? », « Peut-on… ? », « Je me demande si… ») va dans `redLinesProbed` ; une mise en garde (« si on coupait le SCADA, on perdrait la production », « couper le SCADA serait illégal ») ne franchit rien. `conditionalAsProbe: true` rétablit l'ancienne règle.
- `assessAgainstStakeholder` : lignes rouges évaluées phrase par phrase (`redLineTriggers` : `terms`, `all` ou clé de motif) ; une attente citée dans une phrase qui franchit une ligne rouge ne compte pas (`neutralizeRedLineSentences`, true) ; `expectationsInQuestions` (true). `assessAll(text, actors)` applique cette neutralisation à tous les acteurs à la fois.
- `mergeStakeholderForScenario(actor, scenario, { anglesKey = 'actorAngles' })` : angle par scénario (`concern`, `keyAngle`, `expectations` qui remplacent les attentes génériques sauf `replaceExpectations: false`, `redLines` ajoutées en tête sauf `replaceRedLines: true`, `questions`, `answers`, `aliases`), angle complet sous `actor.scenarioAngle`.

---

## Lignes rouges génériques & garde-fous de notation

`services/redLines.js` reconnaît six familles de propositions fautives par leur **structure** (morphologie des verbes, tournures, champs sémantiques), sans liste de phrases :

| Famille | Exemples reconnus (toutes formes : conditionnel, impératif, infinitif, futur proche, passif, impersonnel) |
|---|---|
| `concealment` | taire, omettre, « évitons d'en parler », « inutile de le mentionner », « sans le noter dans le registre », « personne ne posera la question », « présenter un tableau tout vert », « laisser de côté dans l'AIPD » (autorité, comité, registre, AIPD, patients, clients ; réserve envers la presse seule exclue) |
| `lateNotification` | « attendre lundi pour prévenir l'ANSSI », « attendre d'être sûrs avant de parler à la CNIL », « ne notifier qu'une fois l'enquête bouclée », « la déclaration attendra », « les 72 h, c'est indicatif » (CNIL, ANSSI, ARS, ACPR/BCE, clients, personnes concernées) ; attendre la classification DORA, compléter une notification déjà faite ou notifier « sous 72 h » ne comptent pas |
| `bypassControl` | ouvrir sans homologation, « l'homologation suivra », suspendre la security gate, « le pentest, on peut s'en passer », « se contenter des scans automatiques », pousser directement en production (classes `approval`, `pentest`, `review`, `testing`, `staging`) |
| `evidenceTampering` | purger les journaux, réinstaller avant la collecte, antidater, modifier un horodatage pour rester dans les délais (purge réglementaire et mails de phishing exclus) |
| `stolenDataPayment` | payer la rançon, racheter un échantillon, négocier le montant, verser ce que les attaquants exigent |
| `abruptShutdown` | couper, éteindre ou isoler brutalement sans plan de reprise, mode dégradé ni coordination |

```javascript
import { detectRedLines, redLineModality, withRedLineFamilies, gateDeltas, applyRedLineGate, createCreditLedger, diminishingReturns } from 'vuejs.libs.nexus'

detectRedLines('On pourrait suspendre la gate deux sprints, sans le noter dans le registre.')
// → { hasCrossed: true, hasProbed: false, crossed: [{ family: 'bypassControl', … }, { family: 'concealment', … }], … }
redLineModality('Et si on suspendait la gate ?')          // 'probed' : vraie question exploratoire
redLineModality('Pourquoi ne pas suspendre la gate ?')    // 'crossed' : question orientée = proposition

// Relier une famille aux lignes rouges d'un acteur (redLine.families), avec paramètres
const actors = withRedLineFamilies(baseActors, {
  dpo: { 'Notification CNIL retardée': [{ family: 'lateNotification', targets: ['cnil', 'personnes'] }] },
  rssi: { 'Homologation contournée': [{ family: 'bypassControl', controls: ['approval', 'pentest'] }] }
})
// ou directement dans les données : redLines: [{ label, families: ['concealment'] }]
```

- **Modalité** (`redLineModality`, `isExploratoryQuestion`) : proposition → `crossed` ; vraie question exploratoire sans engagement → `probed` ; une question suivie d'un argument en faveur (« …? Ça éviterait la panique. ») redevient une proposition. **Négation réelle** (« on ne retardera pas la notification », « hors de question de dissimuler », « n'ouvrons pas sans homologation »), mise en garde (`isWarningSentence`) et contraste (« plutôt que d'attendre… ») ne comptent pas.
- **Paramètres** : `targets` (clés de `RED_LINE_TARGETS` : `cnil`, `anssi`, `ars`, `acpr`, `bce`, `comite`, `registre`, `patients`, `clients`, `personnes`… ou termes libres), `controls` (`RED_LINE_CONTROLS`). `resolveFamilySpec`, `familyHit(text, spec)` (booléen), `linkRedLineFamilies(redLines, mapping, { addMissing })`.
- **Porte des lignes rouges** (`services/scoring.js`) : dès qu'une ligne rouge est franchie OU testée, aucune variation positive n'est accordée ce tour. `gateDeltas(deltas, gate, { penalty })` (moteurs locaux ; `gate` = booléen, résultat de `detectRedLines`, évaluation(s) d'acteurs ou `{ crossed, probed }`), `applyRedLineGate(turn, { userMessage, actors })` (tour canonique ou historique, plafonds `impact` des groupes franchis, `turn._redLineGate`), `redLineGateState`. `WarRoomEngine` l'applique à chaque tour (Gemini ou local).
- **Dégressivité** : `createCreditLedger()` (une instance par séance), `diminishingReturns(ledger, statement)` → `{ factor, novel, repeated }` (énoncé déjà crédité ou sans élément nouveau : 0 ; peu d'éléments nouveaux : 0,5), `applyDiminishingReturns(deltas, factor)`, `ledger.record(statement)` après un crédit, `statementKey`. `WarRoomEngine({ creditLedger })` l'applique.
- `classifyPlayerMessage` expose `crossesRedLine`, `probesRedLine` et `redLines { crossed, probed }` ; une ligne rouge proposée compte comme proposition (`hasProposal`), jamais comme simple hypothèse neutre.
- Corpus étiqueté : `tests/fixtures/redlines.fr.js` (plus de 200 phrases : franchies, testées, négations, pièges métier, injections, réponses pertinentes ou hors sujet) ; `tests/redlines.test.js` exige au moins 95 % de bonnes classifications et zéro faux positif sur les pièges.

---

## API conversationnelle (War Room)

Module pur `services/conversation.js`, réexporté par `vuejs.libs.nexus`. Il fournit la mécanique de dialogue ; tout le contenu métier (scénarios, acteurs, contexte, règles propres) reste dans les applications.

| Besoin | Fonctions |
|---|---|
| Prompt système | `buildWarRoomSystemPrompt`, `buildConversationRules`, `CONVERSATION_RULES_FR`, `describeActorForWarRoom`, `describeTurnFormat` |
| Consigne de tour (anti-injection) | `buildTurnDirective`, `neutralizeDelimiters` |
| « Parfois une question » | `createQuestionPolicy` (cadence aléatoire, relance unique, `maxSilentTurns`, registre partageable), `enforcePlan` |
| Questions | `detectQuestions`, `isQuestionSentence`, `classifyPlayerMessage` (`isManipulation`, `crossesRedLine`, `probesRedLine`), `isManipulationAttempt`, `manipulationSignals`, `splitTrailingQuestion`, `markQuestions`, `originalQuestion`, `questionKey`, `sameQuestion`, `stripQuestions`, `toIndirectQuestion`, `questionToStatement` |
| Lignes rouges et notation | `detectRedLines`, `redLineModality`, `RED_LINE_FAMILIES`, `withRedLineFamilies`, `redLineOwner`, `gateDeltas`, `applyRedLineGate`, `createCreditLedger`, `diminishingReturns` (voir section précédente) |
| Suivi des questions | `analyzeQuestions` (`pending`, `answeredNow`, `answered`, `crossPending`), `pendingQuestions`, `isQuestionTreated`, `meaningfulStems` |
| Historique | `toTranscript` (formats cyber / cti / deploy ; `id`, `intent`, `engine`, `replyTo`), `buildGeminiContents` (répliques locales résumées), `recentPhrases`, `repeatedPhrases` |
| Moteurs locaux | `pickRespondents`, `createReplyPicker`, `similarity`, `isRepetitive`, `buildFollowUpQuestion`, `appendQuestion` |
| Schéma de tour | `createTurnSchema`, `CYBER_TURN_SCHEMA`, `CTI_TURN_SCHEMA` (3 répliques), `DEPLOY_TURN_SCHEMA`, `validateTurnWith`, `toResponseSchema`, `toLegacyShape` |
| Profils | `assessAll`, `mergeStakeholderForScenario`, `shortRegulatoryRef`, `RED_LINE_PATTERNS`, `REQUIREMENT_PATTERNS`, `meetsRequirements` |
| Rendu | `formatChatText`, `frenchTypography`, `typingDelay`, `readingPause`, composant `CyberChatBubble.vue` |
| Réglages Gemini | `createGeminiSettingsStore(prefix)`, `listGeminiModels(apiKey, opts)` |

### Suivi des questions (règle stricte)

`analyzeQuestions(transcript, { actors, userMessage, replyTo, maxAgeTurns = 2, multiplePerActor = false, isTreated, hints, strictReply })` renvoie `{ pending, answeredNow, answered, crossPending, questions, resolvedKeys, currentTurn }`. Une question posée au joueur est traitée par un message ultérieur selon `isQuestionTreated` :

- une question pure du joueur n'est jamais une réponse ; interpeller l'acteur ne suffit jamais ;
- bouton « Répondre » (`msg.replyTo` / `msg.replyToId`, ou `replyTo` du message courant) : **`strictReply` vaut true par défaut depuis 1.2.0** ; la réponse ciblée doit partager au moins une racine porteuse avec la question, OU apporter la valeur demandée et de la bonne nature, en tête de réponse (heure pour « à quelle heure », durée ou échéance pour « quel délai », montant pour « combien coûte », nombre pour « combien de »), OU une personne pour « qui », OU une seule des options d'un « A ou B ? », OU oui / non à une question fermée, OU une réponse courte qui reprend la préposition d'un « sur quel… ? ». Une réponse évasive (« bonne question », « je reviens vers vous ») ne traite jamais la question. Sinon la question reste en attente et la politique la relance en la reprenant ; `strictReply: false` rétablit l'ancien comportement ;
- au moins deux mots porteurs communs (chiffres et mots génériques exclus), ou interpellation + un mot porteur ;
- valeur chiffrée ou datée pour « combien / quand / quelle date / quel délai… » (avec interpellation ou un mot porteur commun) ;
- question à options « A ou B ? » : une option citée ; indices du scénario (`hints: [{ match, terms, min }]`) ; attente visée (`questionTopic`) satisfaite ;
- question ouverte (« Que proposez-vous ? ») : toute proposition ou 12 mots au moins.

Les préfixes de relance (« Je repose ma question : », « Vous n'avez pas répondu : »…) sont retirés partout : la question d'origine sert de clé (`originalQuestion`, `questionKey`), jamais de préfixe imbriqué. `pendingQuestions` renvoie `analyzeQuestions(...).pending`.

### Politique de questions

```javascript
const policy = createQuestionPolicy({
  rate: 0.5, minGapTurns: 2,          // cadence : tirage si au moins 2 tours depuis la dernière question
  maxSilentTurns: 2,                  // question forcée après 2 tours muets (plan.forced)
  maxRelances: 1,                     // relance unique par question d'origine
  relanceRegistry: sharedMap,         // registre partageable (relances propres à l'application : policy.markRelanced)
  clarificationTopic: ({ actorId, candidates, missed, userMessage, scenario }) => ({ actorId, topic: bankQuestion, bank: true }),
  ledger,                             // { isCovered(actorId, label) } : jamais une attente déjà couverte comme sujet
  manipulationLead: 'dg',             // seul intervenant sur une tentative de manipulation (plan.injection)
  questionOptions: { strictReply: true },
})
const plan = policy.plan({ userMessage, actors, transcript, replyTo, pending, analysis, ledger, scenario })
```

Priorités : manipulation (aucune question) → ligne rouge franchie (challenge, prioritaire sur la relance ; profil d'acteur ou famille générique confiée à `redLineOwner`, `plan.redLine = 'crossed'`) → réponse ciblée hors sujet (relance immédiate qui reprend la question d'origine, `plan.offTopicReply`) → relance d'une question en attente (soumise à `minGapTurns` sauf `relanceRespectsGap: false`, comptée comme une question, jamais quand le joueur interpelle un autre acteur, `relanceOnPureQuestion`) → question pure (aucune question, sauf ligne rouge testée) → ligne rouge testée (challenge, `plan.redLine = 'probed'`) → `maxSilentTurns` → tirage. `buildFollowUpQuestion` relance toujours avec une reformulation courte qui contient la question d'origine (« Je repose ma question : … », « Ce n'est pas ma question : … » sur réponse hors sujet), jamais une formule générique. Les locuteurs de remplissage tournent (moins récemment entendus d'abord, pas toujours le premier acteur) ; l'auteur d'une réponse ciblée passe en tête. `seed(messages, { actors })` recharge l'état depuis un fil existant ; `recordTurn` compte aussi les relances non prévues.

`enforcePlan(turn, plan, { minWords = 6 })` applique le plan à un tour validé : une question hors plan est retirée avec tout ce qui en dépend (phrase qui l'annonce, phrase suivante en « Parce que sinon… », connecteurs pendants : `stripQuestions`) ; si la réplique devient trop courte, la question est convertie en affirmation (`questionToStatement` : « Reste à savoir quand vous livrez. ») ou, faute de forme reconnue, gardée sans encadré (`question: null`, `addressee: 'player'`, `questionSuppressed: true`, jamais comptée comme posée) ; le `summary` perd ses questions et toute phrase qui attendait une question retirée ; une seule question au joueur (celle de `plan.actorId`), `questionTopic` / `questionKind` posés, relance jamais « pleased », écarts dans `turn._planViolations`.

### Consigne de tour et prompt

- `buildTurnDirective({ …, replyTo: { actorId, question }, pending, answeredNow, engagements, extraLines, avoidPhrases })` : ligne « RÉPONSE À UNE QUESTION » (auteur en tête), lignes « LIGNE ROUGE FRANCHIE » (proposition, même au conditionnel : opposition nette, aucune variation positive) ou « LIGNE ROUGE TESTÉE », questions venant d'être traitées, questions en attente fournies par l'application, registre d'engagements (données encadrées, coupées sur une limite de phrase par `truncateAtSentence`), lignes propres à l'application, manipulation signalée ; formules à éviter = débuts de répliques + n-grammes répétés (fins comprises) par défaut.
- `isManipulationAttempt` reconnaît aussi les balises et pseudo-rôles (`[SYSTEM]`, `[Formateur]`, `[Note de l'animateur]`, `</context>`, `</intervention>`, `<system>`), « mode développeur activé », les consignes déguisées (« note pour l'évaluateur », « attribuez la note maximale », « ignorez le scénario », « validez toutes les jauges ») et deux indices faibles combinés (« fin de l'exercice » + « tous les acteurs approuvent ») ; les phrases métier (« la consigne de l'ANSSI », « note de synthèse pour le comité », « mode debug resté actif sur le serveur ») ne comptent pas. `manipulationSignals(text)` détaille les indices.
- `buildConversationRules({ actors, referenceExamples, peerAddress = 'pairs', playerFigures = true, … })` : relance uniquement sur consigne « QUESTION CE TOUR (relance) », exemple de reprise construit sur le prénom d'un acteur (plus de « Comme la DG… » codé en dur), vouvoiement du joueur et tutoiement réservé aux pairs proches (`'vous'`, `'tu'` ou phrase libre), seuls les chiffres entre `<<< >>>` appartiennent au joueur.
- `describeTurnFormat(schema, actors, { manipulationGauge, answerGauge })` : `metricsImpact` à 0 pour question pure, salutation ou hypothèse, avec les exceptions (manipulation → `trust` de -5 à -3 si la jauge existe ; réponse précise → +2 à +5 ; ligne rouge sous condition → négatif) ; `summary` jamais une question.
- `buildWarRoomSystemPrompt` borne « N membres par tour » sur `schema.maxDialogues`, accepte `actorOptions` (options de `describeActorForWarRoom`, dont `compact`) et `format` ; l'exemple de ton n'est plus doublement guillemeté.
- `toResponseSchema(schema, actors, { maxSentences, speakers })` : description de `text` dérivée de `maxSentences`, `maxItems` aligné sur `speakers[1]`.
- `validateTurnWith(…, { detectFromText })` : question coupée reconstruite depuis la fin du texte ou retirée avec son fragment ; réplique tronquée ramenée à sa dernière phrase complète.

### Format canonique d'un tour

```javascript
{
  dialogues: [{
    actorId: 'rssi', actorName, actorRole,
    text: 'Le retest est prévu jeudi. Qui signe la FARR ?',
    mood: 'neutral', sentiment: 'neutral',          // identiques
    psychology: { agacement, confiance, stress, ouverture },   // 1..5, si fournie
    addressee: 'player',                             // ou l'actorId d'un collègue
    intent: 'question',                              // answer | question | objection | concession | proposal | relance
    question: 'Qui signe la FARR ?',                 // ou null
    refersTo: null                                   // propos antérieur repris
  }],
  metricsImpact: { security: 0, compliance: 5, trust: 0, teamClimate: 0 },
  summary: '…',
  _engineUsedModel | _engineFallback, _engineError, _fallbackReason, _fallbackDetail,
  _truncated, _retried, _warnings, _planViolations, _partialTurn
}
```

### Exemple

```javascript
import { WarRoomEngine, createQuestionPolicy, createReplyPicker, CTI_TURN_SCHEMA } from 'vuejs.libs.nexus'

const policy = createQuestionPolicy({ rate: 0.4 })   // une instance par session de chat
const picker = createReplyPicker()                     // reset() au changement de scénario

const engine = new WarRoomEngine({
  apiKey, model,
  turnSchema: CTI_TURN_SCHEMA,
  useResponseSchema: true,
  thinkingBudget: 0,
  questionPolicy: policy,
  promptOptions: { appContext: '…texte métier de l\'app…', extraRules: ['…'] },
  localSimulator: (args) => simulateLocalWarRoomTurn({ ...args, picker }),
})

const turn = await engine.playTurn({ actors, scenario, metrics, userMessage, history, targetActorId })
```

---

## Moteurs Applicatifs (Gemini + Local)

### 1. `WarRoomEngine`

Moteur de simulation de tour de table en cellule de crise. Il sollicite l'API Gemini avec clé passée en en-tête `x-goog-api-key` (délai de 20s ; modèles découverts via l'API avec `resolveGeminiModelChain` : `gemini-3.8-flash` par défaut, puis les mieux classés parmi ceux que l'API liste, jamais un modèle retiré ; option `discoverModels: false` pour une liste statique) et valide strictement les répliques et deltas d'impact. En cas d'échec ou d'absence de clé, il bascule sur le simulateur local sans interruption de service.

```javascript
import { WarRoomEngine } from 'vuejs.libs.nexus'

const engine = new WarRoomEngine({
  apiKey: userApiKey,
  model: 'gemini-3.8-flash',
  systemPromptGenerator: (actors, scenario, metrics) => '...',
  localSimulator: (args) => ({ dialogues: [...], metricsImpact: {...} }),
})

const turn = await engine.playTurn({ actors, scenario, metrics, userMessage, history, targetActorId, signal })
```

Nouveautés 1.1.0 :

- **Essais** : réponse tronquée ou JSON invalide → nouvel essai du même modèle avec `retryMaxTokens` (défaut `max(8192, maxTokens)`) et `thinkingBudget` 0 si le modèle l'accepte (pas les « pro »), avant le modèle suivant (`retrySameModel: false` pour l'éteindre). Aucun tour complet : `onPartial` `'accept'` (défaut, meilleur tour partiel `_truncated`), `'merge'` (complété par le simulateur local pour les acteurs absents) ou `'local'` (`turn._partialTurn`).
- **`thinkingBudget`** : nombre, fonction `(model) → nombre` ou table `{ pro: 512, default: 0 }` (`resolveThinkingBudget`) ; jamais envoyé aux modèles 2.0.
- **`_fallbackReason`** : `'nokey'` | `'auth'` | `'http'` | `'invalid'` | `'error'`, et `_fallbackDetail` `'quota'` | `'timeout'` | null.
- **`systemPromptGenerator(actors, scenario, metrics, ctx)`** : `ctx` contient aussi `userMessage`, `history` (brut), `session { turn, decisionTitle, …scenario.session }` et `turnContext`.
- **`playTurn({ …, turnContext })`** : `{ replyTo, pending, answeredNow, engagements, extraLines, avoidPhrases, ledger, analysis… }` transmis à la politique, à la consigne de tour, au prompt et au simulateur local (qui reçoit aussi `session`).
- **`transcriptFilter(transcript, history)`** : filtre officiel de l'historique normalisé (plus besoin de surcharger `transcriptOf`).
- **`historyAdapter.localMessages`** (`'mark'` par défaut) : les répliques `engine: 'local'` sont résumées côté utilisateur et marquées « à ne pas imiter », jamais rejouées comme répliques du modèle ; `historyAdapter.stripFormulas(text)` retire les formules d'ouverture connues ; `historyAdapter.replyOf(msg)`.
- **`enforcePlan`** (true) : le plan de questions est appliqué au tour validé (Gemini ou local) avant `recordTurn` ; **`detectQuestionsFromText`** (true) : false pour ne plus déduire le champ `question` de la fin du texte.
- `toResponseSchema` reçoit les options de conversation (`maxSentences`, `speakers`).

Nouveautés 1.2.0 :

- **`redLineGate`** (true) : porte des lignes rouges appliquée au tour final, Gemini ou local (aucune variation positive si une ligne rouge est franchie ou testée ; plafonds `impact` des groupes franchis, ou `redLinePenalty: { trust: -3 }`, `false` pour aucun plafond) ; détail dans `turn._redLineGate`.
- **`creditLedger`** (instance de `createCreditLedger`) : dégressivité des gains (`turn._diminished`) ; ne pas le passer si le simulateur local applique déjà sa propre dégressivité.
- **Appels limités** : un seul nouvel essai par modèle ; `maxTruncatedCalls` (2) réponses tronquées suffisent pour accepter le meilleur tour partiel sans essayer d'autre modèle ; `maxCallsPerTurn` (4) au total.
- **`dropEchoes`** (true) : une réplique Gemini recopiée d'une réplique antérieure (similarité ≥ 0,8) est retirée (`_warnings`).

Options antérieures (défauts = comportement antérieur) : `turnSchema` (défaut `CYBER_TURN_SCHEMA`), `useResponseSchema` (false), `thinkingBudget` (non envoyé), `conversation`, `questionPolicy`, `historyAdapter`, `promptOptions`, `temperature`, `normalizeLocal` (true). `maxTokens` passe à 3072 par défaut (le budget de réflexion des modèles 2.5 se prend sur `maxOutputTokens`).

- La construction du prompt est dans le `try` : une exception bascule sur le simulateur local.
- Le simulateur local reçoit `{ actors, scenario, metrics, currentMetrics, userMessage, history, transcript, targetActorId, plan, signal }` ; il peut être asynchrone. Sa sortie est normalisée au format canonique (alias `interventions` / `metricsDelta` acceptés). Sans simulateur : tour vide avec `_engineError`.
- Seuls 401/403 et un 400 `API_KEY_INVALID` arrêtent le repli multi-modèles.
- `_truncated` est posé quand `finishReason` vaut `MAX_TOKENS` ou que le JSON était incomplet ; la dernière réplique coupée est alors retirée.
- `buildAlternatingContents(history, userMessage)` garde sa signature : plus de doublon du message, consigne toujours envoyée, ouverture conservée.
- `parseGeminiJson(raw)` garde sa signature et gère désormais `+5`, les accolades dans la prose, un tableau de répliques et la troncature ; `parseGeminiJsonDetailed(raw)` renvoie `{ value, truncated }`.
- `testGeminiApiKey` renvoie aussi `requestedFound` / `requestedModel` et remonte le vrai message en cas de clé refusée.

### 2. `TechToBoardEngine`

Moteur d'évaluation pédagogique de la communication d'un expert technique vers un décideur (Directeur Général, RSSI, DSI, Métier) :
- **Sécurité et neutralisation d'injections** : La réponse de l'apprenant est isolée dans `<reponse_apprenant>` et les balises malicieuses sont neutralisées.
- **Garde-fous stricts** : L'évaluation locale calcule systématiquement les lignes rouges et pièges franchis. Si une ligne rouge est franchie, la note Gemini est plafonnée à 45 et le feedback local est priorisé.
- **Schéma de réponse forcé** : `score`, `grade` (A–D), `feedback` (max 5 points), `stakeholderReaction`, `followUpQuestion` (facultatif).
- **Question de relance** : si la note est inférieure à 75 (`FOLLOW_UP_SCORE_THRESHOLD`), la réaction du décideur se termine par une question précise (`followUpQuestion` du modèle, sinon `question` de l'attente manquante ou de la ligne rouge du profil en évaluation locale).

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

## Tests

```bash
npm ci          # jsonrepair, plus vue et lucide-vue-next en dépendances de développement
npm test        # node --test tests/*.test.js
```

Les tests (`node:test`) couvrent le corpus étiqueté des lignes rouges, injections et réponses (`tests/redlines.test.js`, ≥ 95 % et zéro faux positif sur les pièges), les garde-fous de dialogue (`tests/dialogue-guards.test.js` : `enforcePlan` sans référence orpheline, relance hors sujet, porte des lignes rouges et dégressivité dans `WarRoomEngine`, appels Gemini limités), la validation des tours (3 schémas), le contenu Gemini, la politique de questions, le suivi strict des questions, `enforcePlan`, la détection des questions, le sélecteur de répliques, la lecture du JSON, les interpellations, les négations, les motifs de lignes rouges, `WarRoomEngine` et `TechToBoardEngine` avec un `fetch` simulé, `createI18n` / `createThemeService`, et le rendu SSR de `CyberChatBubble`, `CyberNavTabs` et `CyberFooter` (les `.vue` sont compilés à la volée par `tests/helpers/vue-hooks.mjs`).

---

## Journal des versions

### 1.2.0

Corrections communes relevées par les trois applications (round 3). Exports rétrocompatibles ; deux changements de sémantique voulus :

- **Lignes rouges** : une proposition au conditionnel ou euphémisée franchit la ligne rouge (avant : simple hypothèse) ; seule une vraie question exploratoire la teste ; six familles génériques paramétrables (`services/redLines.js`), `RED_LINE_PATTERNS` étendu (clés historiques conservées), faux positif « On n'ouvre pas sans homologation » corrigé ; porte des lignes rouges (`gateDeltas`, `applyRedLineGate`) appliquée par `WarRoomEngine`. `conditionalAsProbe: true` rétablit l'ancienne règle.
- **Réponses** : `strictReply` vaut true par défaut (`isQuestionTreated`, `analyzeQuestions`) avec contrôle de la nature de la valeur ; relance qui reprend la question d'origine. `strictReply: false` rétablit l'ancien comportement.
- Injections déguisées (balises, pseudo-rôles, consignes au correcteur) ; dégressivité des gains (`createCreditLedger`, `diminishingReturns`) ; `enforcePlan` sans référence orpheline (conversion en affirmation, `minWords` 6) ; engagements coupés sur une limite de phrase ; appels Gemini limités (un essai de plus par modèle, `maxCallsPerTurn`, `maxTruncatedCalls`) ; répliques recopiées retirées.
- `normalize` et `splitSentences` vivent dans `services/text.js` (toujours exportés par `stakeholderProfile.js` et le point d'entrée).

### 1.1.0

Consolidation des demandes des trois applications (rétrocompatible : les applications compilent sans adaptation).

- Suivi des questions strict (`analyzeQuestions`, `isQuestionTreated`, `answeredNow`, plusieurs questions par acteur, `isTreated` injectable, `replyTo` pris en compte) ; relances sans préfixe imbriqué (`originalQuestion`).
- `createQuestionPolicy` : ligne rouge prioritaire, relance espacée et comptée, `maxSilentTurns`, `clarificationTopic`, rotation des locuteurs, registre de relances partageable, `seed`, manipulation ; `enforcePlan`.
- Consigne et prompt : `replyTo`, `extraLines`, `engagements`, `pending` / `answeredNow` fournis, n-grammes à éviter ; règles sans exemple codé en dur, vouvoiement / pairs, exception de manipulation ; `CTI_TURN_SCHEMA.maxDialogues` = 3 ; `toResponseSchema` aligné.
- `WarRoomEngine` : nouvel essai du même modèle, `thinkingBudget` par modèle, `_fallbackReason`, `ctx` enrichi, `transcriptFilter`, répliques locales résumées, `onPartial`, plan appliqué.
- Profils : `RED_LINE_PATTERNS`, cooccurrence `all`, `requires`, formes conjuguées, « si X, on fera Y » = engagement, neutralisation des attentes, `assessAll`, `mergeStakeholderForScenario`, description compacte.
- Rendu : `CyberChatBubble` (sans `aria-live`, états répondu / reposé, `questionAttrs` / `replyAttrs`, correspondance normalisée, 44 px), `CyberNavTabs` (`mobileLayout: 'scroll'`, `testId` / `attrs`), `CyberFooter` (`hideOnMobile`), `CyberActorCard` (voix de l'acteur) ; `cn-touch`, placeholders lisibles, bouton désactivé lisible, mouvements réduits ; `frenchTypography`, `readingPause`, `typingDelay` plus naturel (450 + 45 × mots, 700 à 3200 ms).
- Mutualisation : `createI18n`, `createThemeService`, `useVoiceDictation({ lang, messages })`, `registerVoiceProfiles`, `lucide-vue-next` en pair, `followUpQuestion` du coach ; preset Tailwind retiré du point d'entrée JS (sous-chemins conservés).

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

---

## Modèles Gemini (découverte via l'API)

- `DEFAULT_GEMINI_MODEL` = `gemini-3.8-flash` ; `FALLBACK_GEMINI_MODELS` = `[DEFAULT_GEMINI_MODEL]` (utilisée seulement si l'API ne répond pas).
- `listGeminiModels(apiKey)` : modèles `generateContent` de la clé ; `getAvailableGeminiModels(apiKey, { force })` : même liste avec cache mémoire de 10 min par clé.
- `rankGeminiModels(models, preferred)` : préféré, stables avant preview/exp, flash puis flash-lite puis pro, version décroissante ; familles retirées écartées (`isRetiredGeminiModel` : gemini-1.x, gemini-2.0).
- `pickDefaultGeminiModel(models)` : `gemini-3.8-flash` s'il est listé, sinon le mieux classé.
- `resolveGeminiModelChain(apiKey, preferred, candidates, { max: 3 })` : modèles à essayer, uniquement parmi ceux que l'API liste. Utilisé par `WarRoomEngine` et `TechToBoardEngine` (option `discoverModels`, défaut `true`).
- `createGeminiSettingsStore(prefix).reconcileModel(models)` : remplace le modèle enregistré s'il n'est plus listé ; `getModel()` remplace d'office un modèle retiré.
- `testGeminiApiKey(key, model)` : si le modèle demandé n'est pas listé, teste `pickDefaultGeminiModel(models)`.

