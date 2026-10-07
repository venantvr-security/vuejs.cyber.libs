// Profils de parties prenantes partagés par la War Room, le coach Tech-to-Board et les prompts Gemini.
// Les données vivent dans les applications (data/actors.js, data/coachCases.js) : ce module ne fait
// que les lire. Toutes les propriétés sont optionnelles, un profil incomplet dégrade sans casser.

/**
 * @typedef {Object} TermGroup
 * @property {string} label    Libellé lisible (feedback, prompt). Un groupe sans libellé est ignoré dans le feedback et les prompts.
 * @property {string[]} terms  Radicaux détectés en début de mot (« chiffr » → chiffrage, chiffré…), après normalisation (voir normalize)
 * @property {boolean} [negatable] Une occurrence niée (« pas de coupure », « sans FARR ») ne compte pas.
 *   Par défaut true partout : attentes (expectations, mustConvey), lignes rouges (redLines, sauf
 *   assessAgainstStakeholder(..., { redLinesNegatable: false })) et pièges (pitfalls du coach).
 *   Une ligne rouge niée (« nous ne couperons pas le courant ») ne compte donc pas ;
 *   negatable: false sur le groupe force la détection de toute occurrence (écrire alors la négation
 *   fautive dans le terme lui-même : « ne pas notifier »).
 * @property {string[]} [exceptWhen] Termes qui, présents dans la même phrase que l'occurrence, l'annulent
 *   (ex. ligne rouge « report sans date » : exceptWhen ['lundi', 'jeudi', 'h', 'date'] → « reporter à jeudi 8h » ne la franchit pas)
 * @property {Object} [impact] Effet propre à l'application (ex. variation des jauges si la ligne rouge est franchie)
 */

/**
 * @typedef {Object} StakeholderProfile
 * @property {Array<string|{term: string, addressOnly?: boolean}>} [aliases] Façons de l'interpeller (prénom, nom, sigle du rôle).
 *   Un alias thématique (« conformité », « RGPD », « CERT ») doit être écrit { term, addressOnly: true } :
 *   il ne compte alors que dans une interpellation directe (« Conformité, … ? ») et jamais comme simple mention.
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
// Normalisation commune au texte et aux termes (services/text.js)
// ---------------------------------------------------------------------------------------------

import { normalize, splitSentences } from './text.js'
import { RED_LINE_PATTERNS, familyHit, redLineModality, resolveFamilySpec, isWarningSentence } from './redLines.js'
export { normalize, splitSentences } from './text.js'
export { RED_LINE_PATTERNS } from './redLines.js'

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

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Verbe à l'infinitif en tête d'un terme de plusieurs mots (« couper le scada », « laisser passer », « acheter le lot ») :
// [radical, terminaison, suite]. Sert aux formes conjuguées (« coupait », « couperions », « laisse », « achetons »).
const INFINITIVE_HEAD = /^([a-z]{3,})(er|ir|re) (.+)$/

const regexCache = new Map()
function termRegex(normalizedTerm, prefix, conjugate = false) {
  const conj = conjugate ? normalizedTerm.match(INFINITIVE_HEAD) : null
  const key = `${prefix ? 1 : 0}${conj ? 'c' : ''}|${normalizedTerm}`
  let re = regexCache.get(key)
  if (!re) {
    let escaped = conj ? `${escapeRe(conj[1])}[\\p{L}]*\\s${escapeRe(conj[3])}` : escapeRe(normalizedTerm)
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
  /(^|[^\p{L}])sans (plus |aucun )?(tarder|delai|faute|doute|hesiter|hesitation|exception|equivoque|ambiguite|surprise)(?=[^\p{L}]|$)/gu,
  // « sans attendre » est figé seulement sans complément : « sans attendre la FARR » nie bien la FARR
  /(^|[^\p{L}])sans (plus )?attendre(?! ?(le|la|les|un|une|des|du|votre|notre|vos|nos|leur|leurs|ce|cet|cette|ces|son|sa|ses|mon|ma|mes)(?=[^\p{L}]|$))(?! ?[ld]')(?=[^\p{L}]|$)/gu,
  // « rien que la FARR » (= la FARR seule), « rien d'autre que » : restriction, pas négation
  /(^|[^\p{L}])rien (que|qu'|d'autre que|d'autre qu')(?=[^\p{L}]|$|\p{L})/gu,
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
  // « point » ne nie que précédé de ne/n' (« nous ne signerons point ») : « faisons un point sur la FARR » est affirmatif
  const hasNe = before.slice(-6).some((tok) => tok === 'ne' || tok === "n'")
  const plainNegators = windowTokens.filter((tok) => NEGATORS.has(tok) && (tok !== 'point' || hasNe))
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

function containsNormalized(normalizedText, normalizedTerm, prefix, affirmedOnly, exceptWhen = null, conjugate = false) {
  if (!normalizedText || !normalizedTerm) return false
  if (conjugate && INFINITIVE_HEAD.test(normalizedTerm) && containsNormalized(normalizedText, normalizedTerm, prefix, affirmedOnly, exceptWhen, false)) return true
  const re = termRegex(normalizedTerm, prefix, conjugate)
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
export function containsTerm(text, term, { prefix = false, affirmedOnly = false, conjugate = false } = {}) {
  if (!text || !term || typeof term !== 'string') return false
  return containsNormalized(normalizeText(text), normalize(term), prefix, affirmedOnly, null, conjugate)
}

// ---------------------------------------------------------------------------------------------
// Motifs de lignes rouges et exigences de preuve (texte normalisé : minuscules, sans accents,
// apostrophes droites, traits d'union → espaces)
// ---------------------------------------------------------------------------------------------

// Les motifs de lignes rouges vivent dans services/redLines.js (familles génériques, modalité proposition / question).
// RED_LINE_PATTERNS y est défini et réexporté ici pour la compatibilité :
// - concealment (alias silence), lateNotification, untraced, bypassApproval, dropPentest (clés historiques) ;
// - bypassControl, evidenceTampering, stolenDataPayment (alias ransomPayment, dataPurchase), abruptShutdown.
// Une tournure niée ou refusée (« il est exclu de… », « nous ne déploierons pas sans… ») ne compte pas.

/**
 * Preuves exigées par une attente (champ requires d'un TermGroup) : l'attente n'est satisfaite que si le
 * texte contient aussi la preuve (« Coût chiffré » → requires: ['amount']).
 */
