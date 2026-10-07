import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODELS,
  isRetiredGeminiModel,
  rankGeminiModels,
  pickDefaultGeminiModel,
  resolveGeminiModelChain,
  clearGeminiModelsCache,
  createGeminiSettingsStore,
  testGeminiApiKey,
  WarRoomEngine
} from '../index.js'

const realFetch = globalThis.fetch
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const listing = (ids) => json(200, { models: ids.map((id) => ({ name: `models/${id}`, supportedGenerationMethods: ['generateContent'] })) })
afterEach(() => { globalThis.fetch = realFetch; clearGeminiModelsCache() })

describe('Modèles Gemini découverts via l\'API', () => {
  test('défaut gemini-3.8-flash, aucune famille retirée dans le repli statique', () => {
    assert.equal(DEFAULT_GEMINI_MODEL, 'gemini-3.8-flash')
    assert.ok(FALLBACK_GEMINI_MODELS.every((m) => !isRetiredGeminiModel(m)))
    assert.ok(isRetiredGeminiModel('models/gemini-2.0-flash'))
    assert.ok(isRetiredGeminiModel('gemini-1.5-pro'))
    assert.ok(!isRetiredGeminiModel('gemini-2.5-flash'))
  })

  test('classement : préféré, stable avant preview, flash avant lite et pro, version décroissante', () => {
    const ids = ['gemini-2.0-flash', 'gemini-3.8-pro', 'gemini-3.8-flash-lite', 'gemini-4.0-flash-preview', 'gemini-2.5-flash', 'gemini-3.8-flash']
    assert.deepEqual(rankGeminiModels(ids).map(String), ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-3.8-flash-lite', 'gemini-3.8-pro', 'gemini-4.0-flash-preview'])
    assert.equal(pickDefaultGeminiModel(ids.map((id) => ({ id }))), 'gemini-3.8-flash')
    // 3.8-flash absent : meilleur flash stable disponible
    assert.equal(pickDefaultGeminiModel(['gemini-2.5-flash', 'gemini-3.9-flash', 'gemini-3.9-pro']), 'gemini-3.9-flash')
    assert.equal(pickDefaultGeminiModel([]), 'gemini-3.8-flash')
  })

  test('chaîne d\'appel : modèle retiré ignoré, modèles listés par l\'API seulement', async () => {
    globalThis.fetch = async () => listing(['gemini-3.8-flash', 'gemini-3.8-flash-lite', 'gemini-2.5-flash'])
    const chain = await resolveGeminiModelChain('k', 'gemini-2.0-flash', ['gemini-2.0-flash', 'gemini-9-inexistant'])
    assert.deepEqual(chain, ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-3.8-flash-lite'])
  })

  test('API muette : repli statique sans famille retirée', async () => {
    globalThis.fetch = async () => json(500, {})
    assert.deepEqual(await resolveGeminiModelChain('k', 'gemini-2.0-flash', ['gemini-2.0-flash']), ['gemini-3.8-flash'])
  })

  test('WarRoomEngine : le modèle retiré enregistré n\'est jamais appelé', async () => {
    const called = []
    globalThis.fetch = async (url) => {
      if (/\/models\?/.test(url)) return listing(['gemini-3.8-flash'])
      called.push(url.match(/models\/([^:]+):/)[1])
      return json(200, { candidates: [{ content: { parts: [{ text: '{"dialogues":[{"actorId":"dg","text":"Très bien."}],"metricsImpact":{}}' }] }, finishReason: 'STOP' }] })
    }
    const engine = new WarRoomEngine({ apiKey: 'k', model: 'gemini-2.0-flash' })
    const turn = await engine.playTurn({ actors: [{ id: 'dg', name: 'DG' }], scenario: {}, metrics: {}, userMessage: 'Bonjour', history: [] })
    assert.deepEqual(called, ['gemini-3.8-flash'])
    assert.equal(turn._engineUsedModel, 'gemini-3.8-flash')
  })

  test('store : reconcileModel remplace un modèle que l\'API ne liste plus', () => {
    const mem = new Map()
    globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) }
    try {
      const store = createGeminiSettingsStore('t')
      store.saveModel('gemini-2.0-flash')
      assert.equal(store.getModel(), 'gemini-3.8-flash')
      store.saveModel('gemini-2.5-flash')
      const { reconcileModel } = store
      assert.equal(reconcileModel([{ id: 'gemini-3.8-flash' }, { id: 'gemini-3.8-pro' }]), 'gemini-3.8-flash')
      assert.equal(store.getModel(), 'gemini-3.8-flash')
      assert.equal(store.reconcileModel([]), 'gemini-3.8-flash')
    } finally { delete globalThis.localStorage }
  })

  test('testGeminiApiKey : sans modèle demandé valide, teste le défaut choisi dans la liste', async () => {
    let tested = null
    globalThis.fetch = async (url) => {
      if (/\/models\?/.test(url)) return listing(['gemini-2.5-flash-lite', 'gemini-3.8-flash'])
      tested = url.match(/models\/([^:]+):/)[1]
      return json(200, { candidates: [{ content: { parts: [{ text: 'OK' }] } }] })
    }
    const res = await testGeminiApiKey('k', 'gemini-2.0-flash')
    assert.equal(res.testedModel, 'gemini-3.8-flash')
    assert.equal(tested, 'gemini-3.8-flash')
  })
})
