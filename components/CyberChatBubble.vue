<template>
  <article
    class="flex items-start gap-2 sm:gap-3 animate-fade-in"
    :aria-label="ariaLabel || undefined"
    :data-actor="actorId || undefined"
    :data-intent="intent || undefined"
  >
    <slot name="avatar" :actor="actor">
      <div
        aria-hidden="true"
        class="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full grid place-items-center text-base sm:text-xl bg-slate-800/80 border-2 select-none"
        :class="mood.ring"
      >{{ actor?.avatar || '' }}</div>
    </slot>

    <div class="min-w-0 flex-1 max-w-[calc(100%-2.5rem)] sm:max-w-[80%]">
      <header class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1 text-xs">
        <span class="font-semibold text-slate-100 truncate max-w-full">{{ actor?.name || actorId }}</span>
        <span v-if="actor?.role" class="text-slate-400 truncate hidden sm:inline">{{ actor.role }}</span>
        <span v-if="sentimentLabel" class="cn-pill !py-0 !px-1.5 text-tiny" :class="mood.pill">{{ sentimentLabel }}</span>
        <span v-if="toActorName" class="inline-flex items-center gap-1 text-tiny font-semibold text-cyan-300">
          <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
          <span v-if="addressedToLabel" class="sr-only">{{ addressedToLabel }}</span>
          <span :aria-hidden="addressedToLabel ? 'true' : undefined">{{ toActorName }}</span>
        </span>
        <span class="ml-auto inline-flex items-center gap-1">
          <time v-if="time && timePosition === 'header'" class="text-slate-400 tabular-nums">{{ time }}</time>
          <CyberVoiceButton
            v-if="speechId && audioPosition === 'header'"
            :speech-id="speechId"
            :text="speechText"
            :voice="voice || actor || actorId || 'system'"
            :play-label="labels.play || ''"
            :stop-label="labels.stop || ''"
            size="sm"
            class="cn-icon-btn-sm text-slate-400 hover:text-cyan-300"
          />
        </span>
      </header>

      <div
        class="cn-bubble-actor !max-w-none border-l-4 transition-shadow"
        :class="[mood.border, speaking ? 'ring-2 ring-cyan-400/60 shadow-glow-cyan' : '']"
      >
        <slot name="body" :body="parts.body" :html="bodyHtml">
          <p v-if="parts.body" class="whitespace-pre-line break-words" v-html="bodyHtml"></p>
        </slot>

        <!-- Question adressée au joueur : mise en avant. Pas d'aria-live : la bulle est déjà annoncée par le journal (role=log) -->
        <div
          v-if="showQuestionBox"
          role="note"
          class="rounded-xl border px-3 py-2.5"
          :class="[parts.body ? 'mt-2.5' : '', boxClass]"
          :data-question-state="questionState"
          v-bind="questionBoxAttrs"
        >
          <p v-if="boxLabel" class="flex items-center gap-1.5 text-tiny font-bold uppercase tracking-wider" :class="boxLabelClass">
            <svg v-if="questionState === 'answered'" class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <svg v-else class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
            </svg>
            <span>{{ boxLabel }}</span>
          </p>
          <p class="mt-1 text-sm sm:text-base font-semibold whitespace-pre-line break-words" :class="questionState === 'open' ? 'text-slate-50' : 'text-slate-200'" v-html="questionHtml"></p>
          <div v-if="(canReply && replyLabel) || $slots['question-actions']" class="mt-2 flex flex-wrap items-center gap-2">
            <button
              v-if="canReply && replyLabel"
              type="button"
              class="cn-btn-ghost cn-touch min-h-[2.75rem] sm:min-h-[2.25rem] px-3.5 text-sm sm:text-xs !border-amber-500/40 !text-amber-200 hover:!bg-amber-500/15"
              v-bind="replyButtonAttrs"
              @click="emit('reply', actorId, parts.question)"
            >
              <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              <span>{{ replyLabel }}</span>
            </button>
            <slot name="question-actions" :question="parts.question" :actor-id="actorId" :state="questionState"></slot>
          </div>
        </div>

        <!-- Question posée à un autre membre du comité : encadré discret, libellé « Question à {name} » si fourni -->
        <div
          v-else-if="parts.question"
          class="mt-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1.5"
          :data-question-state="'peer'"
        >
          <p v-if="questionToLabel" class="text-tiny font-bold uppercase tracking-wider text-cyan-300">{{ questionToLabel }}</p>
          <p class="text-sm text-cyan-100 whitespace-pre-line break-words" v-html="questionHtml"></p>
        </div>

        <footer v-if="(speechId && audioPosition === 'footer') || (time && timePosition === 'footer') || $slots.actions" class="mt-2 flex flex-wrap items-center gap-2 justify-end">
          <slot name="actions" :actor-id="actorId"></slot>
          <time v-if="time && timePosition === 'footer'" class="text-xs text-slate-400 tabular-nums mr-auto">{{ time }}</time>
          <CyberVoiceButton
            v-if="speechId && audioPosition === 'footer'"
            :speech-id="speechId"
            :text="speechText"
            :voice="voice || actor || actorId || 'system'"
            :play-label="labels.play || ''"
            :stop-label="labels.stop || ''"
            size="sm"
            class="cn-icon-btn-sm text-slate-400 hover:text-cyan-300"
          />
        </footer>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import CyberVoiceButton from './CyberVoiceButton.vue'
