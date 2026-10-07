// Garde-fous de notation partagés par les moteurs locaux et WarRoomEngine. Module pur, sans Vue.
//   - porte des lignes rouges : dès qu'une ligne rouge est franchie OU testée, aucune variation positive ce tour ;
//   - dégressivité : un énoncé déjà crédité (mêmes racines) ne rapporte plus ; un engagement répété sans élément
//     nouveau vaut 0.

import { normalize } from './text.js'
import { detectRedLines } from './redLines.js'
import { assessAll } from './stakeholderProfile.js'
import { meaningfulStems } from './conversation.js'

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const asArray = (v) => (Array.isArray(v) ? v : [])

// ---------------------------------------------------------------------------------------------
// Porte des lignes rouges
// ---------------------------------------------------------------------------------------------

/**
 * État de ligne rouge d'un tour, quelle que soit la source :
 * booléen (franchie), résultat de detectRedLines, évaluation d'un acteur (assessAgainstStakeholder),
 * table d'évaluations { actorId: évaluation } (assessAll), liste de ces formes, ou { crossed, probed }.
 * @returns {{ crossed: boolean, probed: boolean, labels: string[], families: string[] }}
 */
export function redLineGateState(input) {
  const out = { crossed: false, probed: false, labels: [], families: [] }
  const visit = (x) => {
    if (x === true) { out.crossed = true; return }
    if (!x || typeof x !== 'object') return
    if (Array.isArray(x)) { x.forEach(visit); return }
    if ('hasCrossed' in x || 'hasProbed' in x) {
      if (x.hasCrossed) out.crossed = true
      if (x.hasProbed) out.probed = true
      for (const r of [...asArray(x.crossed), ...asArray(x.probed)]) {
        if (r?.family && !out.families.includes(r.family)) out.families.push(r.family)
        if (r?.label && !out.labels.includes(r.label)) out.labels.push(r.label)
      }
      return
    }
    if ('redLinesCrossed' in x || 'redLinesProbed' in x) {
      if (asArray(x.redLinesCrossed).length) out.crossed = true
      if (asArray(x.redLinesProbed).length) out.probed = true
      for (const l of [...asArray(x.redLinesCrossed), ...asArray(x.redLinesProbed)]) if (!out.labels.includes(l)) out.labels.push(l)
      return
    }
    if (typeof x.crossed === 'boolean' || typeof x.probed === 'boolean') {
      if (x.crossed) out.crossed = true
      if (x.probed) out.probed = true
      return
    }
    Object.values(x).forEach(visit)
  }
  visit(input)
  return out
}

/**
 * Variations de jauges sous la porte des lignes rouges : si une ligne rouge est franchie ou testée (gate, voir
 * redLineGateState), toute variation positive passe à 0 ; les variations négatives sont gardées.
 * penalty ({ jauge: plafond négatif }) : en cas de ligne rouge FRANCHIE, chaque jauge citée est ramenée au plus à
 * ce plafond (« au moins -3 en confiance »). Renvoie un nouvel objet.
 */
export function gateDeltas(deltas, gate, { penalty = null } = {}) {
  const src = isPlainObject(deltas) ? deltas : {}
  const state = redLineGateState(gate)
  const out = { ...src }
  if (!state.crossed && !state.probed) return out
  for (const [k, v] of Object.entries(out)) if (typeof v === 'number' && v > 0) out[k] = 0
  if (state.crossed && isPlainObject(penalty)) {
    for (const [k, cap] of Object.entries(penalty)) {
      if (typeof cap === 'number' && cap < 0 && k in out) out[k] = Math.min(typeof out[k] === 'number' ? out[k] : 0, cap)
    }
  }
  return out
}

