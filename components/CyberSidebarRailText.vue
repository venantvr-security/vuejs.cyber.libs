<template>
  <div 
    class="mt-auto text-xs text-slate-500 font-medium uppercase tracking-widest whitespace-nowrap select-none shrink-0"
    style="writing-mode: vertical-rl; transform: rotate(180deg);"
  >
    {{ text }}
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    required: true
  }
})
</script>
