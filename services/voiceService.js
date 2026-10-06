// Web Speech API Voice Service for CYBER-NEXUS (Chrome & Chromium-based browsers)
// Provides Text-to-Speech (TTS) for statements & stakeholder voices, and Speech-to-Text (STT) for user input dictation.

import { ref } from 'vue'

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
  const allVoices = window.speechSynthesis.getVoices()
  const frVoices = allVoices.filter(v => v.lang === 'fr-FR' || v.lang.startsWith('fr'))
  cachedFrenchVoices = frVoices.length > 0 ? frVoices : allVoices
  return cachedFrenchVoices
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices()
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices()
    }
  }
}

function selectBestVoice(isFemale) {
  const voices = cachedFrenchVoices.length > 0 ? cachedFrenchVoices : loadVoices()
  if (!voices || voices.length === 0) return null

  if (isFemale) {
    const femaleVoice = voices.find(v => {
      const name = v.name.toLowerCase()
      return name.includes('female') || name.includes('femme') || name.includes('hortense') || name.includes('amelie') || name.includes('audrey') || name.includes('virginie')
    })
    if (femaleVoice) return femaleVoice
  } else {
    const maleVoice = voices.find(v => {
      const name = v.name.toLowerCase()
      return name.includes('male') || name.includes('homme') || name.includes('thomas') || name.includes('nicolas') || name.includes('paul')
    })
    if (maleVoice) return maleVoice
  }

  // Fallback to Google français or first available fr voice
  const googleFr = voices.find(v => v.name.includes('Google') && v.lang.startsWith('fr'))
  return googleFr || voices[0]
}

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel()
  }
  currentlySpeakingId.value = null
  isSpeakingGlobal.value = false
}

export function speak(text, { actorId = 'system', onStart, onEnd, onError } = {}) {
  if (!isSpeechSynthesisSupported() || !text) return

  stopSpeaking()

  const cleanText = stripMarkdownForSpeech(text)
  if (!cleanText) return

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
    isSpeakingGlobal.value = true
    if (onStart) onStart()
  }

  utterance.onend = () => {
    isSpeakingGlobal.value = false
    if (onEnd) onEnd()
  }

  utterance.onerror = (err) => {
    isSpeakingGlobal.value = false
    currentlySpeakingId.value = null
    console.warn('[VoiceService] Speech synthesis error:', err)
    if (onError) onError(err)
  }

  window.speechSynthesis.speak(utterance)
}

// Composable for Text-to-Speech in components
export function useVoiceSynthesis() {
  function play(id, text, actorId = 'system') {
    if (currentlySpeakingId.value === id) {
      stopSpeaking()
      return
    }

    currentlySpeakingId.value = id
    speak(text, {
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
  }

  function stop() {
    stopSpeaking()
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

  function startRecognitionEngine() {
    if (!shouldBeListening) return
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
      isListening.value = true
      dictationError.value = null
    }

    instance.onresult = (event) => {
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
      activeInstance = null
      // In Chrome desktop, continuous listening may end upon brief silence;
      // auto-restart if user still wants to dictate and no fatal error occurred.
      if (shouldBeListening && !dictationError.value) {
        setTimeout(() => {
          if (shouldBeListening) {
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

    startRecognitionEngine()
    return true
  }

  function stop() {
    shouldBeListening = false
    if (activeInstance) {
      try {
        activeInstance.stop()
      } catch (err) {}
      activeInstance = null
    }
    isListening.value = false
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
