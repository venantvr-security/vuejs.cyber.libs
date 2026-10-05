<template>
  <section
    class="glass-panel-elevated rounded-2xl p-5 sm:p-6 border relative overflow-hidden"
    :class="palette.border"
  >
    <!-- Halo décoratif -->
    <div
      class="absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl pointer-events-none"
      :class="palette.orb"
      aria-hidden="true"
    ></div>

    <div class="relative flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div class="min-w-0">
        <div v-if="$slots.eyebrow" class="flex flex-wrap items-center gap-2 mb-2">
          <slot name="eyebrow"></slot>
        </div>

        <div class="flex items-center gap-3">
          <div
            v-if="$slots.icon"
            class="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
            :class="palette.tile"
            aria-hidden="true"
          >
            <slot name="icon"></slot>
          </div>
          <h1 class="font-heading text-xl sm:text-2xl font-bold tracking-tight text-slate-50 min-w-0">
            <slot name="title"></slot>
          </h1>
        </div>

        <p v-if="$slots.lead" class="text-sm text-slate-300 leading-relaxed max-w-3xl mt-1.5">
          <slot name="lead"></slot>
        </p>

        <div v-if="$slots.default" class="mt-3">
          <slot></slot>
        </div>
      </div>

      <div v-if="$slots.actions" class="flex flex-wrap gap-2 shrink-0">
        <slot name="actions"></slot>
      </div>
    </div>

    <div v-if="$slots.stats" class="relative mt-4">
      <slot name="stats"></slot>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  accent: {
    type: String,
    default: 'cyan',
    validator: (v) => ['cyan', 'emerald', 'amber', 'violet', 'rose'].includes(v)
  }
})

// Table statique : chaînes complètes pour que Tailwind détecte les classes.
const ACCENTS = {
  cyan: {
    border: 'border-cyan-500/30',
    orb: 'bg-cyan-500/10',
    tile: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
  },
  emerald: {
    border: 'border-emerald-500/30',
    orb: 'bg-emerald-500/10',
    tile: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
  },
  amber: {
    border: 'border-amber-500/30',
    orb: 'bg-amber-500/10',
    tile: 'bg-amber-500/20 border-amber-500/40 text-amber-300'
  },
  violet: {
    border: 'border-violet-500/30',
    orb: 'bg-violet-500/10',
    tile: 'bg-violet-500/20 border-violet-500/40 text-violet-300'
  },
  rose: {
    border: 'border-rose-500/30',
    orb: 'bg-rose-500/10',
    tile: 'bg-rose-500/20 border-rose-500/40 text-rose-300'
  }
}

const palette = computed(() => ACCENTS[props.accent] || ACCENTS.cyan)
</script>
