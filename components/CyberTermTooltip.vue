<template>
  <Teleport to="body">
    <div 
      ref="tooltipRef"
      role="tooltip"
      v-if="isVisible && termData"
      class="fixed z-[9999] p-4 w-72 rounded-xl bg-slate-900 border border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-opacity duration-300 pointer-events-none"
      :style="{ left: position.x + 'px', top: position.y + 'px', opacity: isCalculated ? 1 : 0 }"
    >
      <div class="flex items-center gap-2 mb-2">
        <span class="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
        <h4 class="font-bold text-cyan-300 text-sm font-mono leading-tight">
          {{ termData.term || termData.acronym || termData.fullName || termData.id }}
        </h4>
      </div>
      <p class="text-xs text-slate-300 leading-relaxed">
        {{ termData.shortDef || termData.definition }}
      </p>
      <div v-if="termData.category" class="mt-2 text-xs text-slate-400 uppercase tracking-wider font-bold">
        {{ categoryLabel ? `${categoryLabel} : ` : '' }}{{ termData.category }}
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'

defineProps({
  // Libellé traduit fourni par l'application (aucun texte en dur dans la lib)
  categoryLabel: { type: String, default: '' }
})

const isVisible = ref(false)
const isCalculated = ref(false)
const tooltipRef = ref(null)
const termData = ref(null)
const position = reactive({ x: 0, y: 0 })

let glossaryDb = null
let hoverTimer = null
let debounceTimer = null
let currentWord = null
let lastMouseX = 0
let lastMouseY = 0

async function loadGlossary() {
  if (glossaryDb) return glossaryDb
  try {
    const baseUrl = import.meta.env?.BASE_URL || '/'
    const path = baseUrl.endsWith('/') ? baseUrl + 'api/glossary.json' : baseUrl + '/api/glossary.json'
    const res = await fetch(path)
    if (res.ok) {
      glossaryDb = await res.json()
      return glossaryDb
    }
  } catch (e) {
    console.error("CyberTermTooltip: Erreur chargement lexique:", e)
  }
  return []
}

// Alias d'une entrée : « RSSI / CISO » → rssi, ciso (« RGPD art. 28 » est trouvé par préfixe) ;
// identifiant cert_fr → cert-fr. Le terme principal (avant « ( ») reste comparé en préfixe.
function aliasesOf(t) {
  const out = new Set()
  for (const raw of [t.id, t.acronym, t.term, t.fullName]) {
    if (!raw) continue
    const base = String(raw).split(' (')[0].toLowerCase().trim().replace(/_/g, '-')
    out.add(base)
    for (const part of base.split('/')) {
      const p = part.trim()
      if (p) out.add(p)
    }
  }
  return [...out]
}

function findTerm(db, word) {
  const q = word.toLowerCase()
  // Pluriel anglais/français des sigles : IoCs → IoC, TTPs → TTP, FQDNs → FQDN
  const candidates = q.length > 3 && q.endsWith('s') ? [q, q.slice(0, -1)] : [q]
  for (const c of candidates) {
    const hit = db.find(t => aliasesOf(t).some(a => a === c || a.startsWith(c + ' ') || a.startsWith(c + '-')))
    if (hit) return hit
  }
  return null
}

function getWordUnderCursor(x, y) {
  let range, textNode, offset;
  
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (!pos) return null;
    textNode = pos.offsetNode;
    offset = pos.offset;
  } else if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
    if (!range) return null;
    textNode = range.startContainer;
    offset = range.startOffset;
  } else {
    return null;
  }

  if (!textNode || textNode.nodeType !== 3) return null;

  const data = textNode.data;
  if (!data) return null;

  const regex = /[a-zA-Z0-9\-éàèùâêîôûçÉÀÈÙÂÊÎÔÛÇ]/;
  
  if (!regex.test(data[offset]) && offset > 0 && !regex.test(data[offset - 1])) {
    return null;
  }

  let start = offset;
  while (start > 0 && regex.test(data[start - 1])) {
    start--;
  }
  
  let end = offset;
  while (end < data.length && regex.test(data[end])) {
    end++;
  }

  const word = data.slice(start, end).trim();
  return word.length > 1 ? word : null;
}

function handleMouseMove(e) {
  const x = e.clientX;
  const y = e.clientY;
  
  const word = getWordUnderCursor(x, y);
  
  lastMouseX = x;
  lastMouseY = y;

  // Si du texte est sélectionné, on réduit le timer, sinon 1500ms par défaut
  const waitTime = 1000;

  if (word === currentWord) {
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (word !== currentWord) {
      currentWord = word;
      isVisible.value = false;
      isCalculated.value = false;
      clearTimeout(hoverTimer);

      if (word) {
        hoverTimer = setTimeout(async () => {
          const db = await loadGlossary()
          const q = word.toLowerCase()
          
          const found = findTerm(db, word)

          if (found) {
            termData.value = found
            isCalculated.value = false
            isVisible.value = true
            
            nextTick(() => {
              if (tooltipRef.value) {
                const rect = tooltipRef.value.getBoundingClientRect()
                const tw = rect.width
                const th = rect.height
                const padding = 15

                let finalX = lastMouseX - (tw / 2)
                let finalY = lastMouseY - 15 - th

                // Contraintes horizontales
                if (finalX < padding) finalX = padding
                if (finalX + tw > window.innerWidth - padding) {
                  finalX = window.innerWidth - tw - padding
                }

                // Contraintes verticales (s'il n'y a pas la place en haut, on met en bas)
                if (finalY < padding) {
                  finalY = lastMouseY + 25
                  if (finalY + th > window.innerHeight - padding) {
                    finalY = window.innerHeight - th - padding
                  }
                }

                position.x = finalX
                position.y = finalY
                isCalculated.value = true
              }
            })
          }
        }, waitTime)
      }
    }
  }, 150)
}

function handleMouseOut() {
  clearTimeout(debounceTimer)
  clearTimeout(hoverTimer)
  isVisible.value = false
  isCalculated.value = false
  currentWord = null
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseleave', handleMouseOut)
  document.addEventListener('scroll', handleMouseOut, true)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseleave', handleMouseOut)
  document.removeEventListener('scroll', handleMouseOut, true)
  clearTimeout(debounceTimer)
  clearTimeout(hoverTimer)
})
</script>