// Plafonds négatifs portés par les lignes rouges franchies (TermGroup.impact = { jauge: nombre négatif })
function impactPenalty(assessments) {
  const penalty = {}
  for (const a of Object.values(isPlainObject(assessments) ? assessments : {})) {
    for (const g of asArray(a?.redLineGroups)) {
      if (!isPlainObject(g?.impact)) continue
      for (const [k, v] of Object.entries(g.impact)) if (typeof v === 'number' && v < 0) penalty[k] = Math.min(penalty[k] ?? 0, v)
    }
  }
  return Object.keys(penalty).length ? penalty : null
}

/**
 * Applique la porte des lignes rouges à un tour canonique ou historique (metricsImpact ou metricsDelta), en place.
 * Source : redLines (detectRedLines) et assessments (assessAll) fournis, sinon calculés sur userMessage et actors.
 * Les lignes rouges franchies dont le groupe porte un impact { jauge: négatif } imposent ce plafond (penalty: false
 * pour l'ignorer, ou un objet pour l'imposer). Renvoie { gated, crossed, probed, zeroed, labels, families } et le
 * note dans turn._redLineGate quand quelque chose a été modifié ou détecté.
 */
export function applyRedLineGate(turn, { userMessage = '', actors = [], assessments = null, redLines = null, penalty = undefined, impactKey = null, assessment = undefined } = {}) {
  const info = { gated: false, crossed: false, probed: false, zeroed: [], labels: [], families: [], source: 'rules' }
  if (!isPlainObject(turn)) return info
  const key = impactKey || (isPlainObject(turn.metricsImpact) ? 'metricsImpact' : isPlainObject(turn.metricsDelta) ? 'metricsDelta' : 'metricsImpact')
  const deltas = isPlainObject(turn[key]) ? turn[key] : {}
  // Verdict du modèle (assessment, voir normalizeAssessment) : il remplace les règles lexicales. assessment: undefined →
  // verdict porté par le tour (turn.assessment) s'il existe ; null ou false → règles seulement.
  const verdict = assessment === undefined ? (isPlainObject(turn.assessment) && Array.isArray(turn.assessment.redLines) ? turn.assessment : null) : (isPlainObject(assessment) ? assessment : null)
  let red
  let evals
  if (verdict) {
    info.source = 'model'
    red = { crossed: [], probed: [], hasCrossed: false, hasProbed: false }
    for (const r of verdict.redLines) {
      if (!isPlainObject(r) || !r.family) continue
      if (r.mode === 'crossed') { red.crossed.push({ family: r.family, label: r.label }); red.hasCrossed = true }
      else if (r.mode === 'probed') { red.probed.push({ family: r.family, label: r.label }); red.hasProbed = true }
    }
    const byActor = {}
    for (const r of verdict.redLines) {
      if (!isPlainObject(r) || r.mode === 'rejected' || !r.actorId) continue
      const slot = byActor[r.actorId] || (byActor[r.actorId] = { expectationsMet: [], expectationsMissed: [], redLinesCrossed: [], redLinesProbed: [] })
      const list = r.mode === 'crossed' ? slot.redLinesCrossed : slot.redLinesProbed
      if (!list.includes(r.label)) list.push(r.label)
    }
    // Les groupes du profil portent les plafonds d'impact : on les retrouve par libellé
    evals = {}
    for (const [actorId, slot] of Object.entries(byActor)) {
      const actor = asArray(actors).find((a) => isPlainObject(a) && a.id === actorId)
      const groups = asArray(actor?.profile?.redLines).filter((g) => isPlainObject(g))
      evals[actorId] = { ...slot, redLineGroups: groups.filter((g) => slot.redLinesCrossed.includes(g.label)) }
    }
  } else {
    red = redLines || detectRedLines(typeof userMessage === 'string' ? userMessage : '')
    evals = assessments || (asArray(actors).length ? assessAll(userMessage, actors, { hypotheticalAsQuestion: true }) : {})
  }
  const state = redLineGateState([red, evals])
  Object.assign(info, { crossed: state.crossed, probed: state.probed, labels: state.labels, families: state.families })
  if (!state.crossed && !state.probed) return info
  const cap = penalty === false ? null : isPlainObject(penalty) ? penalty : impactPenalty(evals)
  const next = gateDeltas(deltas, state, { penalty: cap })
  for (const [k, v] of Object.entries(next)) if (deltas[k] !== v) info.zeroed.push(k)
  info.gated = info.zeroed.length > 0
  turn[key] = next
  turn._redLineGate = { crossed: state.crossed, probed: state.probed, labels: state.labels, families: state.families, zeroed: info.zeroed, source: info.source }
  return info
}

