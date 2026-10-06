// Web Speech API Voice Service for CYBER-NEXUS (Chrome & Chromium-based browsers)
// Provides Text-to-Speech (TTS) for statements & stakeholder voices, and Speech-to-Text (STT) for user input dictation.

import { ref, getCurrentScope, onScopeDispose } from 'vue'

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
  arbitration: { pitch: 1.05, rate: 1.0, female: false },
  system: { pitch: 1.0, rate: 1.05, female: false },
  user: { pitch: 1.0, rate: 1.0, female: false }
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

export function stopSpeaking() {
  activeUtterance = null
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel()
  }
  currentlySpeakingId.value = null
  isSpeakingGlobal.value = false
}

/** Lit un texte. Renvoie true si la lecture a été lancée. */
export function speak(text, { actorId = 'system', onStart, onEnd, onError } = {}) {
  if (!isSpeechSynthesisSupported() || !text) return false

  stopSpeaking()

  const cleanText = stripMarkdownForSpeech(text)
  if (!cleanText) return false

  const profile = ACTOR_VOICE_PROFILES[actorId] || ACTOR_VOICE_PROFILES.system
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
    isSpeakingGlobal.value = false
    if (onEnd) onEnd()
  }

  utterance.onerror = (err) => {
    const cancelled = err?.error === 'interrupted' || err?.error === 'canceled'
    // Énoncé remplacé ou arrêté volontairement : rien à signaler, l'état appartient au suivant
    if (activeUtterance !== utterance) return
    activeUtterance = null
    isSpeakingGlobal.value = false
    currentlySpeakingId.value = null
    if (!cancelled) console.warn('[VoiceService] Speech synthesis error:', err)
    if (onError) onError(err)
  }

  activeUtterance = utterance
  window.speechSynthesis.speak(utterance)
  return true
}

// Composable for Text-to-Speech in components
export function useVoiceSynthesis() {
  // Dernier identifiant lu par ce composant : seul celui-ci est interrompu au démontage
  let ownedId = null

  function play(id, text, actorId = 'system') {
    if (currentlySpeakingId.value === id) {
      stopSpeaking()
      return
    }

    // speak() commence par stopSpeaking() : l'identifiant est posé après, sinon il serait effacé
    const started = speak(text, {
      actorId,
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

// Composable for Speech Recognition / Voice Dictation (Google Chrome STT)
export function useVoiceDictation({ onTranscript, onError } = {}) {
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
      dictationError.value = "La reconnaissance vocale n'est pas supportée par ce navigateur."
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
    instance.lang = 'fr-FR'
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
        dictationError.value = "Microphone non autorisé : autorisez l'accès au micro dans votre navigateur (icône cadenas/caméra)."
        shouldBeListening = false
      } else if (err.error === 'network') {
        dictationError.value = "Service vocal Google inaccessible (erreur réseau). Vérifiez votre connexion ou utilisez Google Chrome officiel."
        shouldBeListening = false
      } else if (err.error === 'audio-capture') {
        dictationError.value = "Aucun microphone détecté sur votre système."
        shouldBeListening = false
      } else if (err.error !== 'aborted') {
        dictationError.value = `Erreur dictée (${err.error}).`
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
      dictationError.value = "Impossible de démarrer la reconnaissance vocale."
      isListening.value = false
      shouldBeListening = false
    }
  }

  async function start(initialText = '') {
    if (disposed) return false
    if (!isSpeechRecognitionSupported()) {
      dictationError.value = "La reconnaissance vocale n'est pas supportée par ce navigateur."
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
        dictationError.value = "Microphone non autorisé : autorisez le micro dans Chrome (cliquez sur le cadenas à gauche de l'URL)."
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
