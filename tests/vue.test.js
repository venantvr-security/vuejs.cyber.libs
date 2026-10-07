import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { renderComponent } from './helpers/render.mjs'
import { createI18n } from '../services/i18n.js'
import { createThemeService } from '../services/theme.js'
import { registerVoiceProfiles, resolveVoiceProfile } from '../services/voiceService.js'

function memoryStorage() {
  const data = new Map()
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k), data }
}

describe('services Vue mutualisés', () => {
  test('createI18n : même API que les copies des applications (t, currentLocale, setLocale, toggleLocale, useI18n)', () => {
    const storage = memoryStorage()
    globalThis.localStorage = storage
    try {
      const i18n = createI18n({ dictionaries: { fr: { hello: 'Bonjour' }, en: { hello: 'Hello' } }, storageKey: 'x_locale' })
      const { t, currentLocale, setLocale, toggleLocale } = i18n.useI18n()
      assert.equal(t('hello'), 'Bonjour')
      assert.equal(t('absent'), 'absent')
      assert.equal(t('absent', 'défaut'), 'défaut')
      assert.equal(toggleLocale(), 'en')
      assert.equal(currentLocale.value, 'en')
      assert.equal(t('hello'), 'Hello')
      assert.equal(storage.data.get('x_locale'), 'en')
      assert.equal(setLocale('de'), false)
      const reloaded = createI18n({ dictionaries: { fr: {}, en: { hello: 'Hello' } }, storageKey: 'x_locale' })
      assert.equal(reloaded.currentLocale.value, 'en')
      const quiet = createI18n({ dictionaries: { fr: {} }, missing: 'empty', warnMissing: false })
      assert.equal(quiet.t('absent'), '')
    } finally {
      delete globalThis.localStorage
    }
  })

  test('createThemeService : classe sur la racine, mémorisée, bascule', () => {
    const storage = memoryStorage()
    globalThis.localStorage = storage
    const classes = new Set(['dark'])
    const root = { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } }
    try {
      storage.setItem('t_theme', 'light')
      const theme = createThemeService('t_theme', { root: () => root })
      assert.equal(theme.initTheme(), 'light')
      assert.deepEqual([...classes], ['light'])
      assert.equal(theme.toggleTheme(), 'dark')
      assert.equal(storage.data.get('t_theme'), 'dark')
      assert.equal(theme.useTheme().theme.value, 'dark')
    } finally {
      delete globalThis.localStorage
    }
  })

  test('registerVoiceProfiles : table des voix paramétrable', () => {
    registerVoiceProfiles({ ciso_test: { pitch: 0.7, female: true } })
    assert.deepEqual(resolveVoiceProfile('ciso_test'), { pitch: 0.7, rate: 1.05, female: true })
    assert.equal(resolveVoiceProfile({ id: 'ciso_test', voice: { rate: 1.2 } }).rate, 1.2)
  })
})

describe('composants (rendu SSR)', () => {
  const actor = { id: 'rssi', name: 'Julien Moreau', role: 'RSSI', avatar: 'R' }
  const labels = { questionForYou: 'Question pour vous', answered: 'Répondu', superseded: 'Reposée plus bas', relaunched: 'Question reposée', questionTo: 'Question à {name}', replyTo: 'Répondre à {name}', addressedTo: 'Adressé à {name}' }

  test('CyberChatBubble : encadré role=note sans aria-live, data-testid par défaut, question alignée (casse, vocatif, relance)', async () => {
    const html = await renderComponent('CyberChatBubble', { actor, text: 'Je note les 72 h. Thomas, quelle date de retest ?', question: 'Je repose ma question : quelle date de retest ?', labels, intent: 'relance', time: '10:02' })
    assert.ok(!/aria-live=/.test(html))
    assert.match(html, /role="note"[^>]*data-question-state="open"[^>]*data-testid="chat-question"/)
    assert.match(html, /data-testid="chat-reply-button" data-actor-id="rssi"/)
    assert.match(html, /<span>Question reposée<\/span>/)
    assert.match(html, /<span>Répondre à Julien<\/span>/)
    assert.equal(html.match(/quelle date de retest/g).length, 1)
    assert.match(html, /<time class="text-slate-400 tabular-nums">10:02<\/time>/)
    assert.match(html, /cn-touch min-h-\[2\.75rem\]/)
  })

  test('CyberChatBubble : questionAttrs / replyAttrs, états répondu et reposé, encadré « Question à »', async () => {
    const custom = await renderComponent('CyberChatBubble', { actor, text: 'Qui signe ?', question: 'Qui signe ?', labels, questionAttrs: { 'data-testid': 'q-box', 'data-question': 'Qui signe ?' }, replyAttrs: { 'data-testid': 'r-btn' } })
    assert.match(custom, /data-testid="q-box"/)
    assert.match(custom, /data-question="Qui signe \?"/)
    assert.match(custom, /data-testid="r-btn"/)
    const answered = await renderComponent('CyberChatBubble', { actor, text: 'Qui signe ?', question: 'Qui signe ?', labels, answered: true })
    assert.match(answered, /data-question-state="answered"/)
    assert.match(answered, /<span>Répondu<\/span>/)
    assert.ok(!answered.includes('chat-reply-button'))
    assert.ok(!/opacity-75/.test(answered))
    const superseded = await renderComponent('CyberChatBubble', { actor, text: 'Qui signe ?', question: 'Qui signe ?', labels, superseded: true })
    assert.match(superseded, /<span>Reposée plus bas<\/span>/)
    assert.ok(!superseded.includes('chat-reply-button'))
    const peer = await renderComponent('CyberChatBubble', { actor, text: 'Marie, tu valides ?', question: 'Marie, tu valides ?', addressee: 'dg', addresseeName: 'Marie', labels })
    assert.match(peer, /Question à Marie/)
    assert.match(peer, /<span class="sr-only">Adressé à Marie<\/span>/)
    assert.ok(!peer.includes('role="note"'))
  })

  test('CyberChatBubble : humeur « annoyed » hors de l\'ambre réservé à la question', async () => {
    const html = await renderComponent('CyberChatBubble', { actor, text: 'Bien.', sentiment: 'annoyed', labels: { sentiment: { annoyed: 'Agacé' } } })
    assert.match(html, /cn-pill-violet/)
    assert.ok(!html.includes('amber'))
  })

  test('CyberNavTabs : testId / attrs par onglet ; mobileLayout scroll', async () => {
    const items = [{ id: 'a', label: 'Alpha', testId: 'nav-a' }, { id: 'b', label: 'Bêta', attrs: { 'data-view': 'b' } }]
    const scroll = await renderComponent('CyberNavTabs', { items, modelValue: 'a', mobileLayout: 'scroll' })
    assert.match(scroll, /data-layout="scroll"/)
    assert.match(scroll, /snap-x/)
    assert.equal(scroll.match(/data-testid="nav-a"/g).length, 2)
    assert.equal(scroll.match(/data-view="b"/g).length, 2)
    const grid = await renderComponent('CyberNavTabs', { items, modelValue: 'b' })
    assert.match(grid, /data-layout="grid"/)
  })

  test('CyberFooter : masqué sur mobile si demandé', async () => {
    assert.match(await renderComponent('CyberFooter', { hideOnMobile: true }), /hidden md:block/)
    assert.ok(!(await renderComponent('CyberFooter', {})).includes('hidden'))
  })
})
