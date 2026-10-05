<template>
  <span :class="badgeClass">
    TLP:{{ level }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  level: {
    type: String,
    required: true
  },
  t: {
    type: Function,
    default: (key, fallback) => fallback
  }
})

const badgeClass = computed(() => {
  const base = 'px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide border inline-block shrink-0 shadow-sm'
  
  switch (props.level.toUpperCase()) {
    case 'RED':
      return `${base} bg-red-950/40 text-red-400 border-red-500/50`
    case 'AMBER+STRICT':
    case 'AMBER+':
      return `${base} bg-amber-950/40 text-amber-400 border-amber-500/50`
    case 'AMBER':
      return `${base} bg-yellow-950/40 text-yellow-400 border-yellow-500/50`
    case 'GREEN':
      return `${base} bg-emerald-950/40 text-emerald-400 border-emerald-500/50`
    case 'CLEAR':
      return `${base} bg-slate-800/40 text-slate-300 border-slate-500/50`
    default:
      return `${base} bg-slate-800/40 text-slate-300 border-slate-500/50`
  }
})
</script>