export const REQUIREMENT_PATTERNS = Object.freeze({
  amount: /\d[\d .,]*\s?(?:k€|m€|€|keur|euros?|millions? d'euros)/u,
  duration: /\d+(?:[.,]\d+)?\s?(?:h|heures?|jours?|j|semaines?|mois|sprints?|minutes?|min)(?![\p{L}])/u,
  amountOrEffort: /\d[\d .,]*\s?(?:k€|m€|€|keur|euros?|%)|\d+(?:[.,]\d+)?\s?(?:h|heures?|jours?|j|semaines?|mois|sprints?|etp)(?![\p{L}])/u,
  riskScore: /(?:^|[^\p{L}])[gpd] ?[1-4](?![\p{L}\p{N}])|gravite\s*(?:de |= ?|a |en )?[1-4]|probabilite\s*(?:de |= ?|a |en )?[1-4]|\d\s*[x×*]\s*\d/u,
  date: /lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2} ?h|(?:^|[^\p{L}])m\d{1,2}(?![\p{L}\p{N}])|\d+ ?(?:jours?|semaines?|mois|h)(?![\p{L}])|fin du mois|fin de semaine|mensuel|hebdomadaire|quotidien|\d{1,2}\/\d{1,2}|demain|ce soir|avant le/u,
  number: /\d/
})

function testPattern(pattern, text) {
  if (typeof pattern === 'function') { try { return !!pattern(text) } catch (e) { return false } }
  if (pattern instanceof RegExp) { pattern.lastIndex = 0; return pattern.test(normalize(text)) }
  if (typeof pattern === 'string' && RED_LINE_PATTERNS[pattern]) return RED_LINE_PATTERNS[pattern](text)
  if (pattern && typeof pattern === 'object' && resolveFamilySpec(pattern)) return familyHit(text, pattern)
  return false
}

/** Le texte porte-t-il les preuves exigées (clés de REQUIREMENT_PATTERNS, RegExp ou fonctions) ? */
export function meetsRequirements(text, requires) {
  const list = Array.isArray(requires) ? requires : requires ? [requires] : []
  if (!list.length) return true
  const n = normalize(text)
  return list.every((r) => {
    if (typeof r === 'string') return REQUIREMENT_PATTERNS[r] ? REQUIREMENT_PATTERNS[r].test(n) : true
    if (r instanceof RegExp) { r.lastIndex = 0; return r.test(n) }
    if (typeof r === 'function') { try { return !!r(text) } catch (e) { return false } }
    return true
  })
}

