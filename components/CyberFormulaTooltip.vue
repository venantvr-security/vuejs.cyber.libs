<template>
  <span class="inline-flex align-middle" @mouseenter="show" @mouseleave="scheduleHide">
    <button
      ref="trigger"
      type="button"
      class="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors"
      :aria-label="triggerLabel || undefined"
      :aria-expanded="open"
      :aria-describedby="open ? id : undefined"
      @focus="show"
      @blur="scheduleHide"
      @click.stop="open ? hide() : show()"
      @keydown.esc="hide"
    >
      <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        :id="id"
        ref="panel"
        role="tooltip"
        class="fixed z-[9998] w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-cyan-500/40 bg-slate-900/95 backdrop-blur-md shadow-2xl p-3.5 text-left animate-fade-in"
        :style="{ top: pos.top + 'px', left: pos.left + 'px' }"
        @mouseenter="show"
        @mouseleave="scheduleHide"
      >
        <div v-if="$slots.title" class="font-heading text-sm font-bold text-slate-100 mb-2 tracking-tight">
          <slot name="title"></slot>
        </div>

        <dl class="space-y-1 text-sm">
          <div
            v-for="(line, i) in lines"
            :key="i"
            class="flex items-baseline justify-between gap-3"
            :class="line.op === '=' ? 'pt-1.5 mt-1.5 border-t border-slate-700 font-semibold text-slate-50' : 'text-slate-300'"
          >
            <dt class="min-w-0 flex items-baseline gap-1.5">
              <span v-if="line.op" class="w-3 shrink-0 text-center font-mono text-cyan-400" aria-hidden="true">{{ line.op }}</span>
              <span class="min-w-0">{{ line.label }}</span>
            </dt>
            <dd class="shrink-0 tabular-nums whitespace-nowrap" :class="line.op === '=' ? 'text-cyan-300' : ''">{{ line.value }}</dd>
          </div>
        </dl>

        <p v-if="formula" class="mt-2.5 pt-2 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
          {{ formula }}
        </p>
        <slot></slot>
      </div>
    </Teleport>
  </span>
</template>

<script setup>
// Infobulle de détail de calcul : lignes { op, label, value } + formule. Aucun texte en dur (i18n côté app).
import { ref, reactive, nextTick, onBeforeUnmount } from 'vue'

defineProps({
  // [{ op: '+' | '−' | '×' | '÷' | '=' | '', label: String, value: String }]
  lines: { type: Array, default: () => [] },
  formula: { type: String, default: '' },
  triggerLabel: { type: String, default: '' },
})

const id = `cn-formula-${Math.random().toString(36).slice(2, 9)}`
const open = ref(false)
const trigger = ref(null)
const panel = ref(null)
const pos = reactive({ top: 0, left: 0 })
let hideTimer = 0

async function place() {
  await nextTick()
  const t = trigger.value?.getBoundingClientRect()
  const p = panel.value?.getBoundingClientRect()
  if (!t || !p) return
  const margin = 12
  let left = t.left + t.width / 2 - p.width / 2
  left = Math.max(margin, Math.min(left, window.innerWidth - p.width - margin))
  let top = t.bottom + 8
  if (top + p.height > window.innerHeight - margin) top = Math.max(margin, t.top - p.height - 8)
  pos.left = left
  pos.top = top
}

function onOutside(e) {
  if (!trigger.value?.contains(e.target) && !panel.value?.contains(e.target)) hide()
}

function show() {
  clearTimeout(hideTimer)
  if (open.value) return
  open.value = true
  place()
  window.addEventListener('scroll', place, true)
  window.addEventListener('resize', place)
  document.addEventListener('click', onOutside)
}

function hide() {
  clearTimeout(hideTimer)
  open.value = false
  window.removeEventListener('scroll', place, true)
  window.removeEventListener('resize', place)
  document.removeEventListener('click', onOutside)
}

function scheduleHide() {
  clearTimeout(hideTimer)
  hideTimer = setTimeout(hide, 120)
}

onBeforeUnmount(hide)
</script>
