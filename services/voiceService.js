// Web Speech API Voice Service for CYBER-NEXUS (Chrome & Chromium-based browsers)
// Provides Text-to-Speech (TTS) for statements & stakeholder voices, and Speech-to-Text (STT) for user input dictation.

import { ref, getCurrentScope, onScopeDispose } from 'vue'

// Voix choisie d'après l'acteur (actor.voice, puis table par identifiant), lecture en file,
// relecture séquentielle d'une conversation (useConversationReplay).

export const currentlySpeakingId = ref(null)
export const isSpeakingGlobal = ref(false)

export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function isSpeechSynthesisSupported() {
  if (typeof window === 'undefined') return false
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export function stripMarkdownForSpeech(text) {
  if (!text) return ''
  return text
    .replace(/```[\s\S]*?```/g, '')       // code blocks
    .replace(/`([^`]+)`/g, '$1')           // inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // bold
    .replace(/\*([^*]+)\*/g, '$1')         // italic
    .replace(/#+\s+/g, '')                // headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links [text](url)
    .replace(/📋\s*\[DÉCISION D'ARBITRAGE ADOPTÉE\]\s*:\s*/gi, "Décision d'arbitrage adoptée : ")
    .replace(/[>_~]/g, '')                 // blockquote / tildes
    .replace(/[«»]/g, '"')                 // french quotes
    .replace(/\s+/g, ' ')
    .trim()
}

// Actor persona audio pitch and rate settings
// Profils de voix par identifiant d'acteur (communs aux deux applications)
const ACTOR_VOICE_PROFILES = {
  dg: { pitch: 1.15, rate: 1.05, female: true },        // Direction générale (énergique)
  rssi: { pitch: 0.90, rate: 1.0, female: false },      // RSSI (posé, technique)
  leaddev: { pitch: 0.85, rate: 1.1, female: false },   // Lead tech / MOE (rapide, direct)
  auditor: { pitch: 1.20, rate: 0.95, female: true },   // Inspection / tutelle (stricte, mesurée)
  dsi_local: { pitch: 0.80, rate: 1.0, female: false }, // DSI de terrain
  soc_lead: { pitch: 0.95, rate: 1.1, female: false },  // Lead SOC (vif, opérationnel)
  ot_lead: { pitch: 1.10, rate: 1.0, female: true },    // Responsable OT / SCADA (prudente)
  cfo: { pitch: 0.85, rate: 0.95, female: false },      // Direction financière (posé, chiffré)
  cto: { pitch: 1.10, rate: 1.05, female: true },       // Direction technique (DEPLOY : Valérie Moreau)
  devsecops: { pitch: 0.92, rate: 1.1, female: false }, // Lead DevSecOps (rapide, concret)
  dpo: { pitch: 0.88, rate: 0.95, female: false },      // DPO / juriste (mesuré)
  arbitration: { pitch: 1.05, rate: 1.0, female: false },
  system: { pitch: 1.0, rate: 1.05, female: false },
  user: { pitch: 1.0, rate: 1.0, female: false }
}

/**
 * Ajoute ou remplace des profils de voix par identifiant d'acteur (table propre à l'application) :
 * registerVoiceProfiles({ ciso: { pitch: 0.9, rate: 1, female: true } }). replace: true remplace toute la table
 * (les profils 'system', 'user' et 'arbitration' restent disponibles). Renvoie la table résultante (copie).
 */
export function registerVoiceProfiles(table = {}, { replace = false } = {}) {
  const base = { arbitration: ACTOR_VOICE_PROFILES.arbitration, system: ACTOR_VOICE_PROFILES.system, user: ACTOR_VOICE_PROFILES.user }
  if (replace) for (const key of Object.keys(ACTOR_VOICE_PROFILES)) if (!(key in base)) delete ACTOR_VOICE_PROFILES[key]
  for (const [id, profile] of Object.entries(table && typeof table === 'object' ? table : {})) {
    if (!profile || typeof profile !== 'object') continue
    const clean = {}
    if (typeof profile.female === 'boolean') clean.female = profile.female
    if (Number.isFinite(profile.pitch)) clean.pitch = Math.max(0, Math.min(2, profile.pitch))
    if (Number.isFinite(profile.rate)) clean.rate = Math.max(0.1, Math.min(10, profile.rate))
    ACTOR_VOICE_PROFILES[id] = { ...ACTOR_VOICE_PROFILES.system, ...(ACTOR_VOICE_PROFILES[id] || {}), ...clean }
  }
  return { ...ACTOR_VOICE_PROFILES }
}

/**
 * Profil de voix { pitch, rate, female } d'un acteur : actor.voice (prioritaire, champs partiels acceptés),
 * puis actor.gender ('f' | 'female' | 'm' | 'male'), puis la table par identifiant, puis 'system'.
 * Accepte un acteur, un identifiant ou un profil déjà résolu.
 */
export function resolveVoiceProfile(actorOrId) {
  const fallback = ACTOR_VOICE_PROFILES.system
  if (typeof actorOrId === 'string') return { ...(ACTOR_VOICE_PROFILES[actorOrId] || fallback) }
  if (!actorOrId || typeof actorOrId !== 'object') return { ...fallback }
  // Profil déjà résolu ({ pitch, rate, female } sans id) ou acteur
  const isProfile = !('id' in actorOrId) && ('pitch' in actorOrId || 'rate' in actorOrId || 'female' in actorOrId)
  const profile = { ...fallback, ...(isProfile ? {} : ACTOR_VOICE_PROFILES[actorOrId.id] || {}) }
  const gender = typeof actorOrId.gender === 'string' ? actorOrId.gender.toLowerCase() : ''
  if (['f', 'female', 'femme'].includes(gender)) profile.female = true
  if (['m', 'male', 'homme'].includes(gender)) profile.female = false
  const voice = isProfile ? actorOrId : actorOrId.voice && typeof actorOrId.voice === 'object' ? actorOrId.voice : null
  if (voice) {
    if (typeof voice.female === 'boolean') profile.female = voice.female
    if (Number.isFinite(voice.pitch)) profile.pitch = Math.max(0, Math.min(2, voice.pitch))
    if (Number.isFinite(voice.rate)) profile.rate = Math.max(0.1, Math.min(10, voice.rate))
  }
  return profile
}

let cachedFrenchVoices = []

function loadVoices() {
  if (!isSpeechSynthesisSupported()) return []
  const allVoices = window.speechSynthesis.getVoices() || []
  const frVoices = allVoices.filter(v => typeof v?.lang === 'string' && (v.lang === 'fr-FR' || v.lang.toLowerCase().startsWith('fr')))
  cachedFrenchVoices = frVoices.length > 0 ? frVoices : allVoices
  return cachedFrenchVoices
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices()
  // addEventListener : ne remplace pas un éventuel gestionnaire onvoiceschanged de l'application
  const synth = window.speechSynthesis
  if (typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', loadVoices)
  } else if (synth.onvoiceschanged !== undefined) {
    const previous = synth.onvoiceschanged
    synth.onvoiceschanged = function (event) {
      loadVoices()
      if (typeof previous === 'function') return previous.call(this, event)
    }
  }
}

// Mots du nom de voix, sans accents (« Amélie » → amelie) : « female » ne contient pas le mot « male »
function voiceNameWords(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

const FEMALE_VOICE_WORDS = new Set(['female', 'femme', 'woman', 'hortense', 'amelie', 'audrey', 'virginie', 'julie', 'denise', 'eloise', 'celine', 'marie', 'lea', 'brigitte', 'aurelie', 'sylvie', 'chantal', 'charlotte', 'vivienne', 'coralie', 'jacqueline', 'ariane'])
const MALE_VOICE_WORDS = new Set(['male', 'homme', 'man', 'thomas', 'nicolas', 'paul', 'henri', 'claude', 'remy', 'guillaume', 'daniel', 'mathieu', 'antoine', 'jean', 'fabrice', 'alain', 'gerard', 'jerome', 'yves', 'olivier'])

function selectBestVoice(isFemale) {
  const voices = cachedFrenchVoices.length > 0 ? cachedFrenchVoices : loadVoices()
  if (!voices || voices.length === 0) return null

  const wanted = isFemale ? FEMALE_VOICE_WORDS : MALE_VOICE_WORDS
  const opposite = isFemale ? MALE_VOICE_WORDS : FEMALE_VOICE_WORDS
  const match = voices.find((v) => {
    const words = voiceNameWords(v.name)
    return words.some((w) => wanted.has(w)) && !words.some((w) => opposite.has(w))
  })
  if (match) return match

  // Fallback to Google français or first available fr voice
  const googleFr = voices.find(v => String(v.name || '').includes('Google') && String(v.lang || '').toLowerCase().startsWith('fr'))
  return googleFr || voices[0]
}

// Énoncé en cours : les événements d'un énoncé annulé (onerror « interrupted »/« canceled », onend)
// ne doivent pas modifier l'état de celui qui l'a remplacé
let activeUtterance = null
// Rappel « interrompu » de l'énoncé en cours : prévient une file de lecture qu'une autre lecture l'a remplacée
let activeInterrupted = null

export function stopSpeaking() {
  const interrupted = activeInterrupted
  activeUtterance = null
  activeInterrupted = null
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel()
  }
  currentlySpeakingId.value = null
  isSpeakingGlobal.value = false
  if (typeof interrupted === 'function') {
    try { interrupted() } catch (e) { /* rappel applicatif */ }
  }
}

/**
 * Lit un texte (interrompt la lecture en cours). Renvoie true si la lecture a été lancée.
 * Voix : voiceProfile ({ pitch, rate, female } ou acteur, voir resolveVoiceProfile) prioritaire sur actorId
 * (identifiant ou acteur). onInterrupted est appelé si une autre lecture ou stopSpeaking() l'interrompt.
 */
export function speak(text, { actorId = 'system', voiceProfile = null, onStart, onEnd, onError, onInterrupted } = {}) {
  if (!isSpeechSynthesisSupported() || !text) return false

  stopSpeaking()

  const cleanText = stripMarkdownForSpeech(text)
  if (!cleanText) return false

  const profile = voiceProfile ? resolveVoiceProfile(voiceProfile) : resolveVoiceProfile(actorId)
  const utterance = new SpeechSynthesisUtterance(cleanText)
  utterance.lang = 'fr-FR'
  utterance.pitch = profile.pitch
  utterance.rate = profile.rate

  const voice = selectBestVoice(profile.female)
  if (voice) {
    utterance.voice = voice
  }

  utterance.onstart = () => {
    if (activeUtterance !== utterance) return
    isSpeakingGlobal.value = true
    if (onStart) onStart()
  }

  utterance.onend = () => {
    if (activeUtterance !== utterance) return
    activeUtterance = null
    activeInterrupted = null
    isSpeakingGlobal.value = false
    if (onEnd) onEnd()
  }

  utterance.onerror = (err) => {
    const cancelled = err?.error === 'interrupted' || err?.error === 'canceled'
    // Énoncé remplacé ou arrêté volontairement : rien à signaler, l'état appartient au suivant
    if (activeUtterance !== utterance) return
    activeUtterance = null
    activeInterrupted = null
    isSpeakingGlobal.value = false
    currentlySpeakingId.value = null
    if (!cancelled) console.warn('[VoiceService] Speech synthesis error:', err)
    if (onError) onError(err)
  }

  activeUtterance = utterance
  activeInterrupted = typeof onInterrupted === 'function' ? onInterrupted : null
  window.speechSynthesis.speak(utterance)
  return true
}

/**
 * File de lecture séquentielle : items = [{ id?, text, actorId?, voiceProfile? }], lus l'un après l'autre.
 * Pendant la lecture d'un élément, currentlySpeakingId vaut son id (surlignage de la bulle).
 * Renvoie { stop, done } (done : promesse résolue à la fin ou à l'arrêt) ; null si la synthèse est indisponible.
 * Une autre lecture lancée entre-temps (bouton d'une bulle) arrête la file.
 */
export function speakQueue(items, { pauseMs = 250, onItemStart, onItemEnd, onDone } = {}) {
  const list = (Array.isArray(items) ? items : []).filter((it) => it && typeof it.text === 'string' && it.text.trim())
  if (!isSpeechSynthesisSupported() || !list.length) return null
  let stopped = false
  let index = -1
  let timer = null
  let resolveDone
  const done = new Promise((resolve) => { resolveDone = resolve })
  const finish = (completed) => {
    if (stopped) return
    stopped = true
    clearTimeout(timer)
    if (onDone) onDone({ completed, index })
    resolveDone({ completed, index })
  }
  const next = () => {
    if (stopped) return
    index += 1
    if (index >= list.length) { finish(true); return }
    const item = list[index]
    const started = speak(item.text, {
      actorId: item.actorId || 'system',
      voiceProfile: item.voiceProfile || null,
      onStart: () => { if (!stopped && item.id !== undefined) currentlySpeakingId.value = item.id },
      onEnd: () => {
        if (stopped) return
        if (item.id !== undefined && currentlySpeakingId.value === item.id) currentlySpeakingId.value = null
        if (onItemEnd) onItemEnd(item, index)
        timer = setTimeout(next, pauseMs)
      },
      onError: (err) => {
        const cancelled = err?.error === 'interrupted' || err?.error === 'canceled'
        if (cancelled) finish(false)
        else timer = setTimeout(next, pauseMs)
      },
      onInterrupted: () => finish(false)
    })
    if (!started) { timer = setTimeout(next, 0); return }
    if (item.id !== undefined) currentlySpeakingId.value = item.id
    if (onItemStart) onItemStart(item, index)
  }
  next()
  return {
    stop() {
      if (stopped) return
      finish(false)
      stopSpeaking()
    },
    done
  }
}

// Composable for Text-to-Speech in components
export function useVoiceSynthesis() {
  // Dernier identifiant lu par ce composant : seul celui-ci est interrompu au démontage
  let ownedId = null

  // voice : identifiant de profil ('dg', 'system'…), acteur ({ id, voice }) ou profil ({ pitch, rate, female })
  function play(id, text, voice = 'system') {
    if (currentlySpeakingId.value === id) {
      stopSpeaking()
      return
    }

    // speak() commence par stopSpeaking() : l'identifiant est posé après, sinon il serait effacé
    const started = speak(text, {
      actorId: typeof voice === 'string' ? voice : 'system',
      voiceProfile: voice && typeof voice === 'object' ? voice : null,
      onStart: () => {
        currentlySpeakingId.value = id
      },
      onEnd: () => {
        if (currentlySpeakingId.value === id) {
          currentlySpeakingId.value = null
        }
      },
      onError: () => {
        if (currentlySpeakingId.value === id) {
          currentlySpeakingId.value = null
        }
      }
    })
    if (started) {
      currentlySpeakingId.value = id
      ownedId = id
    }
  }

  function stop() {
    stopSpeaking()
  }

  // Démontage du composant : la lecture qu'il a lancée s'arrête (celle d'un autre composant continue)
  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (ownedId !== null && currentlySpeakingId.value === ownedId) stop()
      ownedId = null
    })
  }

  return {
    currentlySpeakingId,
    isSpeakingGlobal,
    play,
    stop,
    isSupported: isSpeechSynthesisSupported()
  }
}

/**
 * Relecture vocale séquentielle d'une conversation (Chrome / Web Speech API).
 * replay(messages, options) lit les messages dans l'ordre à partir de `from` :
 * - resolveActor(msg) → acteur (sa voix : resolveVoiceProfile) ; défaut : msg.sender / msg.actorId ;
 * - skip : expéditeurs ignorés (défaut ['system']) ; textOf(msg) : texte lu (défaut msg.text, puis msg.summary) ;
 * - idOf(msg, i) : identifiant de lecture, à aligner sur le speechId des bulles (défaut `msg-${msg.id ?? i}`).
 * isReplaying / currentIndex sont réactifs ; stop() arrête proprement ; démontage du composant = arrêt.
 * Renvoie false si la synthèse vocale est indisponible ou s'il n'y a rien à lire.
 */
export function useConversationReplay() {
  const isReplaying = ref(false)
  const currentIndex = ref(-1)
  let queue = null

  function stop() {
    const q = queue
    queue = null
    isReplaying.value = false
    currentIndex.value = -1
    if (q) q.stop()
  }

  function replay(messages, { resolveActor, from = 0, skip = ['system'], textOf, idOf, pauseMs = 250 } = {}) {
    stop()
    const source = Array.isArray(messages) ? messages : []
    const items = []
    source.forEach((msg, i) => {
      if (i < from || !msg || typeof msg !== 'object') return
      if (Array.isArray(skip) && skip.includes(msg.sender)) return
      const text = typeof textOf === 'function' ? textOf(msg) : (typeof msg.text === 'string' && msg.text) || (typeof msg.summary === 'string' && msg.summary) || ''
      if (!text || !String(text).trim()) return
      const actor = typeof resolveActor === 'function' ? resolveActor(msg) : null
      const isUser = msg.sender === 'user' || msg.sender === 'player' || msg.sender === 'decision'
      const fallbackId = isUser ? 'user' : msg.sender === 'arbitration' ? 'arbitration' : (msg.actorId || msg.sender || 'system')
      items.push({
        id: typeof idOf === 'function' ? idOf(msg, i) : `msg-${msg.id ?? i}`,
        text: String(text),
        actorId: typeof fallbackId === 'string' ? fallbackId : 'system',
        voiceProfile: actor && typeof actor === 'object' ? actor : null,
        index: i
      })
    })
    if (!items.length) return false
    const q = speakQueue(items, {
      pauseMs,
      onItemStart: (item) => { currentIndex.value = item.index },
      onDone: () => {
        if (queue !== q) return
        queue = null
        isReplaying.value = false
        currentIndex.value = -1
      }
    })
    if (!q) return false
    queue = q
    isReplaying.value = true
    return true
  }

  if (getCurrentScope()) onScopeDispose(stop)

  return { isReplaying, currentIndex, replay, stop, isSupported: isSpeechSynthesisSupported() }
}

// Messages d'erreur par défaut de la dictée (français) ; remplaçables par l'option messages
export const DICTATION_MESSAGES_FR = Object.freeze({
  unsupported: "La reconnaissance vocale n'est pas supportée par ce navigateur.",
  notAllowed: "Microphone non autorisé : autorisez l'accès au micro dans votre navigateur (icône cadenas/caméra).",
  permission: "Microphone non autorisé : autorisez le micro dans Chrome (cliquez sur le cadenas à gauche de l'URL).",
  network: 'Service vocal Google inaccessible (erreur réseau). Vérifiez votre connexion ou utilisez Google Chrome officiel.',
  audioCapture: 'Aucun microphone détecté sur votre système.',
  startFailed: 'Impossible de démarrer la reconnaissance vocale.',
  generic: 'Erreur dictée ({error}).'
})

/**
 * Dictée vocale (Web Speech API, Chrome). Options :
 * - onTranscript(texte), onError(err) ;
 * - lang : langue de reconnaissance ('fr-FR' par défaut) : chaîne, ref ou fonction (lue à chaque démarrage,
 *   pour suivre la langue de l'interface : lang: () => (currentLocale.value === 'en' ? 'en-US' : 'fr-FR')) ;
 * - messages : messages d'erreur (clés de DICTATION_MESSAGES_FR ; '{error}' remplacé par le code d'erreur).
 */
export function useVoiceDictation({ onTranscript, onError, lang = 'fr-FR', messages = {} } = {}) {
  const msg = (key, error = '') => String((messages && messages[key]) || DICTATION_MESSAGES_FR[key] || '').replace('{error}', error)
  const langOf = () => {
    let value = lang
    if (typeof value === 'function') { try { value = value() } catch (e) { value = null } }
    if (value && typeof value === 'object' && 'value' in value) value = value.value
    return typeof value === 'string' && value.trim() ? value.trim() : 'fr-FR'
  }
  const isListening = ref(false)
  const dictationError = ref(null)
  let activeInstance = null
  let baseText = ''
  let shouldBeListening = false
  let disposed = false
  let restartTimer = null

  function startRecognitionEngine() {
    if (!shouldBeListening || disposed) return
    if (!isSpeechRecognitionSupported()) {
      dictationError.value = msg('unsupported')
      isListening.value = false
      shouldBeListening = false
      return
    }

    if (activeInstance) {
      try {
        activeInstance.onend = null
        activeInstance.onerror = null
        activeInstance.abort()
      } catch (e) {}
      activeInstance = null
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const instance = new SpeechRecognition()
    instance.lang = langOf()
    instance.continuous = true
    instance.interimResults = true
    instance.maxAlternatives = 1

    instance.onstart = () => {
      if (activeInstance !== instance) return
      isListening.value = true
      dictationError.value = null
    }

    instance.onresult = (event) => {
      if (disposed) return
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcriptPart
        } else {
          interim += transcriptPart
        }
      }

      const currentSpeech = (final || interim).trim()
      if (currentSpeech && onTranscript) {
        const separator = baseText && !baseText.endsWith(' ') ? ' ' : ''
        onTranscript(baseText + separator + currentSpeech)
      }
      if (final) {
        const separator = baseText && !baseText.endsWith(' ') ? ' ' : ''
        baseText = baseText + separator + final.trim()
      }
    }

    instance.onerror = (err) => {
      if (activeInstance !== instance) return
      console.warn('[VoiceDictation] Error:', err.error)
      if (err.error === 'no-speech') {
        // Natural pause/silence in continuous mode - non-fatal
        return
      }

      if (err.error === 'not-allowed') {
        dictationError.value = msg('notAllowed')
        shouldBeListening = false
      } else if (err.error === 'network') {
        dictationError.value = msg('network')
        shouldBeListening = false
      } else if (err.error === 'audio-capture') {
        dictationError.value = msg('audioCapture')
        shouldBeListening = false
      } else if (err.error !== 'aborted') {
        dictationError.value = msg('generic', err.error)
        shouldBeListening = false
      }

      isListening.value = false
      if (onError) onError(err)
    }

    instance.onend = () => {
      // Instance remplacée (stop puis start rapprochés) : son arrêt ne concerne plus la dictée en cours
      if (activeInstance !== instance) return
      activeInstance = null
      // In Chrome desktop, continuous listening may end upon brief silence;
      // auto-restart if user still wants to dictate and no fatal error occurred.
      if (shouldBeListening && !disposed && !dictationError.value) {
        clearTimeout(restartTimer)
        restartTimer = setTimeout(() => {
          restartTimer = null
          if (shouldBeListening && !disposed) {
            startRecognitionEngine()
          }
        }, 150)
      } else {
        isListening.value = false
      }
    }

    activeInstance = instance

    try {
      instance.start()
      isListening.value = true
    } catch (err) {
      console.warn('[VoiceDictation] Failed to start recognition instance:', err)
      dictationError.value = msg('startFailed')
      isListening.value = false
      shouldBeListening = false
    }
  }

  async function start(initialText = '') {
    if (disposed) return false
    if (!isSpeechRecognitionSupported()) {
      dictationError.value = msg('unsupported')
      return false
    }

    stopSpeaking() // mute any reading during dictation
    baseText = initialText || ''
    dictationError.value = null
    shouldBeListening = true

    // Explicitly request microphone access first to trigger browser permissions if needed
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop())
      } catch (permErr) {
        console.warn('[VoiceDictation] Microphone permission error:', permErr)
        dictationError.value = msg('permission')
        isListening.value = false
        shouldBeListening = false
        if (onError) onError(permErr)
        return false
      }
    }

    // Arrêt ou démontage pendant la demande d'autorisation du micro
    if (!shouldBeListening || disposed) return false
    startRecognitionEngine()
    return true
  }

  function stop() {
    shouldBeListening = false
    clearTimeout(restartTimer)
    restartTimer = null
    if (activeInstance) {
      const instance = activeInstance
      activeInstance = null
      try {
        instance.stop()
      } catch (err) {}
    }
    isListening.value = false
  }

  // Démontage du composant : la dictée s'arrête et ne redémarre plus
  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true
      stop()
    })
  }

  function toggle(currentText = '') {
    if (isListening.value) {
      stop()
    } else {
      start(currentText)
    }
  }

  return {
    isListening,
    dictationError,
    start,
    stop,
    toggle,
    isSupported: isSpeechRecognitionSupported()
  }
}
