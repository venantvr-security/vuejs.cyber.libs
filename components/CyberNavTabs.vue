<template>
  <div>
    <!-- Desktop (>= md) : rail d'onglets défilant -->
    <nav class="hidden md:flex items-center justify-between gap-2 -mb-px" :aria-label="ariaLabel || undefined">
      <CyberScrollRail class="flex-1 min-w-0" :track-class="trackClass">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b-2 border-transparent text-sm whitespace-nowrap text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 transition-colors cn-focus cn-tab"
          :class="isActive(item) ? ['cn-tab-active', accentOf(item).desktop] : ''"
          :aria-current="isActive(item) ? 'page' : undefined"
          :title="item.title || undefined"
          v-bind="attrsOf(item)"
          @click="select(item)"
        >
          <component :is="item.icon" v-if="item.icon" class="w-4 h-4 shrink-0" :class="item.iconClass || iconClass" aria-hidden="true" />
          <span class="whitespace-nowrap">{{ item.label }}</span>
          <span v-if="item.badge" class="cn-pill shrink-0" :class="[badgeClass, item.badgeClass || 'cn-pill-cyan']">{{ item.badge }}</span>
        </button>
      </CyberScrollRail>
      <slot name="desktop-end"></slot>
    </nav>

    <!-- Mobile (< md), mobileLayout 'scroll' : une seule ligne défilante, accrochage, onglet actif gardé visible -->
    <nav
      v-if="mobileLayout === 'scroll'"
      ref="mobileTrack"
      class="flex md:hidden flex-nowrap gap-1.5 py-2 overflow-x-auto no-scrollbar overscroll-x-contain snap-x snap-mandatory scroll-px-3"
      :aria-label="ariaLabel || undefined"
      data-layout="scroll"
    >
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="shrink-0 snap-start flex items-center justify-center gap-1.5 px-3 min-h-[2.75rem] rounded-lg border text-xs font-medium whitespace-nowrap transition-all bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 cn-focus cn-tab-mobile"
        :class="isActive(item) ? ['cn-tab-mobile-active', accentOf(item).mobile] : ''"
        :aria-current="isActive(item) ? 'page' : undefined"
        :title="item.title || undefined"
        v-bind="attrsOf(item)"
        @click="select(item)"
      >
        <component :is="item.icon" v-if="item.icon" class="w-3.5 h-3.5 shrink-0" :class="item.iconClass || iconClass" aria-hidden="true" />
        <span>{{ item.mobileLabel || item.label }}</span>
        <span v-if="item.badge" class="cn-pill shrink-0 !py-0 !px-1.5 text-tiny" :class="item.badgeClass || 'cn-pill-cyan'">{{ item.badge }}</span>
      </button>
    </nav>

    <!-- Mobile (< md), mobileLayout 'grid' (défaut) : grille segmentée, tout visible sans défilement -->
    <nav v-else class="grid md:hidden gap-1.5 py-2" :class="mobileGridClass" :aria-label="ariaLabel || undefined" data-layout="grid">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="shrink-0 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-medium whitespace-nowrap transition-all bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 cn-focus cn-tab-mobile min-w-0"
        :class="isActive(item) ? ['cn-tab-mobile-active', accentOf(item).mobile] : ''"
        :aria-current="isActive(item) ? 'page' : undefined"
        :title="item.title || undefined"
        v-bind="attrsOf(item)"
        @click="select(item)"
      >
        <component :is="item.icon" v-if="item.icon" class="w-3.5 h-3.5 shrink-0" :class="item.iconClass || iconClass" aria-hidden="true" />
        <span class="truncate">{{ item.mobileLabel || item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import CyberScrollRail from './CyberScrollRail.vue'

/**
 * Navigation principale : rail desktop + navigation mobile, à partir d'une seule liste.
 * items : [{ id, label, mobileLabel?, icon?, iconClass?, title?, badge?, badgeClass?, accent? ('cyan' | 'emerald'),
 *   testId? (→ data-testid), attrs? (attributs posés sur le bouton, ex. { 'data-view': 'warroom' }) }]
 * mobileLayout : 'grid' (défaut, grille de mobileCols colonnes) ou 'scroll' (une ligne défilante avec accrochage,
 * onglet actif gardé visible). Les libellés sont déjà traduits par l'application.
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
  mobileCols: { type: Number, default: 3 },
  mobileLayout: { type: String, default: 'grid', validator: (v) => ['grid', 'scroll'].includes(v) }
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
const mobileTrack = ref(null)

function isActive(item) {
  return props.modelValue === item.id
}

function accentOf(item) {
  return ACCENTS[item.accent] || ACCENTS.cyan
}

function attrsOf(item) {
  const attrs = item && typeof item.attrs === 'object' && item.attrs ? { ...item.attrs } : {}
  if (item?.testId && !('data-testid' in attrs)) attrs['data-testid'] = item.testId
  return attrs
}

function select(item) {
  emit('update:modelValue', item.id)
}

// Ligne défilante : l'onglet actif reste visible
function revealActive() {
  const track = mobileTrack.value
  if (!track || typeof track.querySelector !== 'function') return
  const el = track.querySelector('[aria-current="page"]')
  if (!el) return
  const left = el.offsetLeft - track.offsetLeft
  const right = left + el.offsetWidth
  if (left < track.scrollLeft || right > track.scrollLeft + track.clientWidth) {
    track.scrollTo?.({ left: Math.max(0, left - 12), behavior: 'smooth' })
  }
}

onMounted(() => nextTick(revealActive))
watch(() => props.modelValue, () => nextTick(revealActive))
</script>
