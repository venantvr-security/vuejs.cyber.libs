<script setup>
import { ref, computed } from 'vue'
import { Sparkles, HeartHandshake, ShieldAlert, Flame, ChevronDown, Activity, Volume2, VolumeX } from 'lucide-vue-next'
import { useI18n } from '../services/i18n.js'
import { useVoiceSynthesis } from 'vuejs.cyber.libs/services/voiceService.js'

const props = defineProps({
  actor: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['changePreset'])

const { t } = useI18n()
const { currentlySpeakingId, play: playVoice, isSupported: isTtsSupported } = useVoiceSynthesis()

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
            {{ actor.avatar }}
            <span class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900" :class="moodColor"></span>
          </div>
          <div class="min-w-0">
            <h3 class="font-heading font-bold text-base text-slate-50 tracking-tight truncate" :title="actor.name">{{ actor.name }}</h3>
            <p class="text-sm font-medium text-cyan-400 truncate" :title="actor.role">{{ actor.role }}</p>
            <p class="text-xs text-slate-400 truncate" :title="actor.organization">{{ actor.organization }}</p>
          </div>
        </div>

        <button
          v-if="isTtsSupported"
          @click="playVoice(`actor-quote-${actor.id}`, currentPreset.sampleQuote, actor.id)"
          class="p-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/40 transition-colors shrink-0"
          :title="currentlySpeakingId === `actor-quote-${actor.id}` ? t('77a2f08d') : t('087bab2a')"
        >
          <VolumeX v-if="currentlySpeakingId === `actor-quote-${actor.id}`" class="w-4 h-4 text-rose-400 animate-pulse" />
          <Volume2 v-else class="w-4 h-4" />
        </button>
      </div>

      <!-- Preset Selector (3 Presets: Coopératif, Exigeant, Très Hostile) -->
      <div>
        <label class="text-xs uppercase  tracking-wider text-slate-400 mb-1.5 flex items-center justify-between gap-2">
          <span>{{ t('c6d66a58') }}</span>
          <span class="text-xs font-sans normal-case tracking-normal text-slate-400 truncate">{{ t('3af84a61') }}</span>
        </label>
        <div class="grid grid-cols-3 gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
          <!-- Preset 1: Coopératif -->
          <button
            @click="$emit('changePreset', { actorId: actor.id, preset: 'cooperative' })"
            :class="actor.activePreset === 'cooperative' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'"
            class="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md border text-sm leading-tight text-center transition-all min-w-0"
            :title="t('276e752b')"
          >
            <HeartHandshake class="w-4 h-4 text-emerald-400 shrink-0" />
            <span class="break-words hyphens-auto w-full">{{ t('276e752b') }}</span>
          </button>

          <!-- Preset 2: Exigeant / Neutre -->
          <button
            @click="$emit('changePreset', { actorId: actor.id, preset: 'demanding' })"
            :class="actor.activePreset === 'demanding' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'"
            class="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md border text-sm leading-tight text-center transition-all min-w-0"
            :title="t('f49ec601')"
          >
            <ShieldAlert class="w-4 h-4 text-amber-400 shrink-0" />
            <span class="break-words hyphens-auto w-full">{{ t('f49ec601') }}</span>
          </button>

          <!-- Preset 3: Très Hostile / Toxique -->
          <button
            @click="$emit('changePreset', { actorId: actor.id, preset: 'hostile' })"
            :class="actor.activePreset === 'hostile' ? 'bg-rose-500/25 text-rose-300 border-rose-500/60 shadow-glow-danger font-bold' : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/60'"
            class="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md border text-sm leading-tight text-center transition-all min-w-0"
            :title="t('0c663c01')"
          >
            <Flame class="w-4 h-4 text-rose-400 shrink-0" />
            <span class="break-words hyphens-auto w-full">{{ t('0c663c01') }}</span>
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
          :title="t('ce5ee71e')"
        >
          <Sparkles class="w-4 h-4 text-cyan-400 shrink-0" />
          <span class="truncate flex-1">{{ currentPreset.name }}</span>
          <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200" :class="showDetails ? 'rotate-180' : ''" />
        </button>

        <!-- Bias Badge : Spacious, legible, non-cramped -->
        <div 
          class="px-2.5 py-1.5 rounded-md border text-xs  font-medium leading-snug flex items-center justify-center text-center"
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
            <button
              v-if="isTtsSupported"
              @click.stop="playVoice(`actor-quote-${actor.id}`, currentPreset.sampleQuote, actor.id)"
              class="p-1 rounded hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-100 transition-colors shrink-0"
              :title="currentlySpeakingId === `actor-quote-${actor.id}` ? t('77a2f08d') : t('087bab2a')"
            >
              <VolumeX v-if="currentlySpeakingId === `actor-quote-${actor.id}`" class="w-3.5 h-3.5 text-rose-300 animate-pulse" />
              <Volume2 v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- État émotionnel / Dimension Psychologique (Échelle 1 à 5) -->
    <div v-if="actor.psychology" class="pt-2 border-t border-slate-800/80 space-y-1.5">
      <div class="flex items-center justify-between text-xs  text-slate-400">
        <span class="flex items-center gap-1 text-cyan-300 font-semibold">
          <Activity class="w-3 h-3 text-cyan-400" />
          <span>{{ t('53aab44b') }}</span>
        </span>
      </div>
      <div class="grid grid-cols-2 gap-1.5 text-xs ">
        <div class="flex items-center justify-between bg-slate-950/70 px-2 py-1 rounded border border-slate-800/90">
          <span class="text-slate-400">{{ t('5bc66904') }}</span>
          <span class="font-bold" :class="actor.psychology.agacement >= 4 ? 'text-rose-400' : actor.psychology.agacement >= 3 ? 'text-amber-400' : 'text-emerald-400'">
            {{ actor.psychology.agacement }}/5
          </span>
        </div>
        <div class="flex items-center justify-between bg-slate-950/70 px-2 py-1 rounded border border-slate-800/90">
          <span class="text-slate-400">{{ t('4be6b046') }}</span>
          <span class="font-bold" :class="actor.psychology.confiance >= 4 ? 'text-emerald-400' : actor.psychology.confiance >= 2 ? 'text-amber-400' : 'text-rose-400'">
            {{ actor.psychology.confiance }}/5
          </span>
        </div>
        <div class="flex items-center justify-between bg-slate-950/70 px-2 py-1 rounded border border-slate-800/90">
          <span class="text-slate-400">{{ t('2319cd90') }}</span>
          <span class="font-bold" :class="actor.psychology.stress >= 4 ? 'text-rose-400' : actor.psychology.stress >= 3 ? 'text-amber-400' : 'text-emerald-400'">
            {{ actor.psychology.stress }}/5
          </span>
        </div>
        <div class="flex items-center justify-between bg-slate-950/70 px-2 py-1 rounded border border-slate-800/90">
          <span class="text-slate-400">{{ t('3bf30214') }}</span>
          <span class="font-bold" :class="actor.psychology.ouverture >= 4 ? 'text-emerald-400' : actor.psychology.ouverture >= 2 ? 'text-amber-400' : 'text-rose-400'">
            {{ actor.psychology.ouverture }}/5
          </span>
        </div>
      </div>
    </div>

    <!-- Patience Indicator -->
    <div class="flex items-center justify-between gap-2 text-xs text-slate-400  mt-auto pt-2 border-t border-slate-800/80">
      <span>{{ t('b445db96') }}</span>
      <span :class="actor.activePreset === 'cooperative' ? 'text-emerald-400 font-semibold' : actor.activePreset === 'demanding' ? 'text-amber-400 font-semibold' : 'text-rose-400 font-bold'">
        {{ actor.activePreset === 'cooperative' ? t('2dd024c7') : actor.activePreset === 'demanding' ? t('a4d6223a') : t('2b40c3b8') }}
      </span>
    </div>
  </div>
</template>
