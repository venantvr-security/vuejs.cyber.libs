<template>
  <component
    :is="scroll ? CyberScrollRail : 'div'"
    v-bind="scroll ? { trackClass: [containerClass, 'p-1'] } : { class: containerClass }"
    role="radiogroup"
    :aria-label="ariaLabel || undefined"
    @keydown="onKeydown"
  >
    <button
      v-for="(option, index) in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="isSelected(option)"
      :tabindex="index === focusIndex ? 0 : -1"
      :title="option.title || undefined"
      :disabled="option.disabled"
      :class="[itemClass, isSelected(option) ? [activeClass, option.activeClass] : '', option.class]"
      @click="select(option)"
    >
      <slot name="option" :option="option" :selected="isSelected(option)">
        <component :is="option.icon" v-if="option.icon" class="w-4 h-4 shrink-0" :class="option.iconClass" aria-hidden="true" />
        <span class="truncate">{{ option.label }}</span>
        <span v-if="option.count !== undefined" class="text-xs opacity-80 tabular-nums">{{ option.count }}</span>
      </slot>
    </button>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import CyberScrollRail from './CyberScrollRail.vue'

/**
 * Choix unique parmi plusieurs options (onglets compacts, filtres, modes d'affichage).
 * Sémantique radiogroup : flèches / Origine / Fin déplacent et sélectionnent, Tab sort du groupe.
 * options : [{ value, label, icon?, iconClass?, title?, count?, disabled?, class?, activeClass? }]
 */
const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: null },
  options: { type: Array, required: true },
  ariaLabel: { type: String, default: '' },
  // 'seg' : contrôle segmenté en grille ; 'chip' : puces en ligne
  variant: { type: String, default: 'seg', validator: (v) => ['seg', 'chip'].includes(v) },
  // Nombre de colonnes du contrôle segmenté (0 = une par option)
  cols: { type: Number, default: 0 },
  // Puces dans un rail horizontal défilant au lieu d'un retour à la ligne
  scroll: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

// Chaînes complètes pour la détection Tailwind
const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' }

const containerClass = computed(() => {
  if (props.variant === 'chip') return props.scroll ? 'items-center gap-2' : 'flex flex-wrap items-center gap-2'
  return ['cn-seg', COLS[props.cols || props.options.length] || 'grid-cols-2']
})
const itemClass = computed(() => (props.variant === 'chip' ? 'cn-chip' : 'cn-seg-item min-w-0'))
const activeClass = computed(() => (props.variant === 'chip' ? 'cn-chip-active' : 'cn-seg-item-active'))

function isSelected(option) {
  return option.value === props.modelValue
}

// Option atteignable par Tab : la sélection, sinon la première active
const focusIndex = computed(() => {
  const i = props.options.findIndex(isSelected)
  return i >= 0 ? i : Math.max(0, props.options.findIndex((o) => !o.disabled))
})

function select(option) {
  if (!option.disabled && !isSelected(option)) emit('update:modelValue', option.value)
}

function onKeydown(e) {
  const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: 'first', End: 'last' }
  const move = keys[e.key]
  if (move === undefined) return
  const enabled = props.options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0)
  if (!enabled.length) return
  e.preventDefault()
  const current = enabled.indexOf(focusIndex.value)
  let next
  if (move === 'first') next = enabled[0]
  else if (move === 'last') next = enabled[enabled.length - 1]
  else next = enabled[(current + move + enabled.length) % enabled.length]
  select(props.options[next])
  // L'ordre d'un tableau de refs v-for n'est pas garanti : on relit le DOM
  e.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus()
}
</script>
