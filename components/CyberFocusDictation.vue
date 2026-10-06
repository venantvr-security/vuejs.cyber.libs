<template>
  <Teleport to="body">
    <div
      v-if="supported && field"
      class="fixed z-[9997] flex flex-col items-end gap-1"
      :style="{ top: pos.top + 'px', left: pos.left + 'px' }"
    >
      <!-- mousedown.prevent : le champ garde le focus (et son curseur) pendant le clic -->
      <button
        type="button"
        class="inline-flex items-center justify-center w-7 h-7 rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        :class="isListening
          ? 'bg-rose-500/25 text-rose-300 border-rose-500/60 animate-pulse shadow-glow-danger'
          : 'bg-slate-900/90 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/20 hover:border-cyan-400'"
        :aria-pressed="isListening"
        :aria-label="(isListening ? stopLabel : startLabel) || undefined"
        :title="(isListening ? stopLabel : startLabel) || undefined"
        @mousedown.prevent
        @click="toggle"
      >
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </button>
      <p
        v-if="dictationError"
        role="alert"
        class="max-w-[16rem] rounded-lg border border-rose-500/50 bg-rose-950/90 px-2.5 py-1.5 text-xs text-rose-200 shadow-xl"
      >
        {{ dictationError }}
      </p>
    </div>
  </Teleport>
</template>

<script setup>
// Micro de dictée « flottant » : apparaît sur le champ texte qui a le focus, dans toute l'application.
// À monter une seule fois (App.vue). Aucun texte en dur : libellés fournis par l'application.
// Exclusions : champs dans [data-no-dictation], ou qui ont déjà leur propre bouton de dictée.
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useVoiceDictation, isSpeechRecognitionSupported } from '../services/voiceService.js'

defineProps({
  startLabel: { type: String, default: '' },
  stopLabel: { type: String, default: '' },
})

const supported = isSpeechRecognitionSupported()
const field = ref(null)
const pos = reactive({ top: 0, left: 0 })
let suffix = ''
let raf = 0

const TEXT_INPUTS = ['text', 'search', '']
const MIC_PATH = 'path[d^="M12 2a3 3 0 0 0-3 3v7"]'

function isEligible(el) {
  if (!el || el.disabled || el.readOnly) return false
  const ok = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && TEXT_INPUTS.includes((el.getAttribute('type') || '').toLowerCase()))
  if (!ok || el.closest('[data-no-dictation]')) return false
  // Champ déjà équipé d'un bouton de dictée dédié (chat, coach…)
  const scope = el.parentElement?.parentElement || el.parentElement
  return !scope?.querySelector(`button[aria-pressed] ${MIC_PATH}`)
}

function setValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

const { isListening, dictationError, start, stop } = useVoiceDictation({
  onTranscript: (text) => {
    const el = field.value
    if (!el) return
    const sep = suffix && !/^\s/.test(suffix) ? ' ' : ''
    setValue(el, text + sep + suffix)
    const caret = text.length
    el.setSelectionRange?.(caret, caret)
  },
})

function place() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    const el = field.value
    if (!el) return
    const r = el.getBoundingClientRect()
    const size = 28
    const inset = 6
    const top = el.tagName === 'TEXTAREA' ? r.top + inset : r.top + (r.height - size) / 2
    pos.top = Math.max(4, Math.min(top, window.innerHeight - size - 4))
    pos.left = Math.max(4, Math.min(r.right - size - inset, window.innerWidth - size - 4))
  })
}

function attach(el) {
  if (field.value === el) return
  if (isListening.value) stopDictation()
  field.value = el
  dictationError.value = null
  place()
}

function detach() {
  if (isListening.value) stopDictation()
  field.value = null
}

function stopDictation() {
  stop()
  field.value?.dispatchEvent(new Event('change', { bubbles: true }))
}

function toggle() {
  const el = field.value
  if (!el) return
  if (isListening.value) return stopDictation()
  const value = el.value || ''
  const startPos = el.selectionStart ?? value.length
  const endPos = el.selectionEnd ?? value.length
  suffix = value.slice(endPos)
  start(value.slice(0, startPos))
}

function onFocusIn(e) {
  if (isEligible(e.target)) attach(e.target)
}

function onFocusOut(e) {
  // Le focus part ailleurs que sur le champ suivi : on retire le micro
  setTimeout(() => {
    if (field.value && document.activeElement !== field.value) detach()
  }, 0)
}

onMounted(() => {
  if (!supported) return
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)
  window.addEventListener('scroll', place, true)
  window.addEventListener('resize', place)
})

onBeforeUnmount(() => {
  document.removeEventListener('focusin', onFocusIn)
  document.removeEventListener('focusout', onFocusOut)
  window.removeEventListener('scroll', place, true)
  window.removeEventListener('resize', place)
  cancelAnimationFrame(raf)
  stop()
})
</script>
