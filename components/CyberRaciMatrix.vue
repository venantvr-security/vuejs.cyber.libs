<template>
  <div class="space-y-4">
    <!-- RACI Filter Controls -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-3 sm:p-4 rounded-xl border border-slate-800">
      
      <!-- Role Selector -->
      <div class="flex items-center gap-3">
        <label class="text-sm font-bold text-slate-300 whitespace-nowrap">{{ roleLabel || 'Filtrer par rôle :' }}</label>
        <select 
          v-model="selectedRole"
          class="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2 max-w-xs"
        >
          <option value="ALL">{{ t('cyber_raci_all') }}</option>
          <option v-for="role in roles" :key="role.key" :value="role.key">
            {{ role.label }}
          </option>
        </select>
      </div>

      <!-- RACI Letter Checkboxes -->
      <div class="flex items-center gap-3 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 overflow-x-auto">
        <span class="text-xs text-slate-400 font-bold px-1 whitespace-nowrap">{{ t('cyber_raci_show') }}</span>
        <label class="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
          <input type="checkbox" v-model="filters.R" class="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/30 bg-slate-800 w-4 h-4 cursor-pointer">
          <span class="text-sm font-bold text-slate-300 group-hover:text-cyan-300 transition-colors">R <span class="hidden sm:inline font-normal text-xs text-slate-400">{{ t('cyber_raci_r') }}</span></span>
        </label>
        <div class="w-px h-4 bg-slate-700"></div>
        <label class="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
          <input type="checkbox" v-model="filters.A" class="rounded border-slate-600 text-rose-500 focus:ring-rose-500/30 bg-slate-800 w-4 h-4 cursor-pointer">
          <span class="text-sm font-bold text-slate-300 group-hover:text-rose-300 transition-colors">A <span class="hidden sm:inline font-normal text-xs text-slate-400">{{ t('cyber_raci_a') }}</span></span>
        </label>
        <div class="w-px h-4 bg-slate-700"></div>
        <label class="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
          <input type="checkbox" v-model="filters.C" class="rounded border-slate-600 text-amber-500 focus:ring-amber-500/30 bg-slate-800 w-4 h-4 cursor-pointer">
          <span class="text-sm font-bold text-slate-300 group-hover:text-amber-300 transition-colors">C <span class="hidden sm:inline font-normal text-xs text-slate-400">{{ t('cyber_raci_c') }}</span></span>
        </label>
        <div class="w-px h-4 bg-slate-700"></div>
        <label class="flex items-center gap-2 cursor-pointer group whitespace-nowrap">
          <input type="checkbox" v-model="filters.I" class="rounded border-slate-600 text-slate-400 focus:ring-slate-400/30 bg-slate-800 w-4 h-4 cursor-pointer">
          <span class="text-sm font-bold text-slate-300 group-hover:text-slate-100 transition-colors">I <span class="hidden sm:inline font-normal text-xs text-slate-400">{{ t('cyber_raci_i') }}</span></span>
        </label>
      </div>
    </div>

    <!-- The Matrix -->
    <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-slate-800 bg-slate-900/90 text-slate-300">
            <th class="py-3 px-4">{{ activityLabel || 'Activité / Jalon' }}</th>
            <template v-if="selectedRole === 'ALL'">
              <th 
                v-for="role in roles" 
                :key="role.key"
                class="py-3 px-2 text-center w-20 transition-colors whitespace-nowrap"
              >
                {{ role.label }}
              </th>
            </template>
            <template v-else>
              <th class="py-3 px-2 text-center w-24 bg-cyan-500/25 text-cyan-200 font-bold border-x border-cyan-500/40 whitespace-nowrap">
                {{ currentRoleLabel }}
              </th>
            </template>
            <th v-if="hasRationale" class="py-3 px-4">{{ rationaleLabel || 'Justification & Enjeux' }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60 font-sans">
          <tr v-for="(row, idx) in filteredData" :key="idx" class="hover:bg-slate-800/30 transition-colors">
            <td class="py-2.5 px-4 font-medium text-slate-200">
              <div>{{ row.activity }}</div>
              <div v-if="row.phase" class="text-xs text-slate-400 mt-0.5">{{ row.phase }}</div>
            </td>
            
            <template v-if="selectedRole === 'ALL'">
              <td 
                v-for="role in roles" 
                :key="role.key"
                class="py-2.5 px-2 text-center transition-colors"
              >
                <span 
                  v-if="filters[row[role.key]]"
                  class="inline-block w-6 h-6 leading-6 rounded-md text-xs border shadow-sm transition-all" 
                  :class="getBadgeClass(row[role.key])"
                >
                  {{ row[role.key] }}
                </span>
                <span v-else class="inline-block w-6 h-6 leading-6 text-transparent select-none">·</span>
              </td>
            </template>
            <template v-else>
              <td class="py-2.5 px-2 text-center transition-colors bg-cyan-500/10 border-x border-cyan-500/25">
                <span 
                  v-if="filters[row[selectedRole]]"
                  class="inline-block w-6 h-6 leading-6 rounded-md text-xs border shadow-sm transition-all" 
                  :class="getBadgeClass(row[selectedRole])"
                >
                  {{ row[selectedRole] }}
                </span>
                <span v-else class="inline-block w-6 h-6 leading-6 text-transparent select-none">·</span>
              </td>
            </template>

            <td v-if="hasRationale" class="py-2.5 px-4 text-slate-400 whitespace-normal leading-relaxed min-w-[16rem]">
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
        <span class="font-bold text-cyan-300">{{ filteredData.length }}</span> / {{ data.length }} affichées
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
  if (letter === 'A') return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  if (letter === 'R') return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  if (letter === 'C') return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  if (letter === 'I') return 'bg-slate-800 text-slate-400 border-slate-700'
  return ''
}
</script>
