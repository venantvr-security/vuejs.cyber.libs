<template>
  <div class="flex items-center gap-2.5 min-w-0">
    <div class="relative flex items-center justify-center w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-glow-cyan" aria-hidden="true">
      <ShieldAlert class="w-5 h-5 text-black" aria-hidden="true" />
    </div>
    <div class="min-w-0">
      <div class="flex items-center gap-2 min-w-0">
        <h1 class="font-heading text-lg font-bold truncate min-w-0 tracking-tight bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
          {{ title }}
        </h1>
        <span class="hidden sm:inline-flex cn-pill cn-pill-cyan uppercase tracking-widest font-normal">
          {{ subtitle }}
        </span>
      </div>
      <p v-if="description" class="text-xs text-slate-400 hidden sm:block truncate">{{ description }}</p>
    </div>
  </div>
</template>

<script setup>
import { ShieldAlert } from 'lucide-vue-next'

defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  }
})
</script>