// ---------------------------------------------------------------------------------------------
// Dégressivité : un énoncé déjà crédité ne rapporte plus
// ---------------------------------------------------------------------------------------------

// Racines et valeurs d'un énoncé : racines porteuses (meaningfulStems) et nombres avec unité (« 72h », « 40k€ »)
function statementTokens(text) {
  const tokens = new Set(meaningfulStems(text))
  for (const v of normalize(text).match(/\d+(?:[.,]\d+)?\s?(?:k€|m€|€|%|h|j|min|jours?|semaines?|mois)?/gu) || []) tokens.add(`=${v.replace(/\s+/g, '')}`)
  return tokens
}

/** Clé d'un énoncé : ses racines porteuses et valeurs, triées (deux formulations des mêmes éléments ont la même clé). */
export function statementKey(text) {
  return [...statementTokens(text)].sort().join(' ')
}

/**
 * Registre des énoncés crédités d'une séance (à créer au début d'une partie, reset() au changement de scénario).
 * Options : novelty (0.25) part minimale d'éléments nouveaux pour un crédit plein ; partialFactor (0.5) facteur appliqué
 * en deçà ; repeatFactor (0) facteur d'un énoncé sans élément nouveau.
 * - assess(text) → { factor, novel: string[], repeated: boolean, key } sans rien enregistrer ;
 * - record(text) enregistre l'énoncé comme crédité ; has(text) ; reset() ; size.
 */
export function createCreditLedger({ novelty = 0.25, partialFactor = 0.5, repeatFactor = 0 } = {}) {
  const keys = new Set()
  const seen = new Set()
  const api = {
    assess(text) {
      const tokens = statementTokens(text)
      const key = [...tokens].sort().join(' ')
      if (!tokens.size) return { factor: 1, novel: [], repeated: false, key }
      const novel = [...tokens].filter((t) => !seen.has(t))
      if (keys.has(key) || !novel.length) return { factor: repeatFactor, novel, repeated: true, key }
      const factor = novel.length / tokens.size < novelty ? partialFactor : 1
      return { factor, novel, repeated: false, key }
    },
    record(text) {
      const tokens = statementTokens(text)
      if (!tokens.size) return
      keys.add([...tokens].sort().join(' '))
      tokens.forEach((t) => seen.add(t))
    },
    has: (text) => keys.has(statementKey(text)),
    reset() { keys.clear(); seen.clear() },
    get size() { return keys.size }
  }
  return api
}

/**
 * Dégressivité d'un énoncé dans la séance : { factor, novel, repeated, key } (voir createCreditLedger).
 * factor 1 : énoncé nouveau ; partialFactor : peu d'éléments nouveaux ; repeatFactor (0) : déjà crédité.
 * Sans registre : { factor: 1 }.
 */
export function diminishingReturns(sessionLedger, statement) {
  if (!sessionLedger || typeof sessionLedger.assess !== 'function') return { factor: 1, novel: [], repeated: false, key: statementKey(statement) }
  return sessionLedger.assess(statement)
}

/** Variations positives multipliées par factor (arrondi vers zéro) ; les négatives sont gardées. Nouvel objet. */
export function applyDiminishingReturns(deltas, factor) {
  const src = isPlainObject(deltas) ? deltas : {}
  const f = typeof factor === 'number' && factor >= 0 ? Math.min(1, factor) : 1
  const out = {}
  for (const [k, v] of Object.entries(src)) out[k] = typeof v === 'number' && v > 0 ? Math.trunc(v * f) : v
  return out
}
