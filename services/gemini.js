// Accès HTTP à l'API Gemini, lecture robuste du JSON renvoyé par le modèle, réglages persistés.
// Module pur : ni Vue ni DOM (localStorage est utilisé seulement s'il existe).

import { jsonrepair } from 'jsonrepair'

// La famille gemini-1.5 est retirée : chaque appel échouait et basculait sur le moteur local
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
export const FALLBACK_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
export const GEMINI_REQUEST_TIMEOUT_MS = 20000

export const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

export function cleanApiKey(apiKey) {
  return typeof apiKey === 'string' ? apiKey.trim() : ''
}

export function cleanModelName(model) {
  return typeof model === 'string' ? model.trim().replace(/^models\//, '') : ''
}

/** Modèle préféré puis modèles de repli, sans doublon ni préfixe « models/ ». */
export function modelsToTry(preferred, candidates) {
  const list = [preferred, ...(Array.isArray(candidates) ? candidates : FALLBACK_GEMINI_MODELS)]
  return Array.from(new Set(list.map(cleanModelName).filter(Boolean)))
}

/** Le modèle accepte-t-il thinkingConfig (familles 2.5 et suivantes) ? */
export function supportsThinking(model) {
  return /gemini-(2\.5|[3-9])/.test(cleanModelName(model))
}

// Signal d'expiration (AbortSignal.timeout si disponible, sinon AbortController + minuterie),
// combiné au signal d'annulation de l'appelant
function requestSignal(ms, external) {
  let timeout
  if (ms > 0) {
    try {
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') timeout = AbortSignal.timeout(ms)
    } catch (e) { /* environnement sans AbortSignal.timeout */ }
    if (!timeout && typeof AbortController === 'function') {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), ms)
      if (timer && typeof timer.unref === 'function') timer.unref()
      timeout = controller.signal
    }
  }
  if (!external) return timeout
  if (!timeout) return external
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') return AbortSignal.any([timeout, external])
  if (typeof AbortController !== 'function') return external
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (timeout.aborted || external.aborted) controller.abort()
  timeout.addEventListener?.('abort', abort, { once: true })
  external.addEventListener?.('abort', abort, { once: true })
  return controller.signal
}

/** Appel Gemini : clé transmise en en-tête (jamais dans l'URL), délai maximal borné, annulation possible. */
export function geminiFetch(path, apiKey, { body, timeoutMs = GEMINI_REQUEST_TIMEOUT_MS, signal } = {}) {
  const headers = { 'x-goog-api-key': apiKey }
  const init = { method: body ? 'POST' : 'GET', headers }
  if (body) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const combined = requestSignal(timeoutMs, signal)
  if (combined) init.signal = combined
  return fetch(`${GEMINI_API_BASE}/${path}`, init)
}

/** Erreur HTTP lisible : message de l'API, statut, modèle, raison (API_KEY_INVALID…). */
export async function httpError(response, model) {
  const errObj = await response.json().catch(() => ({}))
  const err = new Error(errObj?.error?.message || `HTTP ${response.status}${model ? ` sur modèle ${model}` : ''}`)
  err.status = response.status
  if (model) err.model = model
  const details = Array.isArray(errObj?.error?.details) ? errObj.error.details : []
  const reason = details.map((d) => d?.reason).find((r) => typeof r === 'string') || errObj?.error?.status || null
  if (reason) err.reason = reason
  return err
}

/**
 * Erreur après laquelle il est inutile d'essayer un autre modèle : clé refusée (401/403)
 * ou 400 dont la raison est API_KEY_INVALID. Les autres 400 (modèle qui refuse le mode JSON,
 * thinkingConfig non supporté…) laissent le repli continuer.
 */
export function isFatalGeminiError(err) {
  if (!err) return false
  if (err.status === 401 || err.status === 403) return true
  if (err.status === 400) {
    return err.reason === 'API_KEY_INVALID' || /api[ _]?key (not valid|invalid)|API_KEY_INVALID/i.test(err.message || '')
  }
  return false
}

/** Texte de la première réponse (parties « thought » exclues), finishReason, ou erreur si vide. */
export function candidateText(data, model) {
  const candidate = data?.candidates?.[0]
  const parts = candidate?.content?.parts
  const text = Array.isArray(parts) ? parts.map((p) => (typeof p?.text === 'string' && !p.thought ? p.text : '')).join('') : ''
  const finishReason = candidate?.finishReason || data?.promptFeedback?.blockReason || null
  if (text.trim()) return { text, finishReason }
  const err = new Error(`Réponse Gemini vide${finishReason ? ` (finishReason : ${finishReason})` : ''} sur modèle ${model}`)
  err.finishReason = finishReason
  err.model = model
  return { error: err, finishReason }
}

