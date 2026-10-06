<template>
  <div class="space-y-4 font-sans">
    <!-- RACI Filter Controls -->
    <div class="glass-panel rounded-2xl p-3 sm:p-4 border border-slate-800/90 flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 shadow-sm">
      
      <!-- Role Selector -->
      <div class="flex flex-wrap items-center gap-2.5 min-w-0">
        <label for="raci-role-select" class="text-xs sm:text-sm font-semibold text-slate-300 whitespace-nowrap flex items-center gap-1.5">
          <Filter class="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
          <span>{{ roleLabel || 'Filtrer par rôle :' }}</span>
        </label>
        <select 
          id="raci-role-select"
          v-model="selectedRole"
          class="cn-input !py-1.5 !px-3 text-xs sm:text-sm !w-auto max-w-full font-medium"
        >
          <option value="ALL">{{ t('cyber_raci_all', 'Tous les rôles (Vue complète)') }}</option>
          <option v-for="role in roles" :key="role.key" :value="role.key">
            {{ role.label }}
          </option>
        </select>
      </div>

      <!-- RACI Letter Filter Badges -->
      <div class="flex items-center gap-1.5 sm:gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800/80 flex-wrap">
        <span class="text-xs text-slate-400 font-bold px-1 whitespace-nowrap">{{ t('cyber_raci_show', 'AFFICHER :') }}</span>
        
        <button
          type="button"
          @click="filters.R = !filters.R"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none"
          :class="filters.R ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60 shadow-sm' : 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60 hover:opacity-100'"
          :title="t('cyber_raci_r', '(Réalisateur)')"
        >
          <span class="font-mono font-bold text-xs">R</span>
          <span class="hidden sm:inline text-[11px] font-normal text-slate-300">{{ t('cyber_raci_r', 'Réalisateur') }}</span>
        </button>

        <button
          type="button"
          @click="filters.A = !filters.A"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none"
          :class="filters.A ? 'bg-rose-500/20 text-rose-200 border-rose-400/60 shadow-sm' : 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60 hover:opacity-100'"
          :title="t('cyber_raci_a', '(Approbateur)')"
        >
          <span class="font-mono font-bold text-xs">A</span>
          <span class="hidden sm:inline text-[11px] font-normal text-slate-300">{{ t('cyber_raci_a', 'Approbateur') }}</span>
        </button>

        <button
          type="button"
          @click="filters.C = !filters.C"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none"
          :class="filters.C ? 'bg-amber-500/20 text-amber-200 border-amber-400/60 shadow-sm' : 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60 hover:opacity-100'"
          :title="t('cyber_raci_c', '(Consulté)')"
        >
          <span class="font-mono font-bold text-xs">C</span>
          <span class="hidden sm:inline text-[11px] font-normal text-slate-300">{{ t('cyber_raci_c', 'Consulté') }}</span>
        </button>

        <button
          type="button"
          @click="filters.I = !filters.I"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none"
          :class="filters.I ? 'bg-slate-800/80 text-slate-200 border-slate-700 shadow-sm' : 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60 hover:opacity-100'"
          :title="t('cyber_raci_i', '(Informé)')"
        >
          <span class="font-mono font-bold text-xs">I</span>
          <span class="hidden sm:inline text-[11px] font-normal text-slate-300">{{ t('cyber_raci_i', 'Informé') }}</span>
        </button>
      </div>
    </div>

    <!-- The Matrix Table Container -->
    <div class="cn-table-wrap overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70 shadow-inner">
      <table class="w-full table-fixed border-collapse text-sm" :class="selectedRole === 'ALL' ? 'min-w-[42rem] md:min-w-[48rem]' : 'min-w-[26rem]'">
        <colgroup>
          <col :class="selectedRole === 'ALL' ? 'w-56 md:w-[36%]' : 'w-[55%]'" />
          <template v-if="selectedRole === 'ALL'"><col v-for="role in roles" :key="role.key" class="w-20 md:w-auto" /></template>
          <col v-else class="w-44" />
          <col v-if="hasRationale" class="w-[30%]" />
        </colgroup>
        <thead>
          <tr class="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
            <th scope="col" class="sticky left-0 z-10 bg-slate-900 py-3.5 px-4 text-left align-middle text-xs font-bold uppercase tracking-wider text-cyan-400 shadow-[1px_0_0_rgb(var(--c-slate-800))]">
              {{ activityLabel || 'Activité / Jalon' }}
            </th>
            <th
              v-for="role in visibleRoles"
              :key="role.key"
              scope="col"
              class="py-3 px-2 text-center align-middle transition-colors border-l border-slate-800/60"
              :class="[selectedRole !== 'ALL' && 'bg-cyan-500/15', hoveredRole === role.key && 'bg-cyan-500/10']"
            >
              <div class="flex flex-col items-center justify-center min-h-[42px] leading-tight">
                <span class="font-heading text-xs sm:text-sm font-bold text-slate-100 tracking-wide">{{ splitRole(role.label).main }}</span>
                <span v-if="splitRole(role.label).sub" class="text-[11px] font-medium text-cyan-400 mt-0.5">{{ splitRole(role.label).sub }}</span>
              </div>
            </th>
            <th v-if="hasRationale" scope="col" class="py-3.5 px-4 text-left align-middle text-xs font-bold uppercase tracking-wider text-slate-400 border-l border-slate-800/60">
              {{ rationaleLabel || 'Justification & Enjeux' }}
            </th>
          </tr>
        </thead>
        <tbody class="font-sans divide-y divide-slate-800/60">
          <tr
            v-for="(row, idx) in filteredData"
            :key="idx"
            class="group transition-colors hover:bg-slate-800/40"
            :class="idx % 2 === 0 ? 'bg-slate-950/40' : 'bg-transparent'"
          >
            <th scope="row" class="sticky left-0 z-10 bg-slate-950 group-hover:bg-slate-900/90 py-3.5 px-4 text-left font-medium text-slate-100 leading-snug shadow-[1px_0_0_rgb(var(--c-slate-800))] transition-colors">
              <span class="block text-sm font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors">{{ row.activity }}</span>
              <span v-if="row.phase" class="block text-xs font-normal text-slate-400 mt-0.5">{{ row.phase }}</span>
            </th>
            <td
              v-for="role in visibleRoles"
              :key="role.key"
              class="py-3 px-2 text-center align-middle transition-colors border-l border-slate-800/40"
              :class="[selectedRole !== 'ALL' && 'bg-cyan-500/10', hoveredRole === role.key && 'bg-cyan-500/[0.07]']"
              @mouseenter="hoveredRole = role.key"
              @mouseleave="hoveredRole = ''"
            >
              <span
                v-if="row[role.key] && filters[row[role.key]]"
                class="inline-flex items-center justify-center w-8 h-8 min-w-[2rem] max-w-[2rem] min-h-[2rem] max-h-[2rem] shrink-0 rounded-lg border font-mono text-sm font-bold tracking-tight select-none shadow-sm transition-all duration-150 hover:scale-110"
                :class="getBadgeClass(row[role.key])"
              >{{ row[role.key] }}</span>
              <span v-else class="inline-flex items-center justify-center w-8 h-8 min-w-[2rem] min-h-[2rem] text-slate-600 font-mono text-xs select-none" aria-hidden="true">·</span>
            </td>
            <td v-if="hasRationale" class="py-3.5 px-4 text-slate-300 text-xs sm:text-sm whitespace-normal leading-relaxed border-l border-slate-800/40">
              {{ row.rationale }}
            </td>
          </tr>
          <tr v-if="filteredData.length === 0">
            <td :colspan="(selectedRole === 'ALL' ? roles.length + 1 : 2) + (hasRationale ? 1 : 0)" class="py-10 text-center text-slate-400 text-sm">
              {{ t('cyber_raci_empty', 'Aucune activité ne correspond aux filtres.') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend & Stats Footer -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
      <div class="flex items-center gap-3 sm:gap-4 flex-wrap">
        <span class="font-bold text-slate-300">{{ t('cyber_raci_legend', 'Légende :') }}</span>
        <span class="inline-flex items-center gap-1.5 text-cyan-300 font-medium">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 font-mono font-bold text-[11px]">R</span>
          {{ t('cyber_raci_leg_r', 'R = Réalisateur') }}
        </span>
        <span class="inline-flex items-center gap-1.5 text-rose-300 font-medium">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-md bg-rose-500/20 text-rose-200 border border-rose-400/50 font-mono font-bold text-[11px]">A</span>
          {{ t('cyber_raci_leg_a', 'A = Approbateur') }}
        </span>
        <span class="inline-flex items-center gap-1.5 text-amber-300 font-medium">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-500/20 text-amber-200 border border-amber-500/40 font-mono font-bold text-[11px]">C</span>
          {{ t('cyber_raci_leg_c', 'C = Consulté') }}
        </span>
        <span class="inline-flex items-center gap-1.5 text-slate-300 font-medium">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-800/80 text-slate-200 border border-slate-700 font-mono font-bold text-[11px]">I</span>
          {{ t('cyber_raci_leg_i', 'I = Informé') }}
        </span>
      </div>
      <div class="text-xs">
        <span class="font-bold text-cyan-300">{{ filteredData.length }}</span> / {{ data.length }} {{ t('cyber_raci_shown', 'activités affichées') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Filter } from 'lucide-vue-next'

const props = defineProps({
  data: { type: Array, required: true },
  roles: { type: Array, required: true },
  t: { type: Function, default: (k, def) => def || k },
  activityLabel: { type: String, default: 'Activité / Jalon' },
  roleLabel: { type: String, default: 'Filtrer par rôle :' },
  rationaleLabel: { type: String, default: 'Justification & Enjeux' },
  storagePrefix: { type: String, default: 'cyber_raci' }
})

const selectedRole = ref(localStorage.getItem(`${props.storagePrefix}_role`) || 'ALL')
const filters = ref({
  R: true, A: true, C: true, I: true
})

try {
  const savedFilters = localStorage.getItem(`${props.storagePrefix}_filters`)
  if (savedFilters) {
    filters.value = JSON.parse(savedFilters)
  }
} catch (e) {}

watch(selectedRole, (val) => localStorage.setItem(`${props.storagePrefix}_role`, val))
watch(filters, (val) => localStorage.setItem(`${props.storagePrefix}_filters`, JSON.stringify(val)), { deep: true })

const hoveredRole = ref('')

// Colonnes affichées : tous les rôles, ou seulement le rôle filtré
const visibleRoles = computed(() =>
  selectedRole.value === 'ALL' ? props.roles : props.roles.filter(r => r.key === selectedRole.value)
)

// « DG (Sophie) » → rôle sur la 1re ligne, personne sur la 2de
function splitRole(label) {
  const m = /^(.*?)\s*\((.+)\)\s*$/.exec(label || '')
  return m ? { main: m[1], sub: m[2] } : { main: label, sub: '' }
}

const currentRoleLabel = computed(() => {
  const r = props.roles.find(x => x.key === selectedRole.value)
  return r ? r.label : ''
})

// La colonne de justification n'apparaît que si au moins une ligne en fournit une
const hasRationale = computed(() => props.data.some(row => row.rationale))

const filteredData = computed(() => {
  return props.data
})

function getBadgeClass(letter) {
  if (letter === 'A') return 'bg-rose-500/25 text-rose-200 border-rose-400/70 shadow-glow-rose'
  if (letter === 'R') return 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60 shadow-glow-cyan'
  if (letter === 'C') return 'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-glow-amber'
  return 'bg-slate-800/90 text-slate-200 border-slate-700/90'
}
</script>
