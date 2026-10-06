<template>
  <div class="space-y-4">
    <!-- RACI Filter Controls -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-3 sm:p-4 rounded-xl border border-slate-800">
      
      <!-- Role Selector -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
        <label class="text-sm font-bold text-slate-300 whitespace-nowrap">{{ roleLabel || 'Filtrer par rôle :' }}</label>
        <select 
          v-model="selectedRole"
          class="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-auto max-w-full p-2"
        >
          <option value="ALL">{{ t('cyber_raci_all') }}</option>
          <option v-for="role in roles" :key="role.key" :value="role.key">
            {{ role.label }}
          </option>
        </select>
      </div>

      <!-- RACI Letter Checkboxes -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
        <span class="text-xs text-slate-400 font-bold px-1 whitespace-nowrap">{{ t('cyber_raci_show') }}</span>
        <label class="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
          <input type="checkbox" v-model="filters.R" class="accent-cyan-500 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/30 bg-slate-800 w-4 h-4 cursor-pointer">
          <span class="text-sm font-bold text-slate-300 group-hover:text-cyan-300 transition-colors">R <span class="hidden sm:inline font-normal text-xs text-slate-400">{{ t('cyber_raci_r') }}</span></span>
        </label>
        <div class="w-px h-4 bg-slate-700"></div>
        <label class="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
          <input type="checkbox" v-model="filters.A" class="accent-rose-500 rounded border-slate-600 text-rose-500 focus:ring-rose-500/30 bg-slate-800 w-4 h-4 cursor-pointer">
          <span class="text-sm font-bold text-slate-300 group-hover:text-rose-300 transition-colors">A <span class="hidden sm:inline font-normal text-xs text-slate-400">{{ t('cyber_raci_a') }}</span></span>
        </label>
        <div class="w-px h-4 bg-slate-700"></div>
        <label class="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
          <input type="checkbox" v-model="filters.C" class="accent-amber-500 rounded border-slate-600 text-amber-500 focus:ring-amber-500/30 bg-slate-800 w-4 h-4 cursor-pointer">
          <span class="text-sm font-bold text-slate-300 group-hover:text-amber-300 transition-colors">C <span class="hidden sm:inline font-normal text-xs text-slate-400">{{ t('cyber_raci_c') }}</span></span>
        </label>
        <div class="w-px h-4 bg-slate-700"></div>
        <label class="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
          <input type="checkbox" v-model="filters.I" class="accent-slate-400 rounded border-slate-600 text-slate-400 focus:ring-slate-400/30 bg-slate-800 w-4 h-4 cursor-pointer">
          <span class="text-sm font-bold text-slate-300 group-hover:text-slate-100 transition-colors">I <span class="hidden sm:inline font-normal text-xs text-slate-400">{{ t('cyber_raci_i') }}</span></span>
        </label>
      </div>
    </div>

    <!-- The Matrix -->
    <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
      <table class="w-full table-fixed border-collapse text-sm" :class="selectedRole === 'ALL' ? 'min-w-[38rem] md:min-w-[44rem]' : 'min-w-[22rem]'">
        <colgroup>
          <col :class="selectedRole === 'ALL' ? 'w-44 md:w-[34%]' : 'w-[55%]'" />
          <template v-if="selectedRole === 'ALL'"><col v-for="role in roles" :key="role.key" /></template>
          <col v-else class="w-40" />
          <col v-if="hasRationale" class="w-[30%]" />
        </colgroup>
        <thead>
          <tr class="border-b border-slate-800 bg-slate-900/90">
            <th scope="col" class="sticky left-0 z-10 bg-slate-900 py-3 px-3 sm:px-4 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-slate-400 shadow-[1px_0_0_rgb(var(--c-slate-800))]">
              {{ activityLabel || 'Activité / Jalon' }}
            </th>
            <th
              v-for="role in visibleRoles"
              :key="role.key"
              scope="col"
              class="py-3 px-1.5 text-center align-bottom transition-colors"
              :class="[selectedRole !== 'ALL' && 'bg-cyan-500/15', hoveredRole === role.key && 'bg-cyan-500/10']"
            >
              <span class="block font-heading text-sm font-bold text-slate-100 leading-tight">{{ splitRole(role.label).main }}</span>
              <span v-if="splitRole(role.label).sub" class="block text-xs font-normal text-slate-400 leading-tight mt-0.5">{{ splitRole(role.label).sub }}</span>
            </th>
            <th v-if="hasRationale" scope="col" class="py-3 px-4 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-slate-400">
              {{ rationaleLabel || 'Justification & Enjeux' }}
            </th>
          </tr>
        </thead>
        <tbody class="font-sans">
          <tr
            v-for="(row, idx) in filteredData"
            :key="idx"
            class="group border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 transition-colors"
          >
            <th scope="row" class="sticky left-0 z-10 bg-slate-950 group-hover:bg-slate-900 py-3 px-3 sm:px-4 text-left font-medium text-slate-100 leading-snug shadow-[1px_0_0_rgb(var(--c-slate-800))] transition-colors">
              <span class="block">{{ row.activity }}</span>
              <span v-if="row.phase" class="block text-xs font-normal text-slate-400 mt-0.5">{{ row.phase }}</span>
            </th>
            <td
              v-for="role in visibleRoles"
              :key="role.key"
              class="py-2 px-1.5 text-center transition-colors"
              :class="[selectedRole !== 'ALL' && 'bg-cyan-500/10', hoveredRole === role.key && 'bg-cyan-500/[0.07]']"
              @mouseenter="hoveredRole = role.key"
              @mouseleave="hoveredRole = ''"
            >
              <span
                v-if="row[role.key] && filters[row[role.key]]"
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg border font-heading text-sm font-bold transition-transform hover:scale-110"
                :class="getBadgeClass(row[role.key])"
              >{{ row[role.key] }}</span>
              <span v-else class="inline-block w-8 h-8" aria-hidden="true"></span>
            </td>
            <td v-if="hasRationale" class="py-3 px-4 text-slate-400 whitespace-normal leading-relaxed">
              {{ row.rationale }}
            </td>
          </tr>
          <tr v-if="filteredData.length === 0">
            <td :colspan="(selectedRole === 'ALL' ? roles.length + 1 : 2) + (hasRationale ? 1 : 0)" class="py-6 text-center text-slate-400 text-xs">
              {{ t('cyber_raci_empty') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 pt-1">
      <div class="flex items-center gap-3 flex-wrap">
        <span>{{ t('cyber_raci_legend') }}</span>
        <span class="text-cyan-300 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-cyan-400"></span>{{ t('cyber_raci_leg_r') }}</span>
        <span class="text-rose-300 font-bold flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-400"></span>{{ t('cyber_raci_leg_a') }}</span>
        <span class="text-amber-300 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400"></span>{{ t('cyber_raci_leg_c') }}</span>
        <span class="text-slate-400 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-slate-500"></span>{{ t('cyber_raci_leg_i') }}</span>
      </div>
      <div>
        <span class="font-bold text-cyan-300">{{ filteredData.length }}</span> / {{ data.length }} {{ t('cyber_raci_shown') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  data: { type: Array, required: true },
  roles: { type: Array, required: true },
  t: { type: Function, default: (k, def) => def },
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
  if (letter === 'A') return 'bg-rose-500/25 text-rose-200 border-rose-400/60 shadow-glow-rose'
  if (letter === 'R') return 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50'
  if (letter === 'C') return 'bg-amber-500/10 text-amber-300 border-amber-500/35'
  return 'bg-transparent text-slate-500 border-dashed border-slate-700'
}

</script>
