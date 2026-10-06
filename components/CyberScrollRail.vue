<template>
  <div class="relative min-w-0">
    <div
      ref="track"
      class="flex flex-row flex-nowrap overflow-x-auto no-scrollbar overscroll-x-contain"
      :class="trackClass"
      @scroll.passive="update"
      @wheel="onWheel"
    >
      <slot></slot>
    </div>

    <!-- Contrôles de bord : survol = défilement continu, clic = une page.
         Masqués des technologies d'assistance : le clavier parcourt déjà les éléments. -->
    <button
      v-for="side in SIDES"
      v-show="side.dir < 0 ? canLeft : canRight"
      :key="side.dir"
      type="button"
      tabindex="-1"
      aria-hidden="true"
      class="absolute inset-y-0 z-10 flex items-center w-10 sm:w-12 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
      :class="[side.dir < 0 ? 'left-0 justify-start bg-gradient-to-r' : 'right-0 justify-end bg-gradient-to-l', fadeClass]"
      @mouseenter="startHover(side.dir)"
      @mouseleave="stopHover"
      @click="scrollPage(side.dir)"
    >
      <span class="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900/90 border border-slate-700 shadow-lg">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path :d="side.dir < 0 ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'" />
        </svg>
      </span>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  // Classes de la piste interne (gap, alignement, marges…)
  trackClass: { type: [String, Array, Object], default: 'items-center gap-1' },
  // Dégradé des contrôles, à accorder au fond du conteneur
  fadeClass: { type: String, default: 'from-slate-900 via-slate-900/80 to-transparent' },
  // Vitesse du défilement au survol (px/s)
  speed: { type: Number, default: 480 },
  // Molette verticale convertie en défilement horizontal quand la piste déborde
  wheel: { type: Boolean, default: true },
  // Élément actif à garder visible
  activeSelector: { type: String, default: '[aria-current="page"], [aria-selected="true"], [aria-checked="true"], .cn-tab-active, .cn-seg-item-active, .cn-chip-active' },
})

const SIDES = [{ dir: -1 }, { dir: 1 }]

const track = ref(null)
const canLeft = ref(false)
const canRight = ref(false)

let rafId = 0
let lastTs = 0
let hoverDir = 0
let resizeObs = null
let mutationObs = null

function update() {
  const el = track.value
  if (!el) return
  const max = el.scrollWidth - el.clientWidth
  canLeft.value = el.scrollLeft > 1
  canRight.value = el.scrollLeft < max - 1
  if (hoverDir && !(hoverDir < 0 ? canLeft.value : canRight.value)) stopHover()
}

function step(ts) {
  const el = track.value
  if (!el || !hoverDir) return
  const dt = lastTs ? Math.min(ts - lastTs, 50) : 16
  lastTs = ts
  el.scrollLeft += hoverDir * props.speed * dt / 1000
  update()
  if (hoverDir) rafId = requestAnimationFrame(step)
}

function startHover(dir) {
  stopHover()
  hoverDir = dir
  lastTs = 0
  rafId = requestAnimationFrame(step)
}

function stopHover() {
  hoverDir = 0
  cancelAnimationFrame(rafId)
}

function scrollPage(dir) {
  const el = track.value
  if (!el) return
  stopHover()
  el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
}

function onWheel(e) {
  const el = track.value
  if (!props.wheel || !el || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
  const max = el.scrollWidth - el.clientWidth
  if (max <= 0) return
  const next = el.scrollLeft + e.deltaY
  if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max)) return
  e.preventDefault()
  el.scrollLeft = Math.max(0, Math.min(max, next))
}

// Dernier élément actif ramené dans la vue : une mutation qui ne change pas l'actif ne fait pas défiler
let lastActive = null

function revealActive(force = false) {
  const el = track.value
  const active = el?.querySelector(props.activeSelector) || null
  if (!force && active === lastActive) return
  lastActive = active
  if (!active) return
  const a = active.getBoundingClientRect()
  const t = el.getBoundingClientRect()
  const margin = 48
  if (a.left < t.left + margin) el.scrollBy({ left: a.left - t.left - margin, behavior: 'smooth' })
  else if (a.right > t.right - margin) el.scrollBy({ left: a.right - t.right + margin, behavior: 'smooth' })
}

let unmounted = false

onMounted(async () => {
  await nextTick()
  const el = track.value
  // Démonté pendant l'attente, ou piste absente
  if (!el || unmounted) return
  if (typeof ResizeObserver === 'function') {
    resizeObs = new ResizeObserver(update)
    resizeObs.observe(el)
    for (const child of el.children) resizeObs.observe(child)
  }
  if (typeof MutationObserver === 'function') {
    mutationObs = new MutationObserver((records) => {
      update()
      // Nouveaux enfants : la taille de la piste change aussi
      if (resizeObs) records.forEach((r) => r.addedNodes.forEach((n) => n.nodeType === 1 && n.parentNode === el && resizeObs.observe(n)))
      revealActive()
    })
    mutationObs.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-current', 'aria-selected', 'aria-checked'] })
  }
  update()
  revealActive(true)
})

onBeforeUnmount(() => {
  unmounted = true
  stopHover()
  resizeObs?.disconnect()
  mutationObs?.disconnect()
  lastActive = null
})
</script>
