<template>
  <span>
    <template v-for="(seg, i) in segments" :key="i">
      <CyberTlpBadge v-if="seg.tlp" :level="seg.tlp" class="mx-0.5 !py-0 !text-[0.85em] leading-snug align-baseline whitespace-nowrap" />
      <template v-else>{{ seg.text }}</template>
    </template>
  </span>
</template>

<script setup>
// Affiche un texte en remplaçant chaque mention « TLP:XXX » par la pastille TLP 2.0 colorée.
import { computed } from 'vue'
import CyberTlpBadge from './CyberTlpBadge.vue'

const props = defineProps({
  text: { type: String, default: '' },
})

const TLP = /TLP\s*:\s*(AMBER\+STRICT|CLEAR|WHITE|GREEN|AMBER|RED)/gi

const segments = computed(() => {
  const out = []
  let last = 0
  for (const m of props.text.matchAll(TLP)) {
    if (m.index > last) out.push({ text: props.text.slice(last, m.index) })
    out.push({ tlp: m[1].toUpperCase() })
    last = m.index + m[0].length
  }
  if (last < props.text.length) out.push({ text: props.text.slice(last) })
  return out
})
</script>
