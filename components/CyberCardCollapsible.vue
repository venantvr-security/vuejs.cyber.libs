<template>
  <div class="glass-panel rounded-2xl border border-slate-800 overflow-hidden transition-all shadow-lg" :class="collapsed ? 'bg-slate-950/50' : 'bg-slate-950/80'">
    <!-- Header / Toggle -->
    <div 
      class="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors select-none"
      :class="headerClass"
      @click="$emit('toggle')"
    >
      <div class="flex items-start gap-3.5 min-w-0 flex-1">
        <button
          type="button"
          class="mt-0.5 p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white transition-colors shrink-0"
          :title="collapsed ? t('cyber_card_expand') : t('cyber_card_collapse')"
        >
          <svg v-if="!collapsed" class="w-4 h-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          <svg v-else class="w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
        </button>

        <slot name="header"></slot>
      </div>

      <div class="flex items-center gap-2 lg:shrink-0" @click.stop>
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- Body -->
    <div v-show="!collapsed" class="p-4 sm:p-5 border-t border-slate-800/80 space-y-4">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  t: { type: Function, default: (k, def) => def },
  collapsed: {
    type: Boolean,
    default: true
  },
  headerClass: {
    type: String,
    default: ''
  }
})
defineEmits(['toggle'])
</script>
