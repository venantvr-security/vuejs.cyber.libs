<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      @click.self="emit('close')"
    >
      <div
        role="dialog"
        aria-modal="true"
        class="glass-panel-elevated rounded-2xl w-full shadow-2xl border max-h-[92vh]"
        :class="[sizeClass, accentClasses.border, layout === 'flex' ? 'flex flex-col overflow-hidden' : 'p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar']"
      >
        <!-- Header -->
        <div
          class="flex items-start justify-between gap-3"
          :class="layout === 'flex' ? 'p-5 border-b border-slate-800 bg-slate-950/60 flex-shrink-0' : 'pb-4 border-b border-slate-800'"
        >
          <div class="flex items-start gap-3 min-w-0">
            <div v-if="$slots.icon" class="p-2 rounded-xl border flex-shrink-0" :class="accentClasses.tile">
              <slot name="icon"></slot>
            </div>
            <div class="min-w-0 space-y-1">
              <h2 v-if="$slots.title" class="font-heading text-base sm:text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2 flex-wrap">
                <slot name="title"></slot>
              </h2>
              <p v-if="$slots.subtitle" class="text-sm text-slate-400">
                <slot name="subtitle"></slot>
              </p>
              <slot name="header-extra"></slot>
            </div>
          </div>

          <button
            type="button"
            class="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors flex-shrink-0"
            :aria-label="closeLabel || undefined"
            :title="closeLabel || undefined"
            @click="emit('close')"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div v-if="layout === 'flex'" class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5">
          <slot></slot>
        </div>
        <slot v-else></slot>

        <!-- Footer -->
        <div
          v-if="$slots.footer"
          :class="layout === 'flex'
            ? 'p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex-shrink-0'
            : 'pt-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2'"
        >
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  accent: {
    type: String,
    default: 'cyan'
  },
  size: {
    type: String,
    default: 'md'
  },
  layout: {
    type: String,
    default: 'scroll'
  },
  closeLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

// Lookup statique : Tailwind doit voir les classes complètes.
const ACCENTS = {
  cyan: {
    border: 'border-cyan-500/40',
    tile: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
  },
  emerald: {
    border: 'border-emerald-500/40',
    tile: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
  },
  amber: {
    border: 'border-amber-500/40',
    tile: 'bg-amber-500/10 border-amber-500/30 text-amber-400'
  },
  violet: {
    border: 'border-violet-500/40',
    tile: 'bg-violet-500/10 border-violet-500/30 text-violet-400'
  },
  purple: {
    border: 'border-purple-500/40',
    tile: 'bg-purple-500/10 border-purple-500/30 text-purple-400'
  },
  rose: {
    border: 'border-rose-500/40',
    tile: 'bg-rose-500/10 border-rose-500/30 text-rose-400'
  }
}

const SIZES = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl'
}

const accentClasses = computed(() => ACCENTS[props.accent] || ACCENTS.cyan)
const sizeClass = computed(() => SIZES[props.size] || SIZES.md)

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof window === 'undefined') return
    if (isOpen) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeydown)
})
</script>
