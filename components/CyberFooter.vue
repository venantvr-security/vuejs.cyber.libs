<template>
  <footer
    class="shrink-0 border-t border-slate-800/80 bg-slate-950 py-2 px-4 text-center text-xs text-slate-400 truncate"
    :class="hideOnMobile ? HIDE_CLASSES[mobileBreakpoint] || HIDE_CLASSES.md : ''"
  >
    <slot></slot>
  </footer>
</template>

<script setup>
// Pied de page. hideOnMobile : masqué sous le point de rupture mobileBreakpoint ('sm' | 'md' | 'lg', défaut 'md'),
// pour rendre la hauteur à la conversation sur téléphone.
defineProps({
  hideOnMobile: { type: Boolean, default: false },
  mobileBreakpoint: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) }
})

// Chaînes complètes pour Tailwind
const HIDE_CLASSES = { sm: 'hidden sm:block', md: 'hidden md:block', lg: 'hidden lg:block' }
</script>
