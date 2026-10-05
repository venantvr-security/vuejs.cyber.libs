<template>
  <div>
    <!-- Desktop (>= md) : rail d'onglets défilant -->
    <nav class="hidden md:flex items-center justify-between gap-2 -mb-px" :aria-label="ariaLabel || undefined">
      <CyberScrollRail class="flex-1 min-w-0" :track-class="trackClass">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="cn-tab"
          :class="isActive(item) ? ['cn-tab-active', accentOf(item).desktop] : ''"
          :aria-current="isActive(item) ? 'page' : undefined"
          :title="item.title || undefined"
          @click="select(item)"
        >
          <component :is="item.icon" v-if="item.icon" class="w-4 h-4 shrink-0" :class="item.iconClass || iconClass" aria-hidden="true" />
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="cn-pill" :class="[badgeClass, item.badgeClass || 'cn-pill-cyan']">{{ item.badge }}</span>
        </button>
      </CyberScrollRail>
      <slot name="desktop-end"></slot>
    </nav>

    <!-- Mobile (< md) : grille segmentée, tout visible sans défilement -->
    <nav class="grid md:hidden gap-1.5 py-2" :class="mobileGridClass" :aria-label="ariaLabel || undefined">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="cn-tab-mobile min-w-0"
        :class="isActive(item) ? ['cn-tab-mobile-active', accentOf(item).mobile] : ''"
        :aria-current="isActive(item) ? 'page' : undefined"
        :title="item.title || undefined"
        @click="select(item)"
      >
        <component :is="item.icon" v-if="item.icon" class="w-3.5 h-3.5 shrink-0" :class="item.iconClass || iconClass" aria-hidden="true" />
        <span class="truncate">{{ item.mobileLabel || item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CyberScrollRail from './CyberScrollRail.vue'

/**
 * Navigation principale : rail desktop + grille mobile, à partir d'une seule liste.
 * items : [{ id, label, mobileLabel?, icon?, iconClass?, title?, badge?, badgeClass?, accent? ('cyan' | 'emerald') }]
 * Les libellés sont déjà traduits par l'application.
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: Array, required: true },
  ariaLabel: { type: String, default: '' },
  // Couleur d'icône par défaut
  iconClass: { type: String, default: '' },
  // Visibilité des badges sur desktop (masqués sous xl par défaut)
  badgeClass: { type: String, default: 'hidden xl:inline-flex' },
  trackClass: { type: String, default: 'items-center gap-1' },
  mobileCols: { type: Number, default: 3 }
})

const emit = defineEmits(['update:modelValue'])

// Surcharges d'accent de l'onglet actif (chaînes complètes pour Tailwind)
const ACCENTS = {
  cyan: { desktop: '', mobile: '' },
  emerald: {
    desktop: '!text-emerald-300 !border-emerald-400 !bg-emerald-500/10',
    mobile: '!bg-emerald-500/20 !border-emerald-400 !text-emerald-200'
  }
}

const MOBILE_COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }
const mobileGridClass = computed(() => MOBILE_COLS[props.mobileCols] || MOBILE_COLS[3])

function isActive(item) {
  return props.modelValue === item.id
}

function accentOf(item) {
  return ACCENTS[item.accent] || ACCENTS.cyan
}

function select(item) {
  emit('update:modelValue', item.id)
}
</script>
