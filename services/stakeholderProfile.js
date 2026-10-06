// Profils de parties prenantes partagés par la War Room, le coach Tech-to-Board et les prompts Gemini.
// Les données vivent dans les applications (data/actors.js, data/coachCases.js) : ce module ne fait
// que les lire. Toutes les propriétés sont optionnelles, un profil incomplet dégrade sans casser.

/**
 * @typedef {Object} TermGroup
 * @property {string} label    Libellé lisible (feedback, prompt). Un groupe sans libellé est ignoré dans le feedback et les prompts.
 * @property {string[]} terms  Radicaux détectés en début de mot (« chiffr » → chiffrage, chiffré…), après normalisation (voir normalize)
 * @property {boolean} [negatable] Une occurrence niée (« pas de coupure », « sans FARR ») ne compte pas.
 *   Par défaut : true pour les attentes (expectations, mustConvey), false pour les lignes rouges (redLines)
 *   et les pièges (pitfalls) : une ligne rouge manquée est pire qu'un faux positif.
 *   Par défaut, une ligne rouge niée (« nous ne couperons pas le courant ») ne compte pas ; negatable: false force la détection.
 * @property {string[]} [exceptWhen] Termes qui, présents dans la même phrase que l'occurrence, l'annulent
 *   (ex. ligne rouge « report sans date » : exceptWhen ['lundi', 'jeudi', 'h', 'date'] → « reporter à jeudi 8h » ne la franchit pas)
 * @property {Object} [impact] Effet propre à l'application (ex. variation des jauges si la ligne rouge est franchie)
 */

/**
 * @typedef {Object} StakeholderProfile
 * @property {string[]} [aliases]            Façons de l'interpeller (prénom, nom, sigle du rôle)
 * @property {string} [mandate]              Responsabilité réelle dans l'organisation
 * @property {{ decides?: string[], vetoes?: string[], advises?: string[] }} [decisionRights]
 * @property {string[]} [stakes]             Ce qui compte pour lui (budget, planning, patients…)
 * @property {string[]} [evaluationCriteria] Grille avec laquelle il juge une proposition
 * @property {TermGroup[]} [expectations]    Éléments qu'une bonne réponse doit lui apporter (négation prise en compte par défaut)
 * @property {TermGroup[]} [redLines]        Propositions qu'il refuse (une occurrence niée ne compte pas, sauf negatable: false)
 * @property {'low'|'medium'|'high'} [jargonTolerance]
 * @property {string[]} [regulatoryFocus]    Textes et obligations qu'il surveille
 * @property {string} [communicationStyle]
 */

// ---------------------------------------------------------------------------------------------
// Normalisation commune au texte et aux termes
// ---------------------------------------------------------------------------------------------

/**
 * Forme canonique pour la comparaison : minuscules, sans diacritiques (le € est conservé),
 * apostrophes typographiques → ', espaces insécables → espace, traits d'union → espace,
 * espaces répétées réduites (les retours à la ligne sont conservés : ils séparent les propositions),
 * unités recollées au nombre (« 72 h » → « 72h », « 150 k€ » → « 150k€ », « 30 % » → « 30% »),
 * articles de loi uniformisés (« art.33 », « art. 33 » → « art 33 »).
 */
