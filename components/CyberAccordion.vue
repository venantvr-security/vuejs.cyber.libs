<template>
  <details 
    class="group bg-slate-900/70 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all open:bg-slate-900"
    :open="open"
  >
    <summary class="list-none flex items-center justify-between cursor-pointer outline-none p-4 border-b border-transparent group-open:border-slate-800/80">
      <div class="flex-1 pr-3 flex items-center">
        <slot name="title"></slot>
      </div>
      <!-- Chevron natif SVG (pas de dépendance externe) -->
      <svg class="w-5 h-5 text-slate-500 transition-transform group-open:rotate-180 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </summary>
    <div class="px-4 pb-4 pt-2 cursor-text">
      <slot></slot>
    </div>
  </details>
</template>

<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false
  }
})
</script>
