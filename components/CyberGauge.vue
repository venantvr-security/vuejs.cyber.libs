<template>
  <div
    class="glass-panel rounded-2xl p-4 relative overflow-hidden flex flex-col gap-3 min-w-0 transition-all duration-300"
    :class="palette.hover"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <div
          v-if="$slots.icon"
          class="w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center"
          :class="palette.tile"
          aria-hidden="true"
        >
          <slot name="icon"></slot>
        </div>
        <div class="min-w-0">
          <div :id="labelId" class="text-sm font-semibold text-slate-100 leading-snug">
            <slot name="title"></slot>
          </div>
          <div v-if="$slots.subtitle" class="text-xs text-slate-400">
            <slot name="subtitle"></slot>
          </div>
        </div>
      </div>
      <span
        class="shrink-0 text-xs px-2 py-0.5 rounded-full font-bold tabular-nums"
        :class="badgeClass || palette.badge"
        aria-hidden="true"
      >
        {{ clamped }}{{ unit }}
      </span>
    </div>

    <div
      class="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden"
      role="progressbar"
      :aria-labelledby="labelId"
      aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuenow="clamped"
    >
      <div
        class="h-full rounded-full bg-gradient-to-r transition-all duration-500"
        :class="palette.bar"
        :style="{ width: `${(clamped / max) * 100}%` }"
      ></div>
    </div>

    <div v-if="$slots.default" class="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-xs text-slate-400">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  unit: { type: String, default: '%' },
  accent: {
    type: String,
    default: 'cyan',
    validator: (v) => ['cyan', 'emerald', 'amber', 'violet', 'rose'].includes(v)
  },
  // Classes du badge de valeur (sinon couleur de l'accent)
  badgeClass: { type: [String, Array, Object], default: '' }
})

const labelId = useId()

const clamped = computed(() => Math.max(0, Math.min(props.max, Number(props.value) || 0)))

// Table statique : chaînes complètes pour que Tailwind détecte les classes.
const ACCENTS = {
  cyan: {
    hover: 'hover:border-cyan-500/40',
    tile: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    badge: 'bg-cyan-500/15 text-cyan-300',
    bar: 'from-cyan-600 to-cyan-400'
  },
  emerald: {
    hover: 'hover:border-emerald-500/40',
    tile: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300',
    bar: 'from-emerald-600 to-emerald-400'
  },
  amber: {
    hover: 'hover:border-amber-500/40',
    tile: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    badge: 'bg-amber-500/15 text-amber-300',
    bar: 'from-amber-600 to-amber-400'
  },
  violet: {
    hover: 'hover:border-violet-500/40',
    tile: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
    badge: 'bg-violet-500/15 text-violet-300',
    bar: 'from-violet-600 to-violet-400'
  },
  rose: {
    hover: 'hover:border-rose-500/40',
    tile: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    badge: 'bg-rose-500/15 text-rose-300',
    bar: 'from-rose-600 to-rose-400'
  }
}

const palette = computed(() => ACCENTS[props.accent] || ACCENTS.cyan)
</script>