export function normalize(s) {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/[\u2019\u2018\u02bc\u00b4`]/g, "'")
    .replace(/[\u00a0\u202f\u2007\u2000-\u200a\u205f\u3000\t\f\v]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-\u2010\u2011]/g, ' ')
    .replace(/(\d) +(k€|m€|€|%|h|j)(?![\p{L}\p{N}'])/gu, '$1$2')
    .replace(/(^|[^\p{L}\p{N}])art\.? *(\d)/gu, '$1art $2')
    .replace(/ {2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

// Mémo d'une entrée : les moteurs testent des dizaines de termes sur le même texte
let lastRaw = null
let lastNormalized = ''
function normalizeText(text) {
  if (text === lastRaw) return lastNormalized
  lastRaw = text
  lastNormalized = normalize(text)
  return lastNormalized
}

// Unités collées à un nombre (« 150k€ », « 30 % », « 72h ») : un chiffre précédent vaut limite de mot
const UNIT_TERM = /^(k€|m€|€|%|h|j|k|m)$/i

const regexCache = new Map()
function termRegex(normalizedTerm, prefix) {
  const key = `${prefix ? 1 : 0}|${normalizedTerm}`
  let re = regexCache.get(key)
  if (!re) {
    let escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // « ne pas notifier » reconnaît aussi « ne faut surtout pas notifier » (deux mots au plus entre ne et pas)
    if (/^ne pas /.test(normalizedTerm)) escaped = escaped.replace(/^ne pas /, "ne (?:[\\p{L}']+ ){0,2}pas ")
    const start = UNIT_TERM.test(normalizedTerm) ? '(^|[^\\p{L}])' : '(^|[^\\p{L}\\p{N}])'
    const end = prefix ? '' : '(?=$|[^\\p{L}\\p{N}])'
    re = new RegExp(`${start}${escaped}${end}`, 'gu')
    if (regexCache.size > 2000) regexCache.clear()
    regexCache.set(key, re)
  }
  re.lastIndex = 0
  return re
}

// ---------------------------------------------------------------------------------------------
// Négation, limitée à la proposition qui contient le terme
// ---------------------------------------------------------------------------------------------

// Fin de proposition : ponctuation (hors décimales « 1,2 » / « 3.5 »), retour à la ligne, tiret, connecteurs
const CLAUSE_BREAK = /[;:!?\n\u2014\u2013\u2026]|(?<!\d)[.,]|[.,](?!\d)|(^|[^\p{L}])(mais|donc|alors|puis|cependant|toutefois|neanmoins|pourtant)(?=[^\p{L}]|$)/gu
// Locutions figées qui ressemblent à une négation sans en être une (texte normalisé, sans accents)
const NEGATION_IDIOMS = [
  /(^|[^\p{L}])sans (plus |aucun )?(attendre|tarder|delai|faute|doute|hesiter|hesitation|exception|equivoque|ambiguite|surprise)(?=[^\p{L}]|$)/gu,
  /(^|[^\p{L}])(pas|point) (de|d') ?(doute|panique|souci|soucis|probleme|inquietude)(?=[^\p{L}]|$)/gu,
  /(^|[^\p{L}])(aucun|nul) doute(?=[^\p{L}]|$)/gu,
  /(^|[^\p{L}])(pas|non) seulement(?=[^\p{L}]|$)/gu,
  /(^|[^\p{L}])plus que jamais(?=[^\p{L}]|$)/gu,
  /(^|[^\p{L}])si jamais(?=[^\p{L}]|$)/gu,
  /(^|[^\p{L}])pas a pas(?=[^\p{L}]|$)/gu,
  /(^|[^\p{L}])n'importe(?=[^\p{L}]|$)/gu,
  /(^|[^\p{L}])zero (trust|day|defaut|papier)(?=[^\p{L}]|$)/gu,
  // Double négation par le sens : « ne pas oublier la FARR », « il ne faut surtout pas négliger »
  /(^|[^\p{L}])((ne|n') ([\p{L}']+ ){0,2})?(pas|jamais|plus) (d')?(oubli|omett|neglig|manquer de|ometr)[\p{L}]*/gu
]
// Mots qui nient le terme qui suit (au plus NEGATION_WINDOW mots avant lui, dans la même proposition)
const NEGATORS = new Set(['sans', 'pas', 'ni', 'aucun', 'aucune', 'aucuns', 'aucunes', 'jamais', 'rien', 'nullement', 'guere', 'point', 'zero',
  'ne', "n'", 'eviter', 'evitons', 'evitez', 'evite', 'refuse', 'refusons', 'refusez', 'refuser', 'renoncer', 'renoncons', 'exclure', 'excluons'])
const NEGATION_WINDOW = 3
// Négations fortes qui portent sur toute la suite de la proposition (au plus 8 mots avant le terme) :
// « hors de question de mettre en prod tel quel », « il est exclu de déployer sans correctif »
const CLAUSE_NEGATION = /(^| )(hors de question|en aucun cas|pas question|exclue?s?|proscrite?s?|interdite?s?|inutile|nullement)( |$)/
// Négation ou condamnation qui suit le terme dans la même proposition (au plus 4 mots après) :
// « toute diffusion publique est exclue », « le blocage automatique est proscrit »,
// « ne pas notifier l'ANSSI nous exposerait à une amende », « couper le courant serait illégal »
const NEGATION_AFTER = /^([\p{L}\p{N}']+ ){0,4}?((est|sont|serait|seraient|sera|reste|restent|demeure) (donc |totalement |strictement |formellement )?(exclue?s?|proscrite?s?|interdite?s?|illegale?s?|contraire|inenvisageable|inacceptable|hors de question|une (erreur|faute))|(nous|vous|les|l') ?exposer(ait|aient|a)|(serait|seraient) (illegale?s?|contraire))( |$)/u
const CLAUSE_NEGATION_WINDOW = 8
const NEGATION_COMPLETERS = new Set(['pas', 'plus', 'jamais', 'rien', 'guere', 'point', 'aucun', 'aucune', 'nullement', 'personne'])
const TOKEN = /[\p{L}\p{N}]+'?/gu
// Compléments de temps ou d'état : jamais l'objet de la négation (« rien ne permet à ce stade d'attribuer »)
const NEVER_NEGATED_TERM = /^(a ce (stade|jour|moment|niveau)|a l'heure (actuelle|ou)|pour l'instant|pour le moment|en l'etat|a date|a cette heure)/

function clauseBefore(normalizedText, index) {
  const head = normalizedText.slice(Math.max(0, index - 160), index)
  let cut = 0
  CLAUSE_BREAK.lastIndex = 0
  let m
  while ((m = CLAUSE_BREAK.exec(head)) !== null) {
    cut = m.index + m[0].length
    if (m[0].length === 0) CLAUSE_BREAK.lastIndex++
  }
  let clause = head.slice(cut)
  for (const idiom of NEGATION_IDIOMS) clause = clause.replace(idiom, '$1 ')
  return clause
}

function clauseAfter(normalizedText, index) {
  const tail = normalizedText.slice(index, index + 80)
  CLAUSE_BREAK.lastIndex = 0
  const m = CLAUSE_BREAK.exec(tail)
  return m ? tail.slice(0, m.index) : tail
}

/** Occurrence niée : négation dans les mots qui précèdent, dans la même proposition. */
function isNegatedAt(normalizedText, index, matchEnd) {
  const before = clauseBefore(normalizedText, index).match(TOKEN) || []
  const windowTokens = before.slice(-NEGATION_WINDOW)
  const bigram = windowTokens.join(' ')
  const plainNegators = windowTokens.filter((tok) => NEGATORS.has(tok))
  const immediateNon = before[before.length - 1] === 'non'
  const multiWord = /(^| )(plutot que|au lieu)( |$)/.test(bigram)
  const clauseWide = CLAUSE_NEGATION.test(before.slice(-CLAUSE_NEGATION_WINDOW).join(' '))
  if (!plainNegators.length && !immediateNon && !multiWord && !clauseWide) {
    const after = (clauseAfter(normalizedText, matchEnd).match(TOKEN) || []).slice(0, 9).join(' ').replace(/' /g, "'")
    return NEGATION_AFTER.test(after)
  }

  // Double négation (« nous ne pouvons pas ne pas couper ») : deux « ne » dans la proposition proche
  const near = before.slice(-6)
  if (near.filter((tok) => tok === 'ne' || tok === "n'").length >= 2) return false

  // « ne … que » est une restriction, pas une négation (« nous ne coupons que le VPN »)
  const onlyNe = plainNegators.every((tok) => tok === 'ne' || tok === "n'")
  if (onlyNe && !immediateNon && !multiWord && !clauseWide && !windowTokens.some((tok) => NEGATION_COMPLETERS.has(tok))) {
    const after = (clauseAfter(normalizedText, matchEnd).match(TOKEN) || []).slice(0, 5)
    for (const tok of after) {
      if (NEGATION_COMPLETERS.has(tok)) break
      if (tok === 'que' || tok === "qu'") return false
    }
  }
  return true
}

// Au-delà, un texte artificiellement répété ne mérite pas plus d'analyse
const MAX_OCCURRENCES_CHECKED = 400

// Phrase qui contient une occurrence (bornes : . ! ? ; et retour à la ligne, hors décimales)
const SENTENCE_BREAK = /[!?;\n\u2026]|(?<!\d)\.|\.(?!\d)/g
function sentenceAt(normalizedText, start, end) {
  let from = 0
  SENTENCE_BREAK.lastIndex = 0
  let m
  const head = normalizedText.slice(Math.max(0, start - 400), start)
  while ((m = SENTENCE_BREAK.exec(head)) !== null) from = m.index + 1
  const tail = normalizedText.slice(end, end + 400)
  SENTENCE_BREAK.lastIndex = 0
  const next = SENTENCE_BREAK.exec(tail)
  return head.slice(from) + normalizedText.slice(start, end) + (next ? tail.slice(0, next.index) : tail)
}

function containsNormalized(normalizedText, normalizedTerm, prefix, affirmedOnly, exceptWhen = null) {
  if (!normalizedText || !normalizedTerm) return false
  const re = termRegex(normalizedTerm, prefix)
  let match
  let checked = 0
  while ((match = re.exec(normalizedText)) !== null) {
    const start = match.index + match[1].length
    const end = match.index + match[0].length
    // Exception du groupe dans la même phrase (« reporter à jeudi 8h » n'est pas un report sans date)
    const excepted = exceptWhen?.length && exceptWhen.some((t) => containsNormalized(sentenceAt(normalizedText, start, end), t, true, false))
    if (!excepted && (!affirmedOnly || NEVER_NEGATED_TERM.test(normalizedTerm) || !isNegatedAt(normalizedText, start, end))) return true
    if (++checked >= MAX_OCCURRENCES_CHECKED) return false
    if (match[0].length === 0) re.lastIndex++
  }
  return false
}

/**
 * Présence d'un terme en début de mot, après normalisation du texte et du terme (casse, accents,
 * apostrophes, espaces, traits d'union, unités) : évite les faux positifs par sous-chaîne
 * (« acl » dans « miracle », « red » dans « credential »).
 * prefix: true accepte les flexions (« bloqué » → « bloquée », « investir » → « investirons »).
 * affirmedOnly: true ignore les occurrences niées dans la même proposition, au plus 3 mots avant
 * le terme (« sans FARR », « pas de coupure », « ne notifions pas »), hors locutions figées
 * (« sans attendre », « pas de doute », « pas seulement », « ne … que »).
 */
export function containsTerm(text, term, { prefix = false, affirmedOnly = false } = {}) {
  if (!text || !term || typeof term !== 'string') return false
  return containsNormalized(normalizeText(text), normalize(term), prefix, affirmedOnly)
}

/**
 * Groupes de termes présents / absents dans un texte.
 * Négation : un groupe negatable (par défaut options.negatable, true) ignore les occurrences niées
 * (« sans FARR » ne satisfait pas l'attente « FARR ») ; un groupe negatable: false compte toute occurrence.
 * Écrire la négation dans le terme lui-même quand elle est fautive (« ne pas notifier »).
 * Les groupes sans libellé sont évalués (metGroups) mais absents de met / missed.
 */
export function matchTermGroups(text, groups = [], { negatable = true } = {}) {
  const met = []
  const missed = []
  const metGroups = []
  const normalizedText = normalizeText(text)
  for (const group of Array.isArray(groups) ? groups : []) {
    if (!group || typeof group !== 'object') continue
    const affirmedOnly = typeof group.negatable === 'boolean' ? group.negatable : negatable
    const terms = Array.isArray(group.terms) ? group.terms : []
    const exceptWhen = Array.isArray(group.exceptWhen) ? group.exceptWhen.filter((t) => typeof t === 'string').map(normalize).filter(Boolean) : null
    const hit = terms.some((term) => typeof term === 'string' && containsNormalized(normalizedText, normalize(term), true, affirmedOnly, exceptWhen))
    const label = typeof group.label === 'string' && group.label.trim() ? group.label : null
    if (label) (hit ? met : missed).push(label)
    if (hit) metGroups.push(group)
  }
  return { met, missed, metGroups }
}

/** Acteurs interpellés dans un message (alias du profil, prénom, nom ou identifiant), par ordre d'apparition. */
export function findMentionedActors(text, actors = []) {
  const normalizedText = normalizeText(text)
  if (!normalizedText || !Array.isArray(actors)) return []
  const positions = actors.filter((actor) => actor && typeof actor === 'object').map((actor) => {
    const names = (typeof actor.name === 'string' ? actor.name : '').split(/\s+/).filter((part) => part.length > 2 && !part.endsWith('.'))
    const aliases = [...(Array.isArray(actor.profile?.aliases) ? actor.profile.aliases : []), ...names, actor.id]
    let first = Infinity
    for (const alias of aliases) {
      if (typeof alias !== 'string') continue
      const normalizedAlias = normalize(alias)
      if (!normalizedAlias) continue
      const match = termRegex(normalizedAlias, false).exec(normalizedText)
      if (match) first = Math.min(first, match.index + match[1].length)
    }
    return { actor, first }
  })
  return positions.filter((p) => p.first !== Infinity).sort((a, b) => a.first - b.first).map((p) => p.actor)
}

const JARGON_LABELS = {
  low: 'faible : vulgarisation obligatoire, analogies métier',
  medium: 'moyenne : termes techniques acceptés s\'ils sont expliqués',
  high: 'élevée : attend de la précision technique'
}

/** Bloc de description d'une partie prenante pour un prompt LLM (lignes vides omises). */
export function describeStakeholderForPrompt(actor) {
  if (!actor) return ''
  const p = actor.profile || {}
  const rights = p.decisionRights || {}
  const list = (items) => (items || []).filter((item) => typeof item === 'string' && item.trim()).join(' ; ')
  const labels = (groups) => list((Array.isArray(groups) ? groups : []).map((g) => g?.label))
  const lines = [
    `### ${actor.name || actor.id || 'Interlocuteur'}${actor.role ? ` (${actor.role})` : ''}${actor.id ? ` [id: ${actor.id}]` : ''}`,
    actor.organization && `- Organisation : ${actor.organization}`,
    p.mandate && `- Mandat : ${p.mandate}`,
    rights.decides?.length && `- Décide : ${list(rights.decides)}`,
    rights.vetoes?.length && `- Peut bloquer : ${list(rights.vetoes)}`,
    rights.advises?.length && `- Donne un avis sur : ${list(rights.advises)}`,
    p.stakes?.length && `- Enjeux personnels : ${list(p.stakes)}`,
    p.evaluationCriteria?.length && `- Juge une proposition selon : ${list(p.evaluationCriteria)}`,
    labels(p.expectations) && `- Attend dans une réponse : ${labels(p.expectations)}`,
    labels(p.redLines) && `- Lignes rouges : ${labels(p.redLines)}`,
    p.regulatoryFocus?.length && `- Cadre surveillé : ${list(p.regulatoryFocus)}`,
    p.jargonTolerance && `- Tolérance au jargon : ${JARGON_LABELS[p.jargonTolerance] || p.jargonTolerance}`,
    p.communicationStyle && `- Style : ${p.communicationStyle}`
  ]
  return lines.filter(Boolean).join('\n')
}

/**
 * Confronte un texte au profil : attentes satisfaites, lignes rouges franchies.
 * Sert au moteur local (War Room, coach) quand Gemini n'est pas disponible.
 * Attentes et lignes rouges ignorent les occurrences niées (« nous ne couperons pas le courant ») ;
 * negatable: false sur un groupe, ou options.redLinesNegatable: false, force la détection de toute occurrence.
 */
export function assessAgainstStakeholder(text, actor, { redLinesNegatable = true } = {}) {
  const p = actor?.profile || {}
  const expectations = matchTermGroups(text, p.expectations, { negatable: true })
  const redLines = matchTermGroups(text, p.redLines, { negatable: redLinesNegatable })
  return {
    expectationsMet: expectations.met,
    expectationsMissed: expectations.missed,
    redLinesCrossed: redLines.met,
    // Groupes complets (avec leur éventuel impact) pour les moteurs applicatifs
    expectationGroups: expectations.metGroups,
    redLineGroups: redLines.metGroups
  }
}
