<template>
  <div
    class="flex flex-col items-center justify-center text-center gap-2"
    :class="compact ? 'py-6 px-4' : 'py-10 px-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40'"
    role="status"
  >
    <div v-if="$slots.icon" class="w-10 h-10 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center justify-center text-slate-400" aria-hidden="true">
      <slot name="icon"></slot>
    </div>
    <p v-if="$slots.title" class="text-sm font-semibold text-slate-200">
      <slot name="title"></slot>
    </p>
    <p class="text-sm text-slate-400 max-w-md">
      <slot></slot>
    </p>
    <div v-if="$slots.actions" class="flex flex-wrap items-center justify-center gap-2 mt-2">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
// État vide (aucun résultat, aucune donnée) : icône, titre, message et actions en slots
defineProps({
  // Variante sans cadre, pour l'intérieur d'une liste ou d'un panneau
  compact: { type: Boolean, default: false }
})
</script>
