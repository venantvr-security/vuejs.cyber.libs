import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { WarRoomEngine, DEPLOY_TURN_SCHEMA, createQuestionPolicy, testGeminiApiKey } from '../index.js'
import { ACTORS, seq } from './fixtures.js'

const realFetch = globalThis.fetch
let calls = []
let responder = null

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}
function geminiText(text, finishReason = 'STOP') {
  return jsonResponse(200, { candidates: [{ content: { parts: [{ text }] }, finishReason }] })
}

beforeEach(() => {
  calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: init?.body ? JSON.parse(init.body) : null })
    return responder(url, init, calls.length)
  }
})
afterEach(() => { globalThis.fetch = realFetch })

const history = [
  { sender: 'dg', actorName: 'Dr. Marie Bernard', actorRole: 'DG', text: 'Que proposez-vous ?' },
  { sender: 'user', text: 'Rssi, quel délai pour le retest ?' }
]

describe('WarRoomEngine', () => {
  test('buildAlternatingContents (même signature) : pas de doublon, consigne envoyée, ouverture gardée', () => {
    const engine = new WarRoomEngine({})
    const contents = engine.buildAlternatingContents(history, 'Rssi, quel délai pour le retest ?')
    assert.equal(contents[0].parts[0].text, '[Ouverture de séance]')
    const last = contents[contents.length - 1]
    assert.equal(last.role, 'user')
    assert.ok(last.parts[0].text.includes('INTERVENTION DU JOUEUR'))
    assert.ok(!last.parts[0].text.includes('[Nouvelle intervention]'))
  })

  test('validateTurn sans acteurs : comportement historique (format cyber, ±20)', () => {
    const engine = new WarRoomEngine({})
    const turn = engine.validateTurn({ dialogues: [{ text: 'x' }], metricsImpact: { trust: 99 }, _engineFallback: true })
    assert.equal(turn.dialogues.length, 1)
    assert.equal(turn.metricsImpact.trust, 20)
    assert.equal(turn._engineFallback, undefined)
  })

  test('playTurn Gemini : responseSchema, thinkingConfig, actorId validés, cible en tête, recordTurn', async () => {
    responder = () => geminiText(JSON.stringify({
      interventions: [
        { actorId: 'dg', text: 'Le budget tient.', sentiment: 'pleased' },
        { actorId: 'intrus', text: 'Hack.' },
        { actorId: 'rssi', text: 'Retest jeudi. Qui signe la FARR ?' }
      ],
      metricsDelta: { availability: '+5' }
    }))
    const policy = createQuestionPolicy({ rate: 0, rng: seq(0.99) })
    const engine = new WarRoomEngine({ apiKey: 'k', turnSchema: DEPLOY_TURN_SCHEMA, useResponseSchema: true, thinkingBudget: 0, questionPolicy: policy })
    const turn = await engine.playTurn({ actors: ACTORS, scenario: { title: 'T' }, metrics: {}, userMessage: 'Rssi, quel délai pour le retest ?', history, targetActorId: 'rssi' })
    assert.equal(turn._engineUsedModel, 'gemini-2.5-flash')
    assert.deepEqual(turn.dialogues.map((d) => d.actorId), ['rssi', 'dg'])
    assert.equal(turn.metricsImpact.availability, 5)
    const body = calls[0].body
    assert.ok(body.generationConfig.responseSchema)
    assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingBudget: 0 })
    assert.equal(calls[0].init.headers['x-goog-api-key'], 'k')
    assert.ok(!calls[0].url.includes('key='))
    assert.equal(policy.state.turn, 1)
    // Question hors plan (le joueur pose une question pure) : convertie en affirmation, jamais comptée comme posée
    const rssi = turn.dialogues.find((d) => d.actorId === 'rssi')
    assert.equal(rssi.question, null)
    assert.ok(!rssi.text.includes('?'))
    assert.match(rssi.text, /^Retest jeudi\. .*qui signe la FARR\.$/)
    assert.equal(policy.state.lastAskerId, null)
  })

  test('400 non lié à la clé : modèle suivant ; 400 API_KEY_INVALID : arrêt et repli local', async () => {
    responder = (url, init, n) => (n === 1 ? jsonResponse(400, { error: { message: 'JSON mode is not enabled' } }) : geminiText('{"dialogues":[{"actorId":"dg","text":"OK."}]}'))
    const engine = new WarRoomEngine({ apiKey: 'k' })
    const turn = await engine.playTurn({ actors: ACTORS, userMessage: 'x', history: [] })
    assert.equal(turn._engineUsedModel, 'gemini-2.5-flash-lite')

    responder = () => jsonResponse(400, { error: { message: 'API key not valid', details: [{ reason: 'API_KEY_INVALID' }] } })
    calls = []
    const local = new WarRoomEngine({ apiKey: 'bad', localSimulator: (a) => ({ dialogues: [{ actorId: 'dg', text: `Local ${a.currentMetrics.security}.` }], metricsImpact: {} }) })
    const fallback = await local.playTurn({ actors: ACTORS, metrics: { security: 70 }, userMessage: 'x', history: [] })
    assert.equal(calls.length, 1)
    assert.equal(fallback._engineFallback, true)
    assert.equal(fallback.dialogues[0].text, 'Local 70.')
    assert.match(fallback._engineError.message, /API key not valid/)
  })

  test('MAX_TOKENS : _truncated et dernière réplique coupée retirée', async () => {
    responder = () => geminiText('{"dialogues":[{"actorId":"dg","text":"Complet."},{"actorId":"rssi","text":"Je pense que nous dev', 'MAX_TOKENS')
    const engine = new WarRoomEngine({ apiKey: 'k' })
    const turn = await engine.playTurn({ actors: ACTORS, userMessage: 'x', history: [] })
    assert.equal(turn._truncated, true)
    assert.deepEqual(turn.dialogues.map((d) => d.actorId), ['dg'])
  })

  test('prompt qui lève une exception : repli local (construction dans le try) ; simulateur absent toléré', async () => {
    responder = () => { throw new Error('ne doit pas être appelé') }
    const engine = new WarRoomEngine({ apiKey: 'k', systemPromptGenerator: () => { throw new Error('boom') } })
    const turn = await engine.playTurn({ actors: ACTORS, userMessage: 'x', history: [] })
    assert.equal(turn._engineFallback, true)
    assert.equal(turn.dialogues.length, 0)
    assert.equal(turn._engineError.message, 'boom')
    assert.equal(calls.length, 0)
  })

  test('sans clé : simulateur local avec contrat élargi (currentMetrics, transcript, plan, targetActorId)', async () => {
    let received = null
    const engine = new WarRoomEngine({ localSimulator: (args) => { received = args; return { interventions: [{ actorId: 'rssi', text: 'Local.' }], metricsDelta: { availability: 3 } } }, turnSchema: DEPLOY_TURN_SCHEMA, questionPolicy: createQuestionPolicy({ rng: seq(0.99) }) })
    const turn = await engine.playTurn({ actors: ACTORS, metrics: { security: 1 }, userMessage: 'Bonjour', history, targetActorId: 'rssi' })
    assert.deepEqual(received.currentMetrics, { security: 1 })
    assert.equal(received.targetActorId, 'rssi')
    assert.ok(Array.isArray(received.transcript))
    assert.ok(received.plan && 'ask' in received.plan)
    assert.equal(turn.metricsImpact.availability, 3)
    assert.equal(turn._engineFallback, true)
  })

  test('annulation : AbortError, pas de repli', async () => {
    const controller = new AbortController()
    controller.abort()
    const engine = new WarRoomEngine({ apiKey: 'k', localSimulator: () => ({ dialogues: [{ text: 'x' }] }) })
    await assert.rejects(engine.playTurn({ actors: ACTORS, userMessage: 'x', history: [], signal: controller.signal }), { name: 'AbortError' })
  })

  test('testGeminiApiKey : requestedFound et vrai message en 403', async () => {
    responder = (url) => (url.includes('/models?') || url.endsWith('/models') ? jsonResponse(200, { models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['generateContent'] }] }) : jsonResponse(200, {}))
    const res = await testGeminiApiKey('k', 'gemini-9-pro')
    assert.equal(res.requestedFound, false)
    assert.equal(res.testedModel, 'gemini-2.5-flash')
    assert.deepEqual(res.models.map((m) => m.id), ['gemini-2.5-flash'])
    responder = () => jsonResponse(403, { error: { message: 'Permission denied: key revoked' } })
    await assert.rejects(testGeminiApiKey('k'), /key revoked/)
  })
})