import { currentlySpeakingId } from '../services/voiceService.js'
import { formatChatText, splitTrailingQuestion, firstNameOf, questionKey } from '../services/conversation.js'

// Bulle de réplique d'une partie prenante. Aucun libellé en dur : tous les textes d'interface
// arrivent par `labels` (fournis par l'application via t('...')) ; un libellé absent masque l'élément.
const props = defineProps({
  // Acteur : { id, name, role, avatar, voice? }
  actor: { type: Object, required: true },
  text: { type: String, default: '' },
  // 'pleased' | 'neutral' | 'annoyed' | 'furious' (alias acceptés : cooperative, demanding, hostile)
  sentiment: { type: String, default: 'neutral' },
  // Question finale (champ question du tour) ; si elle termine le texte (casse, vocatif « Thomas, » et préfixe
  // de relance ignorés), elle n'est affichée qu'une fois
  question: { type: String, default: '' },
  // 'player' ou identifiant d'un acteur
  addressee: { type: String, default: 'player' },
  // Nom affiché quand la réplique s'adresse à un autre acteur
  addresseeName: { type: String, default: '' },
  // intent de la réplique ('relance' : libellé labels.relaunched)
  intent: { type: String, default: '' },
  time: { type: String, default: '' },
  // Position de l'heure : 'header' (défaut) ou 'footer'
  timePosition: { type: String, default: 'header', validator: (v) => ['header', 'footer'].includes(v) },
  // Identifiant de lecture vocale (bouton masqué si vide) et voix (identifiant, acteur ou profil ; défaut : l'acteur)
  speechId: { type: String, default: '' },
  voice: { type: [String, Object], default: null },
  // Position du bouton audio : 'footer' (défaut) ou 'header'
  audioPosition: { type: String, default: 'footer', validator: (v) => ['header', 'footer'].includes(v) },
  // Question déjà traitée : encadré « Répondu » (contraste AA, sans opacité), bouton masqué
  answered: { type: Boolean, default: false },
  // Question reposée plus bas (relance) : encadré neutre, bouton masqué
  superseded: { type: Boolean, default: false },
  showReply: { type: Boolean, default: true },
  // Détecte une question finale dans `text` quand `question` est vide (messages historiques)
  detectQuestion: { type: Boolean, default: false },
  // Attributs posés sur l'encadré de question et sur le bouton « Répondre » (fusionnés avec data-testid par défaut)
  questionAttrs: { type: Object, default: () => ({}) },
  replyAttrs: { type: Object, default: () => ({}) },
  /**
   * Libellés (tous facultatifs) :
   * { questionForYou, answered, superseded, relaunched, questionTo ('{name}'), replyTo ('{name}' remplacé par le prénom),
   *   addressedTo ('{name}', lu par les lecteurs d'écran), play, stop, sentiment: { pleased, neutral, annoyed, furious } }
   */
  labels: { type: Object, default: () => ({}) },
  // Mise en forme du texte (HTML sûr) ; défaut formatChatText (typographie française, échappement, **gras** / *italique*)
  formatter: { type: Function, default: null }
})

const emit = defineEmits(['reply'])