/** Erreur d'annulation volontaire (signal de l'appelant). */
export function isAbortError(err) {
  return err?.name === 'AbortError' && !(err?.message || '').includes('timeout')
}

// ---------------------------------------------------------------------------------------------
// Lecture du JSON renvoyé par le modèle
// ---------------------------------------------------------------------------------------------

/** Structure JSON équilibrée commençant à `start` ({ ou [), chaînes et échappements compris. */
function extractBalanced(text, start) {
  const open = text[start]
  const stack = []
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === '{' || c === '[') stack.push(c)
    else if (c === '}' || c === ']') {
      stack.pop()
      if (stack.length === 0) return { json: text.slice(start, i + 1), complete: true, start, open }
    }
  }
  // JSON tronqué (il manque des fermetures) : jsonrepair complètera
  return { json: text.slice(start), complete: false, start, open }
}

/** Retire les « + » devant les nombres hors chaînes (« "security": +5 » est du JSON invalide). */
function stripPlusSigns(json) {
  let out = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < json.length; i++) {
    const c = json[i]
    if (inString) {
      out += c
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') { inString = true; out += c; continue }
    if (c === '+' && /\d|\./.test(json[i + 1] || '') && /[:,[\s]$/.test(out.slice(-1) || ':')) continue
    out += c
  }
  return out
}

const DIALOGUE_KEYS = ['dialogues', 'interventions']

/** Tableau au premier niveau : répliques rangées sous { dialogues }, ou objet de tour contenu. */
function fromArray(arr) {
  const objects = arr.filter(isPlainObject)
  if (!objects.length) return null
  const replies = objects.filter((o) => typeof o.text === 'string')
  if (replies.length) return { dialogues: replies }
  const turn = objects.find((o) => DIALOGUE_KEYS.some((k) => Array.isArray(o[k])))
  return turn || objects[0]
}

function asObject(value) {
  if (isPlainObject(value)) return value
  if (Array.isArray(value)) return fromArray(value)
  return null
}

// Indices des débuts de structures candidates : chaque { ou [ hors chaîne, au plus 40
function candidateStarts(text) {
  const starts = []
  for (let i = 0; i < text.length && starts.length < 40; i++) {
    if (text[i] === '{' || text[i] === '[') starts.push(i)
  }
  return starts
}

const looksLikeTurn = (obj) => isPlainObject(obj) && ['dialogues', 'interventions', 'metricsImpact', 'metricsDelta', 'score', 'summary'].some((k) => k in obj)

/**
 * Lecture détaillée : { value, truncated }.
 * - texte autour et balises markdown tolérés, accolades dans la prose ignorées (on essaie la structure suivante) ;
 * - « +5 » nettoyé hors chaînes ;
 * - tableau de répliques au premier niveau rangé sous { dialogues } ;
 * - JSON tronqué réparé par jsonrepair et signalé (truncated: true).
 * Lève une erreur si aucun objet n'est récupérable.
 */
export function parseGeminiJsonDetailed(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Réponse vide reçue de Gemini')
  }
  const text = rawText.replace(/```(?:json)?/gi, '')
  const starts = candidateStarts(text)
  if (!starts.length) throw new Error('Format JSON irrécupérable : aucun objet JSON dans la réponse')

  // Structures de premier niveau seulement : celles imbriquées dans un candidat sont ignorées
  // (sinon un JSON légèrement invalide céderait la place à l'un de ses sous-objets)
  const candidates = []
  let skipUntil = -1
  for (const start of starts) {
    if (start < skipUntil) continue
    const c = extractBalanced(text, start)
    candidates.push(c)
    skipUntil = c.complete ? start + c.json.length : Infinity
    // Strict d'abord : premier candidat complet qui se lit tel quel
    if (c.complete) {
      try {
        const value = asObject(JSON.parse(stripPlusSigns(c.json)))
        if (value) return { value, truncated: false }
      } catch (e) { /* candidat suivant */ }
    }
  }

  // Réparation : on retient le candidat qui ressemble le plus à un tour (puis le plus long)
  let best = null
  let lastErr = null
  for (const c of candidates) {
    try {
      const value = asObject(JSON.parse(jsonrepair(stripPlusSigns(c.json))))
      if (!value) continue
      const score = (looksLikeTurn(value) ? 1e6 : 0) + c.json.length
      if (!best || score > best.score) best = { value, truncated: !c.complete, score }
    } catch (err) {
      lastErr = err
    }
  }
  if (best) return { value: best.value, truncated: best.truncated }
  throw new Error(`Format JSON irrécupérable : ${lastErr ? lastErr.message : 'un objet JSON était attendu'}`)
}

/**
 * Premier objet JSON exploitable d'une réponse de modèle (texte autour toléré, JSON tronqué réparé).
 * Lève une erreur si aucun objet n'est récupérable (prose, nombre seul…).
 */
export function parseGeminiJson(rawText) {
  return parseGeminiJsonDetailed(rawText).value
}

// ---------------------------------------------------------------------------------------------
// Modèles disponibles et réglages persistés
// ---------------------------------------------------------------------------------------------

export const DEFAULT_MODEL_EXCLUDES = ['embedding', 'aqa', 'imagen', 'tts', 'image-generation']

/**
 * Modèles Gemini capables de generateContent pour cette clé.
 * throwOnError: false (défaut) → [] en cas d'erreur ; true → lève l'erreur HTTP réelle (401/403 : clé refusée).
 * Renvoie [{ id, name, description, inputTokenLimit, outputTokenLimit, thinking }].
 */
export async function listGeminiModels(apiKey, { throwOnError = false, exclude = DEFAULT_MODEL_EXCLUDES, timeoutMs, signal } = {}) {
  const key = cleanApiKey(apiKey)
  if (!key) {
    if (throwOnError) throw new Error('Clé API requise')
    return []
  }
  try {
    const response = await geminiFetch('models?pageSize=1000', key, { timeoutMs, signal })
    if (!response.ok) throw await httpError(response)
    const data = await response.json()
    const excluded = (Array.isArray(exclude) ? exclude : []).map((e) => String(e).toLowerCase())
    return (Array.isArray(data?.models) ? data.models : [])
      .filter((m) => typeof m?.name === 'string' && Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent') && m.name.includes('gemini'))
      .filter((m) => !excluded.some((e) => m.name.toLowerCase().includes(e)))
      .map((m) => ({
        id: m.name.replace(/^models\//, ''),
        name: m.displayName || m.name,
        description: m.description || '',
        inputTokenLimit: m.inputTokenLimit ?? null,
        outputTokenLimit: m.outputTokenLimit ?? null,
        thinking: !!m.thinking
      }))
  } catch (err) {
    if (throwOnError) throw err
    console.warn('Impossible de lister les modèles :', err?.message || err)
    return []
  }
}

function storage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
    if (typeof localStorage !== 'undefined') return localStorage
  } catch (e) { /* accès refusé (navigation privée, iframe) */ }
  return null
}

/**
 * Réglages Gemini persistés (localStorage, avec garde) pour une application.
 * Clés : `${prefix}_gemini_api_key`, `${prefix}_gemini_model`, `${prefix}_gemini_models_cache`
 * (prefix 'cyber_nexus', 'cti_nexus', 'deploy_nexus' : clés actuelles des apps conservées).
 * getModel migre les anciennes préférences gemini-1.x vers DEFAULT_GEMINI_MODEL.
 */
export function createGeminiSettingsStore(prefix, { defaultModel = DEFAULT_GEMINI_MODEL } = {}) {
  const p = typeof prefix === 'string' && prefix.trim() ? prefix.trim() : 'nexus'
  const KEY = `${p}_gemini_api_key`
  const MODEL = `${p}_gemini_model`
  const CACHE = `${p}_gemini_models_cache`
  const get = (k) => { try { return storage()?.getItem(k) || '' } catch (e) { return '' } }
  const set = (k, v) => { try { storage()?.setItem(k, v) } catch (e) { /* quota, accès refusé */ } }
  const del = (k) => { try { storage()?.removeItem(k) } catch (e) { /* accès refusé */ } }
  return {
    keys: { apiKey: KEY, model: MODEL, modelsCache: CACHE },
    getApiKey: () => get(KEY).trim(),
    saveApiKey(key) {
      const clean = cleanApiKey(key)
      if (clean) set(KEY, clean)
      else del(KEY)
    },
    getModel() {
      const stored = cleanModelName(get(MODEL))
      if (!stored || /gemini-1\./.test(stored)) {
        if (stored) set(MODEL, defaultModel)
        return defaultModel
      }
      return stored
    },
    saveModel(model) {
      const clean = cleanModelName(model)
      if (clean) set(MODEL, clean)
      else del(MODEL)
    },
    getModelsCache() {
      try {
        const parsed = JSON.parse(get(CACHE) || 'null')
        return Array.isArray(parsed) ? parsed : []
      } catch (e) { return [] }
    },
    saveModelsCache(models) {
      if (Array.isArray(models)) set(CACHE, JSON.stringify(models))
      else del(CACHE)
    },
    clear() { del(KEY); del(MODEL); del(CACHE) }
  }
}
