// Profils de parties prenantes partagés par la War Room, le coach Tech-to-Board et les prompts Gemini.
// Les données vivent dans les applications (data/actors.js, data/coachCases.js) : ce module ne fait
// que les lire. Toutes les propriétés sont optionnelles, un profil incomplet dégrade sans casser.

/**
 * @typedef {Object} TermGroup
 * @property {string} label    Libellé lisible (feedback, prompt)
 * @property {string[]} terms  Radicaux détectés en début de mot (« chiffr » → chiffrage, chiffré…)
 * @property {Object} [impact] Effet propre à l'application (ex. variation des jauges si la ligne rouge est franchie)
 */

/**
 * @typedef {Object} StakeholderProfile
 * @property {string[]} [aliases]            Façons de l'interpeller (prénom, nom, sigle du rôle)
 * @property {string} [mandate]              Responsabilité réelle dans l'organisation
 * @property {{ decides?: string[], vetoes?: string[], advises?: string[] }} [decisionRights]
 * @property {string[]} [stakes]             Ce qui compte pour lui (budget, planning, patients…)
 * @property {string[]} [evaluationCriteria] Grille avec laquelle il juge une proposition
 * @property {TermGroup[]} [expectations]    Éléments qu'une bonne réponse doit lui apporter
 * @property {TermGroup[]} [redLines]        Propositions qu'il refuse
 * @property {'low'|'medium'|'high'} [jargonTolerance]
 * @property {string[]} [regulatoryFocus]    Textes et obligations qu'il surveille
 * @property {string} [communicationStyle]
 */

// Unités collées à un nombre (« 150k€ », « 30 % », « 72h ») : un chiffre précédent vaut limite de mot
const UNIT_TERM = /^(k€|m€|€|%|h|j|k|m)$/i

// Négation dans la proposition qui précède le terme (« sans FARR », « pas de coupure », « ne notifions pas la CNIL »)
const NEGATION_BEFORE = /(^|[^\p{L}])(sans|pas|ni|aucune?|jamais|éviter|évitons|évitez|refuse|refusons|refuser|plutôt que|au lieu)(?=[^\p{L}]|$)[^.;!?]{0,25}$/u
// Verbe nié directement (« ne notifions pas », « n'appliquez pas »)
const NEGATED_VERB = /(^|[^\p{L}])(ne\s+|n['’]\s*)$/u

function termRegex(term, prefix) {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const start = UNIT_TERM.test(term) ? '(^|[^\\p{L}])' : '(^|[^\\p{L}\\p{N}])'
  const end = prefix ? '' : '(?=$|[^\\p{L}\\p{N}])'
  return new RegExp(`${start}${escaped}${end}`, 'gu')
}

/**
 * Présence d'un terme en début de mot (insensible à la casse) : évite les faux positifs par
 * sous-chaîne (« acl » dans « miracle », « red » dans « credential »).
 * prefix: true accepte les flexions (« bloqué » → « bloquée », « investir » → « investirons »).
 * affirmedOnly: true ignore les occurrences niées (« sans FARR », « pas de coupure »).
 */
export function containsTerm(text, term, { prefix = false, affirmedOnly = false } = {}) {
  if (!text || !term) return false
  const lower = text.toLowerCase()
  const re = termRegex(term, prefix)
  let match
  while ((match = re.exec(lower)) !== null) {
    if (!affirmedOnly) return true
    const head = lower.slice(Math.max(0, match.index - 30), match.index + match[1].length)
    if (!NEGATION_BEFORE.test(head) && !NEGATED_VERB.test(head)) return true
  }
  return false
}

/**
 * Groupes de termes présents / absents dans un texte. Les occurrences niées ne comptent pas :
 * « sans FARR » ne satisfait pas l'attente « FARR », « pas de coupure » ne franchit pas la ligne rouge.
 * Écrire la négation dans le terme lui-même quand elle est fautive (« ne pas notifier »).
 */
export function matchTermGroups(text, groups = []) {
  const met = []
  const missed = []
  const metGroups = []
  for (const group of groups || []) {
    const hit = (group.terms || []).some((term) => containsTerm(text, term, { prefix: true, affirmedOnly: true }))
    ;(hit ? met : missed).push(group.label)
    if (hit) metGroups.push(group)
  }
  return { met, missed, metGroups }
}

/** Acteurs interpellés dans un message (alias du profil, prénom, nom ou identifiant), par ordre d'apparition. */
export function findMentionedActors(text, actors = []) {
  const lower = (text || '').toLowerCase()
  const positions = actors.map((actor) => {
    const names = (actor.name || '').split(/\s+/).filter((part) => part.length > 2 && !part.endsWith('.'))
    const aliases = [...(actor.profile?.aliases || []), ...names, actor.id]
    let first = Infinity
    for (const alias of aliases) {
      const match = termRegex(alias, false).exec(lower)
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
  const list = (items) => (items || []).join(' ; ')
  const lines = [
    `### ${actor.name}${actor.role ? ` (${actor.role})` : ''} [id: ${actor.id}]`,
    actor.organization && `- Organisation : ${actor.organization}`,
    p.mandate && `- Mandat : ${p.mandate}`,
    rights.decides?.length && `- Décide : ${list(rights.decides)}`,
    rights.vetoes?.length && `- Peut bloquer : ${list(rights.vetoes)}`,
    rights.advises?.length && `- Donne un avis sur : ${list(rights.advises)}`,
    p.stakes?.length && `- Enjeux personnels : ${list(p.stakes)}`,
    p.evaluationCriteria?.length && `- Juge une proposition selon : ${list(p.evaluationCriteria)}`,
    p.expectations?.length && `- Attend dans une réponse : ${list(p.expectations.map((e) => e.label))}`,
    p.redLines?.length && `- Lignes rouges : ${list(p.redLines.map((r) => r.label))}`,
    p.regulatoryFocus?.length && `- Cadre surveillé : ${list(p.regulatoryFocus)}`,
    p.jargonTolerance && `- Tolérance au jargon : ${JARGON_LABELS[p.jargonTolerance] || p.jargonTolerance}`,
    p.communicationStyle && `- Style : ${p.communicationStyle}`
  ]
  return lines.filter(Boolean).join('\n')
}

/**
 * Confronte un texte au profil : attentes satisfaites, lignes rouges franchies.
 * Sert au moteur local (War Room, coach) quand Gemini n'est pas disponible.
 */
export function assessAgainstStakeholder(text, actor) {
  const p = actor?.profile || {}
  const expectations = matchTermGroups(text, p.expectations)
  const redLines = matchTermGroups(text, p.redLines)
  return {
    expectationsMet: expectations.met,
    expectationsMissed: expectations.missed,
    redLinesCrossed: redLines.met,
    // Groupes complets (avec leur éventuel impact) pour les moteurs applicatifs
    expectationGroups: expectations.metGroups,
    redLineGroups: redLines.metGroups
  }
}