/**
 * Groupes de termes présents / absents dans un texte.
 * Négation : un groupe negatable (par défaut options.negatable, true) ignore les occurrences niées
 * (« sans FARR » ne satisfait pas l'attente « FARR ») ; un groupe negatable: false compte toute occurrence.
 * Écrire la négation dans le terme lui-même quand elle est fautive (« ne pas notifier »).
 * Champs facultatifs d'un groupe :
 * - all: string[][] : cooccurrence, chaque sous-liste doit avoir un terme présent (« notification » ET « ANSSI ») ;
 *   combiné à terms, les deux conditions sont exigées ;
 * - patterns: (clé de RED_LINE_PATTERNS | RegExp | (texte) => booléen | référence de famille)[] : motifs qui suffisent à eux seuls ;
 * - families: (clé de famille | { family, targets?, controls? })[] : familles génériques de services/redLines.js reliées au groupe
 *   (déclencheur 'family:<clé>') ;
 * - requires: (clé de REQUIREMENT_PATTERNS | RegExp | fonction)[] : preuve exigée dans le texte (montant, durée, date…) ;
 * - conjugate: true : un terme « verbe à l'infinitif + complément » reconnaît aussi les formes conjuguées
 *   (« couper le SCADA » → « coupait le SCADA », « couperions le SCADA ») ; défaut options.conjugate (false).
 * Les groupes sans libellé sont évalués (metGroups) mais absents de met / missed.
 * triggers : libellé → ['terms' | 'all' | clé de motif | 'pattern'].
 */
export function matchTermGroups(text, groups = [], { negatable = true, conjugate = false } = {}) {
  const met = []
  const missed = []
  const metGroups = []
  const triggers = {}
  const normalizedText = normalizeText(text)
  for (const group of Array.isArray(groups) ? groups : []) {
    if (!group || typeof group !== 'object') continue
    const affirmedOnly = typeof group.negatable === 'boolean' ? group.negatable : negatable
    const conj = typeof group.conjugate === 'boolean' ? group.conjugate : conjugate
    const terms = Array.isArray(group.terms) ? group.terms.filter((t) => typeof t === 'string' && t.trim()) : []
    const exceptWhen = Array.isArray(group.exceptWhen) ? group.exceptWhen.filter((t) => typeof t === 'string').map(normalize).filter(Boolean) : null
    const has = (term) => containsNormalized(normalizedText, normalize(term), true, affirmedOnly, exceptWhen, conj)
    const all = Array.isArray(group.all) ? group.all.filter((sub) => Array.isArray(sub) && sub.some((t) => typeof t === 'string' && t.trim())) : []
    const why = []
    let hit = false
    if (terms.length || all.length) {
      const termsOk = !terms.length || terms.some(has)
      const allOk = !all.length || all.every((sub) => sub.some((t) => typeof t === 'string' && t.trim() && has(t)))
      hit = termsOk && allOk
      if (hit) why.push(all.length ? 'all' : 'terms')
    }
    for (const pattern of Array.isArray(group.patterns) ? group.patterns : group.patterns ? [group.patterns] : []) {
      if (testPattern(pattern, text)) { hit = true; why.push(typeof pattern === 'string' ? pattern : 'pattern') }
    }
    // Familles génériques reliées à la ligne rouge (« families: ['concealment', { family: 'lateNotification', targets: ['ars'] }] »)
    for (const spec of Array.isArray(group.families) ? group.families : group.families ? [group.families] : []) {
      const resolved = resolveFamilySpec(spec)
      if (resolved && familyHit(text, spec)) { hit = true; why.push(`family:${resolved.family}`) }
    }
    if (hit && group.requires && !meetsRequirements(text, group.requires)) hit = false
    const label = typeof group.label === 'string' && group.label.trim() ? group.label : null
    if (label) (hit ? met : missed).push(label)
    if (hit) {
      metGroups.push(group)
      if (label) triggers[label] = why
    }
  }
  return { met, missed, metGroups, triggers }
}

// ---------------------------------------------------------------------------------------------
// Phrases hypothétiques (le découpage en phrases vit dans services/text.js)
// ---------------------------------------------------------------------------------------------

// Hypothèse explorée (texte normalisé) : « et si… », « que se passerait-il si… », « imaginons que… »,
// tournure au conditionnel (« on pourrait », « faudrait-il », « nous couperions ») ou « si » + imparfait
// (« si on coupait le SCADA », « si on achetait le lot »). « Si X, on fera Y » (présent puis futur) est un
// ENGAGEMENT, pas une hypothèse : « si une fuite arrive, on attendra la fin du trimestre » franchit la ligne rouge.
const EXPLORATORY_MARKERS = /(?:^|[^\p{L}])(?:et si|que se passerait il|qu'arriverait il|que ferions nous|imaginons|supposons|admettons|mettons que|dans l'hypothese|a supposer|et dans le cas|pourrait|pourrions|pourriez|pourraient|faudrait|faut il|devrait|devrions|devriez|devraient|vaudrait|serait il|serait ce|serions nous)(?![\p{L}])/u
const CONDITIONAL_VERB = /(?:^|[^\p{L}])(?:je|j'|tu|il|elle|on|nous|vous|ils|elles|ca|cela|ce)(?: (?:ne|n'|le|la|les|l'|en|y|lui|leur|se|s'))*\s?[\p{L}]{2,}(?:erais|erait|erions|eriez|eraient|irais|irait|irions|iriez|iraient|rait|raient)(?![\p{L}])/u
const SI_IMPERFECT = /^(?:et |mais |alors |bon |donc )?(?:meme )?si (?:on|nous|vous|je|j'|l'on|il|elle|ils|elles|le|la|les|l'|un|une|ce|cet|cette)(?:[ ']+[\p{L}']+){0,4}?[ ']+[\p{L}]{2,}(?:ais|ait|ions|iez|aient)(?![\p{L}])/u

