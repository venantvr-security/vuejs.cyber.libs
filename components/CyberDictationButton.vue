<template>
  <button
    type="button"
    class="inline-flex items-center justify-center gap-1.5 rounded-md border transition-all cn-focus"
    :class="[sizeClass, stateClass]"
    :disabled="!supported && !listening"
    :aria-pressed="listening"
    :aria-label="showLabel ? undefined : currentLabel"
    :title="currentLabel"
    @click="emit('toggle')"
  >
    <svg
      class="shrink-0"
      :class="[iconSize, listening ? 'text-rose-400' : '']"
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
    >
      <template v-if="listening">
        <line x1="2" x2="22" y1="2" y2="22" />
        <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
        <path d="M5 10v2a7 7 0 0 0 12 5" />
        <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </template>
      <template v-else>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </template>
    </svg>
    <span v-if="showLabel" class="font-semibold">{{ listening ? stopLabel : startLabel }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

// Bouton micro de dictée vocale : purement visuel, l'état vient de useVoiceDictation
const props = defineProps({
  listening: { type: Boolean, default: false },
  supported: { type: Boolean, default: true },
  startLabel: { type: String, default: '' },
  stopLabel: { type: String, default: '' },
  unsupportedLabel: { type: String, default: '' },
  showLabel: { type: Boolean, default: false },
  size: { type: String, default: 'sm', validator: (v) => ['sm', 'md'].includes(v) }
})

const emit = defineEmits(['toggle'])

const currentLabel = computed(() => {
  if (!props.supported && !props.listening) return props.unsupportedLabel || undefined
  return (props.listening ? props.stopLabel : props.startLabel) || undefined
})

const stateClass = computed(() => {
  if (props.listening) return 'bg-rose-500/25 text-rose-300 border-rose-500/60 animate-pulse font-bold shadow-glow-danger'
  if (props.supported) return 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/40 hover:border-cyan-400'
  return 'bg-slate-800/70 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'
})

const sizeClass = computed(() => (props.showLabel ? 'px-2.5 py-1 text-xs' : 'p-1.5'))
const iconSize = computed(() => (props.size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'))
</script>
