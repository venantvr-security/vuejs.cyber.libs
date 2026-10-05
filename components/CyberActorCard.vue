<script setup>
import { ref, computed } from 'vue'
import { Sparkles, HeartHandshake, ShieldAlert, Flame, ChevronDown, Activity } from 'lucide-vue-next'
import CyberVoiceButton from './CyberVoiceButton.vue'

const props = defineProps({
  actor: {
    type: Object,
    required: true
  },
  t: {
    type: Function,
    default: (k, fallback) => fallback || k
  }
})

const t = (k, fallback) => props.t(k, fallback);

const emit = defineEmits(['changePreset'])

// Boutons de tempérament (classes complètes pour la détection Tailwind)
const PRESET_BUTTONS = [
  { id: 'cooperative', labelKey: 'ac_coop', icon: HeartHandshake, iconClass: 'text-emerald-400', activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm font-semibold' },
  { id: 'demanding', labelKey: 'ac_demanding', icon: ShieldAlert, iconClass: 'text-amber-400', activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm font-semibold' },
  { id: 'hostile', labelKey: 'ac_hostile', icon: Flame, iconClass: 'text-rose-400', activeClass: 'bg-rose-500/25 text-rose-300 border-rose-500/60 shadow-glow-danger font-bold' }
]

// Jauges psychologiques : « inverse » = une valeur haute est défavorable
const PSYCHOLOGY_GAUGES = [
  { key: 'agacement', labelKey: 'ac_annoyance', inverse: true },
  { key: 'confiance', labelKey: 'ac_trust', inverse: false },
  { key: 'stress', labelKey: 'ac_stress', inverse: true },
  { key: 'ouverture', labelKey: 'ac_openness', inverse: false }
]

function gaugeClass(gauge, value) {
  if (gauge.inverse) return value >= 4 ? 'text-rose-400' : value >= 3 ? 'text-amber-400' : 'text-emerald-400'
  return value >= 4 ? 'text-emerald-400' : value >= 2 ? 'text-amber-400' : 'text-rose-400'
}


// État purement visuel : dépliage du détail du preset
const showDetails = ref(false)

const currentPreset = computed(() => {
  return props.actor.presets[props.actor.activePreset]
})

const moodColor = computed(() => {
  if (props.actor.psychology) {
    if (props.actor.psychology.agacement >= 4 || props.actor.psychology.stress >= 5) return 'bg-rose-500 animate-pulse'
    if (props.actor.psychology.agacement >= 3 || props.actor.psychology.stress >= 3) return 'bg-amber-400'
    if (props.actor.psychology.confiance >= 4) return 'bg-emerald-400'
  }
  if (props.actor.activePreset === 'cooperative') return 'bg-emerald-400'
  if (props.actor.activePreset === 'demanding') return 'bg-amber-400'
  return 'bg-rose-500 animate-ping'
})
</script>

<template>
  <div class="glass-panel rounded-2xl p-4 transition-all duration-300 relative group hover:border-cyan-500/40 hover:shadow-glow-cyan flex flex-col gap-3">
    <div>
      <!-- Header of Card -->
      <div class="flex items-start justify-between gap-3 min-w-0">
        <div class="flex items-center gap-3 min-w-0">
          <div class="text-2xl w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-inner flex items-center justify-center relative shrink-0">
            <span aria-hidden="true">{{ actor.avatar }}</span>
            <span aria-hidden="true" class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900" :class="moodColor"></span>
          </div>
          <div class="min-w-0">
            <h3 class="font-heading font-bold text-base text-slate-50 tracking-tight truncate" :title="actor.name">{{ actor.name }}</h3>
            <p class="text-sm font-medium text-cyan-400 truncate" :title="actor.role">{{ actor.role }}</p>
            <p class="text-xs text-slate-400 truncate" :title="actor.organization">{{ actor.organization }}</p>
          </div>
        </div>

        <CyberVoiceButton
          :speech-id="`actor-quote-${actor.id}`"
          :text="currentPreset.sampleQuote"
          :voice="actor.id"
          :play-label="t('ac_play_audio')"
          :stop-label="t('ac_stop_audio')"
          size="md"
          class="p-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/40"
        />
      </div>

      <!-- Preset Selector (3 Presets: Coopératif, Exigeant, Très Hostile) -->
      <div>
        <div class="text-xs uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between gap-2">
          <span>{{ t('ac_temperament') }}</span>
          <span class="text-xs font-sans normal-case tracking-normal text-slate-400 truncate">{{ t('ac_click_force') }}</span>
        </div>
        <div class="grid grid-cols-3 gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800" role="group" :aria-label="t('ac_temperament')">
          <button
            v-for="preset in PRESET_BUTTONS"
            :key="preset.id"
            type="button"
            :aria-pressed="actor.activePreset === preset.id"
            :class="actor.activePreset === preset.id ? preset.activeClass : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'"
            class="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md border text-sm leading-tight text-center transition-all min-w-0"
            :title="t(preset.labelKey)"
            @click="$emit('changePreset', { actorId: actor.id, preset: preset.id })"
          >
            <component :is="preset.icon" class="w-4 h-4 shrink-0" :class="preset.iconClass" aria-hidden="true" />
            <span class="break-words hyphens-auto w-full">{{ t(preset.labelKey) }}</span>
          </button>
        </div>
      </div>

      <!-- Active Preset Details & Generous Bias Badge -->
      <div class="bg-slate-900/70 rounded-xl p-3 border border-slate-800/90 space-y-2.5">
        <!-- Title, Icon & fold toggle -->
        <button
          type="button"
          @click="showDetails = !showDetails"
          class="w-full flex items-center gap-2 text-sm font-semibold text-slate-100 hover:text-cyan-300 transition-colors text-left"
          :aria-expanded="showDetails"
          :title="t('ac_fold')"
        >
          <Sparkles class="w-4 h-4 text-cyan-400 shrink-0" />
          <span class="truncate flex-1">{{ currentPreset.name }}</span>
          <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200" :class="showDetails ? 'rotate-180' : ''" />
        </button>

        <!-- Bias Badge : Spacious, legible, non-cramped -->
        <div 
          class="px-2.5 py-1.5 rounded-md border text-xs font-medium leading-snug flex items-center justify-center text-center"
          :class="currentPreset.badgeClass"
        >
          {{ currentPreset.bias }}
        </div>

        <!-- Description & Sample Quote (repliables) -->
        <div v-show="showDetails" class="space-y-2.5 animate-fade-in">
          <p class="text-sm text-slate-300 leading-relaxed">
            {{ currentPreset.description }}
          </p>

          <div class="text-sm italic text-slate-200 border-l-2 border-cyan-500/60 pl-3 bg-cyan-950/25 py-1.5 rounded-r leading-relaxed flex items-center justify-between gap-2">
            <span>{{ currentPreset.sampleQuote }}</span>
            <CyberVoiceButton
              :speech-id="`actor-quote-${actor.id}`"
              :text="currentPreset.sampleQuote"
              :voice="actor.id"
              :play-label="t('ac_play_audio')"
              :stop-label="t('ac_stop_audio')"
              class="p-1 rounded hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-100"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- État émotionnel / Dimension Psychologique (Échelle 1 à 5) -->
    <div v-if="actor.psychology" class="pt-2 border-t border-slate-800/80 space-y-1.5">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span class="flex items-center gap-1 text-cyan-300 font-semibold">
          <Activity class="w-3 h-3 text-cyan-400" />
          <span>{{ t('ac_psychology') }}</span>
        </span>
      </div>
      <dl class="grid grid-cols-2 gap-1.5 text-xs">
        <div
          v-for="gauge in PSYCHOLOGY_GAUGES"
          :key="gauge.key"
          class="flex items-center justify-between bg-slate-950/70 px-2 py-1 rounded border border-slate-800/90"
        >
          <dt class="text-slate-400">{{ t(gauge.labelKey) }}</dt>
          <dd class="font-bold tabular-nums" :class="gaugeClass(gauge, actor.psychology[gauge.key])">
            {{ actor.psychology[gauge.key] }}/5
          </dd>
        </div>
      </dl>
    </div>

    <!-- Patience Indicator -->
    <div class="flex items-center justify-between gap-2 text-xs text-slate-400 mt-auto pt-2 border-t border-slate-800/80">
      <span>{{ t('ac_patience') }}</span>
      <span :class="actor.activePreset === 'cooperative' ? 'text-emerald-400 font-semibold' : actor.activePreset === 'demanding' ? 'text-amber-400 font-semibold' : 'text-rose-400 font-bold'">
        {{ actor.activePreset === 'cooperative' ? t('ac_status_coop') : actor.activePreset === 'demanding' ? t('ac_status_demanding') : t('ac_status_hostile') }}
      </span>
    </div>
  </div>
</template>
