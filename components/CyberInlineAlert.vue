<template>
  <div
    role="alert"
    class="p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 animate-fade-in"
    :class="palette.box"
  >
    <div class="flex items-center gap-1.5 min-w-0">
      <svg class="w-3.5 h-3.5 shrink-0" :class="palette.icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <span class="min-w-0"><slot></slot></span>
    </div>
    <button
      v-if="dismissLabel"
      type="button"
      class="p-1 rounded shrink-0 transition-colors cn-focus"
      :class="palette.close"
      :aria-label="dismissLabel"
      :title="dismissLabel"
      @click="emit('dismiss')"
    >
      <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Message d'erreur / avertissement en ligne, refermable si dismissLabel est fourni
const props = defineProps({
  tone: { type: String, default: 'rose', validator: (v) => ['rose', 'amber', 'cyan'].includes(v) },
  dismissLabel: { type: String, default: '' }
})

const emit = defineEmits(['dismiss'])

// Table statique : chaînes complètes pour que Tailwind détecte les classes.
const TONES = {
  rose: { box: 'bg-rose-500/10 border-rose-500/30 text-rose-300', icon: 'text-rose-400', close: 'text-rose-400 hover:text-rose-200 hover:bg-rose-500/10' },
  amber: { box: 'bg-amber-500/10 border-amber-500/30 text-amber-300', icon: 'text-amber-400', close: 'text-amber-400 hover:text-amber-200 hover:bg-amber-500/10' },
  cyan: { box: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300', icon: 'text-cyan-400', close: 'text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/10' }
}

const palette = computed(() => TONES[props.tone] || TONES.rose)
</script>
