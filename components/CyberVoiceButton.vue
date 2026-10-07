<template>
  <button
    v-if="isSupported"
    type="button"
    class="inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors cn-focus"
    :aria-pressed="speaking"
    :aria-label="showLabel ? undefined : currentLabel"
    :title="currentLabel"
    @click.stop="play(speechId, text, voice)"
  >
    <svg
      class="shrink-0"
      :class="[iconSize, speaking ? 'text-rose-400 animate-pulse' : iconClass]"
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
    >
      <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
      <template v-if="speaking">
        <line x1="22" x2="16" y1="9" y2="15" />
        <line x1="16" x2="22" y1="9" y2="15" />
      </template>
      <template v-else>
        <path d="M16 9a5 5 0 0 1 0 6" />
        <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
      </template>
    </svg>
    <span v-if="showLabel" class="text-xs" :class="labelClass">{{ currentLabel }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useVoiceSynthesis } from '../services/voiceService.js'

// Bouton lecture / arrêt de synthèse vocale : état partagé (une seule lecture à la fois)
const props = defineProps({
  // Identifiant unique de la lecture (ex. `msg-${id}`)
  speechId: { type: String, required: true },
  text: { type: String, default: '' },
  // Profil de voix : identifiant ('dg', 'system', 'user'…), acteur ({ id, voice }) ou profil ({ pitch, rate, female })
  voice: { type: [String, Object], default: 'system' },
  playLabel: { type: String, default: '' },
  stopLabel: { type: String, default: '' },
  // Libellé visible (sinon seulement aria-label / title)
  showLabel: { type: Boolean, default: false },
  labelClass: { type: [String, Array, Object], default: '' },
  iconClass: { type: [String, Array, Object], default: '' },
  size: { type: String, default: 'sm', validator: (v) => ['xs', 'sm', 'md'].includes(v) }
})

const { currentlySpeakingId, play, isSupported } = useVoiceSynthesis()

const speaking = computed(() => currentlySpeakingId.value === props.speechId)
const currentLabel = computed(() => (speaking.value ? props.stopLabel : props.playLabel) || undefined)
const iconSize = computed(() => ({ xs: 'w-3 h-3', sm: 'w-3.5 h-3.5', md: 'w-4 h-4' })[props.size])
</script>
