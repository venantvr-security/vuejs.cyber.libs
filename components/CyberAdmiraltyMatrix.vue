<template>
  <section class="space-y-4">
    <header v-if="$slots.title || $slots.subtitle" class="space-y-1">
      <h3 v-if="$slots.title" class="font-heading text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
        <span class="cn-section-dot"></span>
        <slot name="title"></slot>
      </h3>
      <p v-if="$slots.subtitle" class="cn-body">
        <slot name="subtitle"></slot>
      </p>
    </header>

    <div class="cn-table-wrap">
      <table class="w-full min-w-[640px] border-collapse text-center">
        <thead>
          <tr>
            <th scope="col" class="p-2.5 bg-slate-900/90 border-b border-r border-slate-800 text-left align-bottom w-[22%]">
              <span v-if="rowAxisLabel" class="block text-xs font-semibold text-slate-400">↓ {{ rowAxisLabel }}</span>
              <span v-if="colAxisLabel" class="block text-xs font-semibold text-slate-400">→ {{ colAxisLabel }}</span>
            </th>
            <th
              v-for="(c, ci) in CREDIBILITY"
              :key="c"
              scope="col"
              class="p-2.5 bg-slate-900/90 border-b border-slate-800 align-bottom"
              :class="{ 'bg-cyan-500/10': selected.c === c }"
            >
              <span class="block font-heading text-base font-bold text-slate-100">{{ c }}</span>
              <span v-if="credibilityLabels[ci]" class="block text-xs font-medium text-slate-400 leading-tight mt-0.5">{{ credibilityLabels[ci] }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, ri) in RELIABILITY" :key="r">
            <th
              scope="row"
              class="p-2.5 bg-slate-900/90 border-r border-b border-slate-800 text-left"
              :class="{ 'bg-cyan-500/10': selected.r === r }"
            >
              <span class="font-heading text-base font-bold text-slate-100 mr-2">{{ r }}</span>
              <span v-if="reliabilityLabels[ri]" class="text-xs font-medium text-slate-400 leading-tight">{{ reliabilityLabels[ri] }}</span>
            </th>
            <td v-for="c in CREDIBILITY" :key="c" class="p-1 border-b border-slate-800/60">
              <component
                :is="interactive ? 'button' : 'span'"
                :type="interactive ? 'button' : undefined"
                :aria-pressed="interactive ? modelValue === r + c : undefined"
                class="flex items-center justify-center w-full min-h-[2.75rem] rounded-lg border font-heading text-sm font-bold tabular-nums transition-all"
                :class="[
                  ZONE_CLASSES[zoneOf(r, c)],
                  interactive && 'cursor-pointer hover:scale-[1.04] hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                  modelValue === r + c && 'ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-950 scale-[1.04]',
                ]"
                @click="interactive && emit('update:modelValue', r + c)"
              >
                {{ r }}{{ c }}
              </component>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul v-if="hasLegend" class="flex flex-wrap items-center gap-x-5 gap-y-2">
      <li v-for="zone in ZONES" v-show="legend[zone]" :key="zone" class="flex items-center gap-2 text-sm text-slate-300">
        <span class="w-3.5 h-3.5 rounded border shrink-0" :class="ZONE_CLASSES[zone]"></span>
        {{ legend[zone] }}
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed } from 'vue'

// Code de l'Amirauté (OTAN, STANAG 2511) : fiabilité de la source A–F × crédibilité de l'information 1–6.
// Aucun texte n'est codé en dur : libellés et légende sont fournis par l'application (i18n).
const props = defineProps({
  // Cotation sélectionnée, ex. 'B2' (v-model)
  modelValue: { type: String, default: '' },
  // Cellules cliquables pour choisir une cotation
  interactive: { type: Boolean, default: false },
  // 6 libellés A→F et 1→6
  reliabilityLabels: { type: Array, default: () => [] },
  credibilityLabels: { type: Array, default: () => [] },
  // Titres des axes (coin supérieur gauche)
  rowAxisLabel: { type: String, default: '' },
  colAxisLabel: { type: String, default: '' },
  // Légende des zones : { high, medium, low, unknown }
  legend: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

const RELIABILITY = ['A', 'B', 'C', 'D', 'E', 'F']
const CREDIBILITY = ['1', '2', '3', '4', '5', '6']
const ZONES = ['high', 'medium', 'low', 'unknown']

const ZONE_CLASSES = {
  high: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  medium: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
  low: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
  unknown: 'bg-slate-800/60 border-slate-700 text-slate-400',
}

// Zonage pédagogique (le standard ne combine pas les deux axes) :
// F ou 6 = « ne peut être évalué » → neutre ; E ou 5 = rejet ; sinon selon la distance à A1.
function zoneOf(r, c) {
  if (r === 'F' || c === '6') return 'unknown'
  if (r === 'E' || c === '5') return 'low'
  const score = RELIABILITY.indexOf(r) + CREDIBILITY.indexOf(c)
  if (score <= 1) return 'high'
  if (score <= 3) return 'medium'
  return 'low'
}

const selected = computed(() => ({ r: props.modelValue[0] || '', c: props.modelValue[1] || '' }))
const hasLegend = computed(() => ZONES.some(z => props.legend[z]))
</script>