/**
 * La phrase est-elle exploratoire : interrogative, hypothétique (« et si… », « imaginons… »), au conditionnel
 * (« on pourrait couper… ») ou « si » + imparfait (« si on coupait le SCADA ») ?
 * « Si X, on fera Y » est un engagement conditionnel : la phrase n'est PAS exploratoire.
 */
export function isHypotheticalSentence(sentence) {
  const raw = String(sentence || '').trim()
  if (!raw) return false
  if (/\?[»"”'’)\]]*$/.test(raw)) return true
  const n = normalize(raw)
  return EXPLORATORY_MARKERS.test(n) || CONDITIONAL_VERB.test(n) || SI_IMPERFECT.test(n)
}

// ---------------------------------------------------------------------------------------------
// Interpellations et mentions
// ---------------------------------------------------------------------------------------------

const CIVILITIES = new Set(['mme', 'mlle', 'madame', 'mademoiselle', 'monsieur', 'docteur', 'professeur', 'prof', 'maitre', 'maître', 'me', 'mr', 'mrs', 'ms', 'dr', 'pr'])

/** Alias d'un acteur classés : name (prénom, nom, id), role (alias texte), theme (alias { addressOnly: true }). */
function actorAliases(actor) {
  const out = []
  const seen = new Set()
  const add = (term, tier) => {
    const normalized = normalize(term)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    out.push({ term: normalized, tier })
  }
  const nameParts = (typeof actor.name === 'string' ? actor.name : '').split(/\s+/)
    .filter((part) => part.length > 2 && !part.endsWith('.') && !CIVILITIES.has(normalize(part)))
  nameParts.forEach((part) => add(part, 'name'))
  if (typeof actor.id === 'string') add(actor.id, 'name')
  for (const alias of Array.isArray(actor.profile?.aliases) ? actor.profile.aliases : []) {
    if (typeof alias === 'string') add(alias, 'role')
    else if (alias && typeof alias === 'object' && typeof alias.term === 'string') add(alias.term, alias.addressOnly ? 'theme' : 'role')
  }
  return out
}

const OPT_CIVILITY = "(?:(?:madame|monsieur|mme|mlle|dr|docteur|professeur|pr|maitre|cher|chere|chers) )?"
const OPT_ARTICLE = "(?:la |le |les |l'|au |aux |a la |a l')?"
const INTERJECTION = "(?:(?:et|alors|bon|bien|oui|non|donc|ok|d'accord|bref|justement|enfin|tiens|attendez|voyons|pardon|desole|desolee|ecoutez|dites moi|dites nous|bonjour|bonsoir|merci|salut|bravo|a vous|a toi) *,? *){0,2}"
const ASK_BEFORE = "(?:qu'en (?:pense|pensez vous|penses tu|dit|dites vous|disent)|votre avis|ton avis|je me tourne vers|je m'adresse a|je reponds a|je demande a|je pose la question a|ma question (?:va|s'adresse) a|question pour|question a|a vous|a toi)"
const ASK_AFTER = "(?:qu'en pensez vous|qu'en penses tu|votre avis|ton avis|vous confirmez|vous validez|vous en pensez quoi|a vous|une question)"

const addressRegexCache = new Map()
function addressRegexes(escaped, tier) {
  const key = `${tier}|${escaped}`
  let list = addressRegexCache.get(key)
  if (list) return list
  const end = '(?![\\p{L}\\p{N}])'
  const a = `(${escaped})${end}`
  list = [
    // @alias
    new RegExp(`@${a}`, 'gu'),
    // Madame la DG, Docteur Bernard
    new RegExp(`(?:^|[^\\p{L}])(?:madame|monsieur|mme|mlle|docteur|dr|professeur|maitre) ${OPT_ARTICLE}${a}`, 'gu'),
    // Début de phrase (après interjection éventuelle) : « Julien, … », « Bonjour Marie : … », « DG ? »
    new RegExp(`(?:^|[.!?;\\n] *)${INTERJECTION}${OPT_CIVILITY}${OPT_ARTICLE}${a} *[,:!?]`, 'gu'),
    // « qu'en pense Julien », « je me tourne vers la DG », « à vous, Camille »
    new RegExp(`${ASK_BEFORE} *,? *${OPT_CIVILITY}${OPT_ARTICLE}${a}`, 'gu'),
    // « Julien, qu'en pensez-vous »
    new RegExp(`${a} *,? *${ASK_AFTER}`, 'gu'),
    // Salutation ou remerciement suivi du nom : « Merci Julien », « Bonjour Madame Bernard »
    new RegExp(`(?:^|[^\\p{L}])(?:bonjour|bonsoir|merci|salut|bravo|pardon|ecoutez|dites moi|dites nous) *,? *${OPT_CIVILITY}${OPT_ARTICLE}${a}`, 'gu')
  ]
  if (tier !== 'theme') {
    // Vocatif final : « …, Julien ? », « …, la DG. »
    list.push(new RegExp(`, *${OPT_CIVILITY}${OPT_ARTICLE}${a} *(?:[?!.…]|$)`, 'gu'))
  }
  if (tier === 'name') {
    // Vocatif incise : « Je pense, Julien, que… »
    list.push(new RegExp(`, *${a} *,`, 'gu'))
  }
  if (addressRegexCache.size > 2000) addressRegexCache.clear()
  addressRegexCache.set(key, list)
  return list
}

function firstAddressAt(normalizedText, alias) {
  const escaped = alias.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let first = Infinity
  for (const re of addressRegexes(escaped, alias.tier)) {
    re.lastIndex = 0
    const m = re.exec(normalizedText)
    if (m) {
      const at = m.index + m[0].indexOf(m[1])
      if (at < first) first = at
    }
  }
  return first
}

function firstMentionAt(normalizedText, alias) {
  const m = termRegex(alias.term, false).exec(normalizedText)
  return m ? m.index + m[1].length : Infinity
}

/**
 * Interpellations et mentions d'acteurs dans un message.
 * - addressed : acteurs interpellés directement — vocatif en tête de phrase (« Julien, … », « Bonjour Marie : »),
 *   vocatif final (« …, Julien ? »), « @alias », civilité (« Madame la DG »), « qu'en pense X », « je me tourne vers X »,
 *   « X, qu'en pensez-vous ? » ;
 * - mentioned : acteurs simplement cités (tout alias non thématique), interpellés compris.
 * Un alias thématique ({ term, addressOnly: true }) ne compte que dans une interpellation.
 * Chaque liste est triée par première occurrence.
 * @returns {{ addressed: Object[], mentioned: Object[], addressedIds: string[], mentionedIds: string[] }}
 */
function scanActors(text, actors, { addressAll }) {
  const normalizedText = normalizeText(text)
  if (!normalizedText || !Array.isArray(actors)) return []
  return actors.filter((actor) => actor && typeof actor === 'object').map((actor) => {
    let addressAt = Infinity
    let mentionAt = Infinity
    for (const alias of actorAliases(actor)) {
      // Interpellation : calculée pour tous les alias (findAddressedActors) ou seulement pour les alias thématiques
      if (addressAll || alias.tier === 'theme') addressAt = Math.min(addressAt, firstAddressAt(normalizedText, alias))
      if (alias.tier !== 'theme') mentionAt = Math.min(mentionAt, firstMentionAt(normalizedText, alias))
    }
    return { actor, addressAt, mentionAt: Math.min(mentionAt, addressAt) }
  })
}

export function findAddressedActors(text, actors = []) {
  const rows = scanActors(text, actors, { addressAll: true })
  const addressed = rows.filter((r) => r.addressAt !== Infinity).sort((a, b) => a.addressAt - b.addressAt).map((r) => r.actor)
  const mentioned = rows.filter((r) => r.mentionAt !== Infinity).sort((a, b) => a.mentionAt - b.mentionAt).map((r) => r.actor)
  return { addressed, mentioned, addressedIds: addressed.map((a) => a.id), mentionedIds: mentioned.map((a) => a.id) }
}

/**
 * Acteurs cités dans un message (alias du profil, prénom, nom ou identifiant), par ordre d'apparition.
 * Comportement historique conservé pour les alias texte ; un alias { term, addressOnly: true } ne compte
 * que s'il est employé en interpellation. Pour distinguer interpellation et simple mention : findAddressedActors.
 */
export function findMentionedActors(text, actors = []) {
  return scanActors(text, actors, { addressAll: false })
    .filter((r) => r.mentionAt !== Infinity)
    .sort((a, b) => a.mentionAt - b.mentionAt)
    .map((r) => r.actor)
}

const JARGON_LABELS = {
  low: 'faible : vulgarisation obligatoire, analogies métier',
  medium: 'moyenne : termes techniques acceptés s\'ils sont expliqués',
  high: 'élevée : attend de la précision technique'
}

// Liste tolérante : une chaîne seule devient une liste d'un élément
const asList = (items) => (Array.isArray(items) ? items : typeof items === 'string' ? [items] : [])

/**
 * Référence courte d'un texte réglementaire, pour un prompt compact : partie avant le premier « : », sans
 * parenthèses (« RGPD art. 33 (notification sous 72 h) : … » → « RGPD art. 33 »).
 */
export function shortRegulatoryRef(text) {
  const head = String(text || '').split(/\s:\s/)[0]
  return head.replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim()
}

/**
 * Bloc de description d'une partie prenante pour un prompt LLM (lignes vides omises).
 * Options (toutes facultatives) :
 * - includeAliases (true) : « - Interpellé par : … » (alias du profil) pour que le modèle reconnaisse l'acteur interpellé ;
 * - includeCriteria (true) : « - Juge une proposition selon : … » ;
 * - includeAdvises (true) : « - Donne un avis sur : … » ;
 * - regulatoryFocus ('full') : 'full' | 'short' (références courtes, voir shortRegulatoryRef) | 'none' ;
 * - regulatoryNote : texte ajouté après les références courtes (ex. « détails : CADRE RÉGLEMENTAIRE ») ;
 * - compact (false) : raccourci pour includeAliases/includeCriteria/includeAdvises false et regulatoryFocus 'short'
 *   (les options explicites restent prioritaires).
 */
export function describeStakeholderForPrompt(actor, options = {}) {
  if (!actor) return ''
  const compact = !!options.compact
  const pick = (key, dflt) => (typeof options[key] === 'boolean' || typeof options[key] === 'string' ? options[key] : dflt)
  const includeAliases = pick('includeAliases', !compact)
  const includeCriteria = pick('includeCriteria', !compact)
  const includeAdvises = pick('includeAdvises', !compact)
  const regulatoryMode = pick('regulatoryFocus', compact ? 'short' : 'full')
  const p = actor.profile || {}
  const rights = p.decisionRights || {}
  const list = (items) => asList(items).filter((item) => typeof item === 'string' && item.trim()).join(' ; ')
  const labels = (groups) => list(asList(groups).map((g) => g?.label))
  const aliases = includeAliases
    ? list(asList(p.aliases).map((a) => (typeof a === 'string' ? a : a && typeof a.term === 'string' ? a.term : null)))
    : ''
  let focus = ''
  if (regulatoryMode === 'short') {
    const refs = Array.from(new Set(asList(p.regulatoryFocus).filter((r) => typeof r === 'string').map(shortRegulatoryRef).filter(Boolean)))
    focus = refs.length ? `${refs.join(' ; ')}${options.regulatoryNote ? ` (${options.regulatoryNote})` : ''}` : ''
  } else if (regulatoryMode !== 'none') focus = list(p.regulatoryFocus)
  const lines = [
    `### ${actor.name || actor.id || 'Interlocuteur'}${actor.role ? ` (${actor.role})` : ''}${actor.id ? ` [id: ${actor.id}]` : ''}`,
    actor.organization && `- Organisation : ${actor.organization}`,
    aliases && `- Interpellé par : ${aliases}`,
    p.mandate && `- Mandat : ${p.mandate}`,
    list(rights.decides) && `- Décide : ${list(rights.decides)}`,
    list(rights.vetoes) && `- Peut bloquer : ${list(rights.vetoes)}`,
    includeAdvises && list(rights.advises) && `- Donne un avis sur : ${list(rights.advises)}`,
    list(p.stakes) && `- Enjeux personnels : ${list(p.stakes)}`,
    includeCriteria && list(p.evaluationCriteria) && `- Juge une proposition selon : ${list(p.evaluationCriteria)}`,
    labels(p.expectations) && `- Attend dans une réponse : ${labels(p.expectations)}`,
    labels(p.redLines) && `- Lignes rouges : ${labels(p.redLines)}`,
    focus && `- Cadre surveillé : ${focus}`,
    p.jargonTolerance && `- Tolérance au jargon : ${JARGON_LABELS[p.jargonTolerance] || p.jargonTolerance}`,
    p.communicationStyle && `- Style : ${p.communicationStyle}`
  ]
  return lines.filter(Boolean).join('\n')
}

const labelOfGroup = (g) => (g && typeof g.label === 'string' && g.label.trim() ? g.label : null)

/**
 * Lignes rouges d'un acteur évaluées phrase par phrase : franchies (proposition, même au conditionnel, à l'impératif,
 * à l'infinitif ou en question orientée) ou testées (vraie question exploratoire, voir redLineModality). Une mise en
 * garde (« si on coupait le SCADA, on perdrait la production ») ne franchit rien. conditionalAsProbe: true rétablit
 * l'ancienne règle (toute phrase au conditionnel ou hypothétique est seulement testée).
 */
function redLinesBySentence(sentences, actor, { negatable, hypotheticalAsQuestion, conjugate, conditionalAsProbe = false }) {
  const groups = asList(actor?.profile?.redLines).filter((g) => g && typeof g === 'object')
  const crossed = new Set()
  const probed = new Set()
  const redSentences = new Set()
  const triggers = {}
  sentences.forEach((s, i) => {
    const res = matchTermGroups(s.text, groups, { negatable, conjugate })
    if (!res.metGroups.length) return
    if (isWarningSentence(s.text)) return
    const exploratory = hypotheticalAsQuestion && (conditionalAsProbe
      ? isHypotheticalSentence(s.text)
      : redLineModality(s.text, { following: sentences.slice(i + 1) }) === 'probed')
    for (const g of res.metGroups) {
      ;(exploratory ? probed : crossed).add(g)
      const label = labelOfGroup(g)
      if (label) (triggers[label] ||= []).push(...(res.triggers[label] || []))
    }
    if (!exploratory) redSentences.add(i)
  })
  for (const g of crossed) probed.delete(g)
  for (const label of Object.keys(triggers)) triggers[label] = Array.from(new Set(triggers[label]))
  return { groups, crossed, probed, redSentences, triggers }
}

function finishAssessment(text, sentences, actor, red, excluded, { expectationsInQuestions = true } = {}) {
  const p = actor?.profile || {}
  const keep = sentences.filter((s, i) => !excluded.has(i) && (expectationsInQuestions || !/\?[»"”'’)\]]*$/.test(s.text)))
  const expText = keep.length === sentences.length && sentences.length ? text : keep.map((s) => s.text).join('\n')
  const expectations = matchTermGroups(expText, p.expectations, { negatable: true })
  const crossedGroups = red.groups.filter((g) => red.crossed.has(g))
  const probedGroups = red.groups.filter((g) => red.probed.has(g))
  return {
    expectationsMet: expectations.met,
    expectationsMissed: expectations.missed,
    redLinesCrossed: crossedGroups.map(labelOfGroup).filter(Boolean),
    redLinesProbed: probedGroups.map(labelOfGroup).filter(Boolean),
    // Groupes complets (avec leur éventuel impact) pour les moteurs applicatifs
    expectationGroups: expectations.metGroups,
    redLineGroups: crossedGroups,
    redLineProbedGroups: probedGroups,
    totalScore: expectations.metGroups.length - 3 * crossedGroups.length,
    hasRedLine: crossedGroups.length > 0,
    // Déclencheur de chaque ligne rouge : 'terms', 'all', clé de motif ('concealment', 'lateNotification'…)
    redLineTriggers: red.triggers
  }
}

/**
 * Confronte un texte au profil : attentes satisfaites, lignes rouges franchies.
 * Sert au moteur local (War Room, coach) quand Gemini n'est pas disponible.
 * - Attentes et lignes rouges ignorent les occurrences niées (« nous ne couperons pas le courant ») ;
 *   negatable: false sur un groupe, ou options.redLinesNegatable: false, force la détection de toute occurrence.
 * - Lignes rouges : termes, cooccurrences (all) et motifs (patterns : dissimulation, notification retardée,
 *   contournement d'homologation…), évalués phrase par phrase ; formes conjuguées reconnues pour les termes
 *   « verbe + complément » (conjugateRedLines, true par défaut : « et si on coupait le SCADA ? »).
 * - hypotheticalAsQuestion: true (conseillé en dialogue) range dans redLinesProbed les lignes rouges évoquées seulement
 *   dans une VRAIE question exploratoire (« Et si on… ? », « Que se passerait-il si… ? », « Peut-on… ? ») : jamais de gain,
 *   une question de défi. Toute PROPOSITION, même au conditionnel (« on pourrait… »), à l'impératif (« évitons de… »),
 *   à l'infinitif (« inutile d'en parler »), euphémisée ou en question orientée (« pourquoi ne pas… ? », « …, d'accord ? »),
 *   franchit la ligne rouge (redLinesCrossed). conditionalAsProbe: true rétablit l'ancienne règle (conditionnel = testé).
 * - familles génériques (redLines[].families, voir services/redLines.js) évaluées comme des motifs.
 * - neutralizeRedLineSentences (true) : une attente évoquée dans une phrase qui franchit une ligne rouge ne compte pas
 *   (« on déploie lundi sans rien dire à l'ARS » ne vaut pas « date de déploiement ») ;
 * - expectationsInQuestions (true) : false ignore les attentes citées seulement dans une question ;
 * - attentes : cooccurrence (all) et preuves exigées (requires : montant, durée, date…) prises en compte.
 * totalScore (attentes satisfaites − 3 × lignes rouges franchies) et hasRedLine sont fournis pour les moteurs applicatifs.
 */
export function assessAgainstStakeholder(text, actor, options = {}) {
  const raw = typeof text === 'string' ? text : ''
  const sentences = splitSentences(raw)
  const red = redLinesBySentence(sentences, actor, {
    negatable: options.redLinesNegatable !== false,
    hypotheticalAsQuestion: !!options.hypotheticalAsQuestion,
    conjugate: options.conjugateRedLines !== false,
    conditionalAsProbe: !!options.conditionalAsProbe
  })
  const excluded = options.neutralizeRedLineSentences === false ? new Set() : red.redSentences
  return finishAssessment(raw, sentences, actor, red, excluded, options)
}

/**
 * Évaluation de tous les acteurs : une phrase qui franchit la ligne rouge de l'un d'eux ne crédite aucune
 * attente, pour personne (« on déploie lundi sans rien dire à l'ARS » ne vaut pas « effet sur le lancement »).
 * Options : celles d'assessAgainstStakeholder. Renvoie { [actorId]: évaluation }.
 */
export function assessAll(text, actors = [], options = {}) {
  const raw = typeof text === 'string' ? text : ''
  const list = asList(actors).filter((a) => a && typeof a.id === 'string' && a.id)
  const sentences = splitSentences(raw)
  const redOptions = { negatable: options.redLinesNegatable !== false, hypotheticalAsQuestion: !!options.hypotheticalAsQuestion, conjugate: options.conjugateRedLines !== false, conditionalAsProbe: !!options.conditionalAsProbe }
  const reds = Object.fromEntries(list.map((a) => [a.id, redLinesBySentence(sentences, a, redOptions)]))
  const excluded = new Set()
  if (options.neutralizeRedLineSentences !== false) Object.values(reds).forEach((r) => r.redSentences.forEach((i) => excluded.add(i)))
  return Object.fromEntries(list.map((a) => [a.id, finishAssessment(raw, sentences, a, reds[a.id], excluded, options)]))
}

/**
 * Acteur vu dans un scénario : son profil reçoit l'angle propre au scénario, lu dans
 * scenario[anglesKey][actor.id] (anglesKey 'actorAngles' par défaut, 'angles' accepté) :
 * { concern, keyAngle, expectations, redLines, questions, answers, aliases, replaceExpectations?, replaceRedLines? }.
 * - concern → en tête de stakes ; keyAngle → critère d'évaluation « Angle attendu sur ce scénario : … » ;
 * - expectations : remplacent les attentes génériques (replaceExpectations: false pour les ajouter) ;
 * - redLines : ajoutées en tête des lignes rouges permanentes (replaceRedLines: true pour les remplacer) ;
 * - questions / answers / aliases : ajoutés au profil (profile.questions, profile.answers, profile.aliases).
 * L'angle complet reste disponible sous actor.scenarioAngle. Sans angle, l'acteur est renvoyé tel quel.
 */
export function mergeStakeholderForScenario(actor, scenario, { anglesKey = 'actorAngles', angleLabel = 'Angle attendu sur ce scénario' } = {}) {
  if (!actor || typeof actor !== 'object' || Array.isArray(actor)) return actor
  const angles = scenario?.[anglesKey] || scenario?.actorAngles || scenario?.angles
  const angle = angles && typeof angles === 'object' ? angles[actor.id] : null
  if (!angle || typeof angle !== 'object') return actor
  const profile = actor.profile || {}
  const nonEmpty = (v) => typeof v === 'string' && v.trim()
  const exp = asList(angle.expectations).filter((g) => g && typeof g === 'object')
  const reds = asList(angle.redLines).filter((g) => g && typeof g === 'object')
  const merged = {
    ...profile,
    stakes: [angle.concern, ...asList(profile.stakes)].filter(nonEmpty),
    evaluationCriteria: [...asList(profile.evaluationCriteria), nonEmpty(angle.keyAngle) ? `${angleLabel} : ${angle.keyAngle}` : null].filter(nonEmpty),
    expectations: exp.length ? (angle.replaceExpectations === false ? [...asList(profile.expectations), ...exp] : exp) : profile.expectations,
    redLines: [...reds, ...(angle.replaceRedLines ? [] : asList(profile.redLines))]
  }
  if (asList(angle.questions).length) merged.questions = [...asList(profile.questions), ...asList(angle.questions)]
  if (asList(angle.answers).length) merged.answers = [...asList(profile.answers), ...asList(angle.answers)]
  if (asList(angle.aliases).length) merged.aliases = [...asList(profile.aliases), ...asList(angle.aliases)]
  return { ...actor, scenarioAngle: angle, profile: merged }
}
