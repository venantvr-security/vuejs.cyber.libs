// Normalisation et découpage en phrases : base commune de stakeholderProfile.js, redLines.js et conversation.js.
// Module pur, sans dépendance.

/**
 * Forme canonique pour la comparaison : minuscules, sans diacritiques (le € est conservé),
 * apostrophes typographiques → ', espaces insécables → espace, traits d'union → espace,
 * espaces répétées réduites (les retours à la ligne sont conservés : ils séparent les propositions),
 * unités recollées au nombre (« 72 h » → « 72h », « 150 k€ » → « 150k€ », « 30 % » → « 30% »),
 * articles de loi uniformisés (« art.33 », « art. 33 » → « art 33 »), ligatures dépliées (« œ » → « oe », « æ » → « ae »).
 */
export function normalize(s) {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/[\u2019\u2018\u02bc\u00b4`]/g, "'")
    .replace(/[\u00a0\u202f\u2007\u2000-\u200a\u205f\u3000\t\f\v]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-\u2010\u2011]/g, ' ')
    .replace(/(\d) +(k€|m€|€|%|h|j)(?![\p{L}\p{N}'])/gu, '$1$2')
    .replace(/(^|[^\p{L}\p{N}])art\.? *(\d)/gu, '$1art $2')
    .replace(/ {2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

// Abréviations courantes : leur point ne termine pas la phrase (« M. Durand », « art. 33 », « cf. »)
const ABBREVIATIONS = new Set(['mm', 'mme', 'mmes', 'mlle', 'mlles', 'dr', 'pr', 'me', 'st', 'ste', 'art', 'cf', 'ex', 'pp', 'vol',
  'n°', 'no', 'vs', 'env', 'av', 'apr', 'ref', 'réf', 'al', 'chap', 'fig', 'ed', 'éd', 'tel', 'tél', 'resp'])

function isAbbreviation(word) {
  const raw = String(word || '').replace(/^[«"“(\[]+/, '').replace(/^\p{L}['’]/u, '')
  if (!raw) return false
  // Initiale ou « M. » en majuscule (« J. Martin », « M. Durand ») ; une unité en minuscule (« 72 h. ») termine la phrase
  if (/^\p{Lu}$/u.test(raw)) return true
  return ABBREVIATIONS.has(raw.toLowerCase())
}

/**
 * Phrases d'un texte, avec leurs positions dans le texte d'origine : [{ text, start, end }].
 * Fin de phrase : . ! ? … (suivis éventuellement de guillemets ou parenthèses fermants) puis espace
 * ou fin du texte, ou retour à la ligne. Les décimales (« 1.5 », « 2,8 M€ »), les URL et les
 * abréviations (« M. », « art. 33 ») ne coupent pas.
 */
export function splitSentences(text) {
  const s = typeof text === 'string' ? text : text === null || text === undefined ? '' : String(text)
  const out = []
  const push = (from, to) => {
    const raw = s.slice(from, to)
    const lead = raw.length - raw.trimStart().length
    const trimmed = raw.trim()
    if (trimmed) out.push({ text: trimmed, start: from + lead, end: from + lead + trimmed.length })
  }
  const re = /[.!?…]+[»"”'’)\]]*(?=\s|$)|\n+/g
  let start = 0
  let m
  while ((m = re.exec(s)) !== null) {
    const end = m.index + m[0].length
    if (m[0][0] !== '\n') {
      const lastWord = (s.slice(start, m.index).match(/(\S+)$/) || [])[1] || ''
      if (m[0] === '.' && isAbbreviation(lastWord)) continue
      // Point d'interrogation final d'une URL (« https://x.fr/? ») : pas une question
      if (/^(https?:\/\/|www\.)/i.test(lastWord) && m[0] === '?') continue
    }
    push(start, end)
    start = end
  }
  push(start, s.length)
  return out
}