// L'ambre est réservé à la question au joueur : l'agacement prend une autre teinte
const MOODS = {
  pleased: { ring: 'border-emerald-500/60', border: '!border-l-emerald-500/70', pill: 'cn-pill-emerald' },
  neutral: { ring: 'border-slate-600', border: '!border-l-slate-600', pill: 'cn-pill-slate' },
  annoyed: { ring: 'border-violet-500/60', border: '!border-l-violet-500/70', pill: 'cn-pill-violet' },
  furious: { ring: 'border-rose-500/70', border: '!border-l-rose-500/80', pill: 'cn-pill-rose' }
}
const MOOD_ALIASES = { cooperative: 'pleased', demanding: 'neutral', hostile: 'annoyed' }

const actorId = computed(() => props.actor?.id || '')
const moodKey = computed(() => (MOODS[props.sentiment] ? props.sentiment : MOOD_ALIASES[props.sentiment] || 'neutral'))
const mood = computed(() => MOODS[moodKey.value])
const sentimentLabel = computed(() => props.labels?.sentiment?.[moodKey.value] || '')
const speaking = computed(() => !!props.speechId && currentlySpeakingId.value === props.speechId)
const fill = (label, name) => (typeof label === 'string' && label ? label.replace(/\{name\}/g, name) : '')

// Comparaison tolérante : casse, accents, guillemets, vocatif initial et préfixe de relance ignorés
const sameQ = (a, b) => {
  const ka = questionKey(a)
  const kb = questionKey(b)
  return !!ka && !!kb && (ka === kb || (kb.length > 12 && ka.endsWith(kb)) || (ka.length > 12 && kb.endsWith(ka)))
}

const parts = computed(() => {
  const text = props.text || ''
  const explicit = (props.question || '').trim()
  const trailing = splitTrailingQuestion(text)
  const question = explicit || (props.detectQuestion ? trailing.question || '' : '')
  if (!question) return { body: text.trim(), question: '' }
  // La question termine le texte : on affiche la phrase telle qu'écrite dans le texte, une seule fois
  if (trailing.question && sameQ(trailing.question, question)) return { body: trailing.body, question: trailing.question }
  const at = text.toLocaleLowerCase('fr').lastIndexOf(question.toLocaleLowerCase('fr'))
  if (at !== -1) return { body: `${text.slice(0, at)}${text.slice(at + question.length)}`.trim(), question }
  return { body: text.trim(), question }
})

const toPlayer = computed(() => !props.addressee || props.addressee === 'player')
const showQuestionBox = computed(() => !!parts.value.question && toPlayer.value)
const questionState = computed(() => (props.answered ? 'answered' : props.superseded ? 'superseded' : 'open'))
const canReply = computed(() => props.showReply && questionState.value === 'open')
const toActorName = computed(() => (!toPlayer.value ? props.addresseeName || '' : ''))
const addressedToLabel = computed(() => fill(props.labels?.addressedTo, toActorName.value))
const questionToLabel = computed(() => fill(props.labels?.questionTo, toActorName.value))
const replyLabel = computed(() => fill(props.labels?.replyTo, firstNameOf(props.actor)))
const ariaLabel = computed(() => [props.actor?.name, props.actor?.role].filter(Boolean).join(', '))
const boxLabel = computed(() => {
  const l = props.labels || {}
  if (questionState.value === 'answered') return l.answered || l.questionForYou || ''
  if (questionState.value === 'superseded') return l.superseded || l.questionForYou || ''
  return (props.intent === 'relance' && l.relaunched) || l.questionForYou || ''
})
const boxClass = computed(() => ({
  open: 'border-amber-400/50 bg-amber-500/10 shadow-glow-amber',
  answered: 'border-emerald-500/40 bg-slate-800/60',
  superseded: 'border-slate-600 bg-slate-800/60'
})[questionState.value])
const boxLabelClass = computed(() => ({ open: 'text-amber-300', answered: 'text-emerald-300', superseded: 'text-slate-300' })[questionState.value])
const questionBoxAttrs = computed(() => ({ 'data-testid': 'chat-question', ...(props.questionAttrs || {}) }))
const replyButtonAttrs = computed(() => ({ 'data-testid': 'chat-reply-button', 'data-actor-id': actorId.value || undefined, ...(props.replyAttrs || {}) }))

const format = (t) => (typeof props.formatter === 'function' ? props.formatter(t) : formatChatText(t, { strongClass: 'font-semibold text-slate-50', emClass: 'italic text-cyan-300' }))
const bodyHtml = computed(() => format(parts.value.body))
const questionHtml = computed(() => format(parts.value.question))
const speechText = computed(() => [parts.value.body, parts.value.question].filter(Boolean).join(' '))
</script>
