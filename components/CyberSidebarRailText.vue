<template>
  <div 
    class="mt-auto text-[10px] text-slate-600 font-medium uppercase tracking-widest whitespace-nowrap opacity-60 select-none shrink-0"
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
