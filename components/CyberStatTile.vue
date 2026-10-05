<template>
  <div :class="[variant === 'card' ? cardClass : insetClass]">
    <template v-if="variant === 'card'">
      <div class="text-xs sm:text-sm text-slate-400 mb-1 flex items-center justify-between gap-1">
        <span class="min-w-0"><slot name="label"></slot></span>
        <span v-if="$slots.icon" class="p-1 rounded shrink-0" :class="palette.tile" aria-hidden="true">
          <slot name="icon"></slot>
        </span>
      </div>
      <div class="text-lg sm:text-xl md:text-2xl font-heading font-bold break-words tabular-nums" :class="palette.value">
        <slot></slot>
      </div>
      <div v-if="$slots.hint" class="text-xs text-slate-400 mt-1">
        <slot name="hint"></slot>
      </div>
    </template>

    <template v-else>
      <div class="text-slate-400 text-xs uppercase tracking-wide font-bold">
        <slot name="label"></slot>
      </div>
      <div class="text-xl sm:text-2xl font-bold mt-1 tabular-nums" :class="palette.valueInset">
        <slot></slot>
      </div>
      <div v-if="$slots.hint" class="cn-meta">
        <slot name="hint"></slot>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Tuile de chiffre clé : libellé, valeur (slot par défaut), indication.
 * variant 'card' : panneau vitré à bordure colorée et icône ; 'inset' : encart compact centré.
 */
const props = defineProps({
  accent: {
    type: String,
    default: 'cyan',
    validator: (v) => ['cyan', 'emerald', 'amber', 'violet', 'purple', 'rose', 'slate'].includes(v)
  },
  variant: { type: String, default: 'card', validator: (v) => ['card', 'inset'].includes(v) }
})

// Table statique : chaînes complètes pour que Tailwind détecte les classes.
const ACCENTS = {
  cyan: { border: 'border-cyan-500/40', tile: 'bg-cyan-500/10 text-cyan-400', value: 'text-cyan-300', valueInset: 'text-cyan-400' },
  emerald: { border: 'border-emerald-500/40', tile: 'bg-emerald-500/10 text-emerald-400', value: 'text-emerald-300', valueInset: 'text-emerald-400' },
  amber: { border: 'border-amber-500/40', tile: 'bg-amber-500/10 text-amber-400', value: 'text-amber-300', valueInset: 'text-amber-400' },
  violet: { border: 'border-violet-500/40', tile: 'bg-violet-500/10 text-violet-400', value: 'text-violet-300', valueInset: 'text-violet-400' },
  purple: { border: 'border-purple-500/40', tile: 'bg-purple-500/10 text-purple-400', value: 'text-purple-300', valueInset: 'text-purple-400' },
  rose: { border: 'border-rose-500/40', tile: 'bg-rose-500/10 text-rose-400', value: 'text-rose-300', valueInset: 'text-rose-400' },
  slate: { border: 'border-slate-700', tile: 'bg-slate-800 text-slate-300', value: 'text-slate-100', valueInset: 'text-slate-100' }
}

const palette = computed(() => ACCENTS[props.accent] || ACCENTS.cyan)
const cardClass = computed(() => ['glass-panel rounded-2xl p-3.5 sm:p-5 border min-w-0', palette.value.border])
const insetClass = 'p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center min-w-0'
</script>
