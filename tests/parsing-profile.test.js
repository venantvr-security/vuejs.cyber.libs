import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { parseGeminiJson, parseGeminiJsonDetailed, isFatalGeminiError, createGeminiSettingsStore } from '../services/gemini.js'
import {
  findMentionedActors,
  findAddressedActors,
  matchTermGroups,
  containsTerm,
  normalize,
  assessAgainstStakeholder,
  describeStakeholderForPrompt
} from '../services/stakeholderProfile.js'
import { ACTORS } from './fixtures.js'

describe('parseGeminiJson', () => {
  test('signature historique : objet, texte autour et balises markdown tolérés', () => {
    assert.deepEqual(parseGeminiJson('```json\n{"a":1}\n```'), { a: 1 })
    assert.deepEqual(parseGeminiJson('Voici la réponse : {"a":{"b":[1,2]}} merci'), { a: { b: [1, 2] } })
  })

  test('« +5 » nettoyé hors chaînes, « +5 » dans une chaîne conservé', () => {
    assert.deepEqual(parseGeminiJson('{"metricsImpact":{"security":+5,"trust": +10},"t":"a +5 b"}'), { metricsImpact: { security: 5, trust: 10 }, t: 'a +5 b' })
  })

  test('accolades dans la prose avant le JSON', () => {
    assert.deepEqual(parseGeminiJson('Voici {note} : {"dialogues":[{"actorId":"dg","text":"ok"}]}'), { dialogues: [{ actorId: 'dg', text: 'ok' }] })
  })

  test('tableau de répliques au premier niveau rangé sous dialogues', () => {
    assert.deepEqual(parseGeminiJson('[{"actorId":"dg","text":"a"},{"dialogues":[]}]'), { dialogues: [{ actorId: 'dg', text: 'a' }] })
    assert.deepEqual(parseGeminiJson('[{"dialogues":[{"text":"b"}]}]'), { dialogues: [{ text: 'b' }] })
  })

  test('JSON tronqué réparé et signalé ; JSON légèrement invalide réparé en entier', () => {
    const r = parseGeminiJsonDetailed('{"dialogues":[{"actorId":"dg","text":"Phrase complète."},{"actorId":"rssi","text":"Je pense que nous dev')
    assert.equal(r.truncated, true)
    assert.equal(r.value.dialogues.length, 2)
    const ok = parseGeminiJsonDetailed('{"dialogues":[{"actorId":"dg","text":"a"},],"metricsImpact":{"trust":1}}')
    assert.equal(ok.truncated, false)
    assert.deepEqual(ok.value.metricsImpact, { trust: 1 })
  })

  test('erreurs : vide, prose seule, nombre seul', () => {
    assert.throws(() => parseGeminiJson(''), /vide/)
    assert.throws(() => parseGeminiJson('Pas de JSON ici'), /irrécupérable/)
    assert.throws(() => parseGeminiJson('42'), /irrécupérable/)
  })

  test('isFatalGeminiError : 400 fatal seulement pour API_KEY_INVALID', () => {
    assert.equal(isFatalGeminiError({ status: 400, reason: 'API_KEY_INVALID' }), true)
    assert.equal(isFatalGeminiError({ status: 400, message: 'JSON mode is not enabled for this model' }), false)
    assert.equal(isFatalGeminiError({ status: 403 }), true)
    assert.equal(isFatalGeminiError({ status: 429 }), false)
  })

  test('createGeminiSettingsStore sans localStorage : valeurs par défaut, aucune exception', () => {
    const store = createGeminiSettingsStore('cyber_nexus')
    assert.equal(store.keys.apiKey, 'cyber_nexus_gemini_api_key')
    assert.equal(store.getApiKey(), '')
    assert.equal(store.getModel(), 'gemini-3.8-flash')
    store.saveApiKey('x')
  })
})

describe('findMentionedActors / findAddressedActors (F10)', () => {
  test('vocatif, @alias, « qu\'en pense », civilité = interpellation', () => {
    assert.deepEqual(findAddressedActors('Julien, quel délai ?', ACTORS).addressedIds, ['rssi'])
    assert.ok(findAddressedActors('Moreau, quel délai ?', ACTORS).addressedIds.includes('rssi'))
    assert.deepEqual(findAddressedActors('@dpo tu confirmes', ACTORS).addressedIds, ['dpo'])
    assert.deepEqual(findAddressedActors('Qu\'en pense la DG ?', ACTORS).addressedIds, ['dg'])
    assert.deepEqual(findAddressedActors('Madame la directrice, nous proposons 50 k€.', ACTORS).addressedIds, ['dg'])
    assert.deepEqual(findAddressedActors('Et la FARR, Marie ?', ACTORS).addressedIds, ['dg'])
  })

  test('simple mention : citée mais pas interpellée', () => {
    const r = findAddressedActors('Le RSSI a validé hier, la DG décidera.', ACTORS)
    assert.deepEqual(r.addressedIds, [])
    assert.deepEqual(r.mentionedIds, ['rssi', 'dg'])
  })

  test('alias thématique (addressOnly) : ni mention ni interpellation hors vocatif', () => {
    assert.deepEqual(findMentionedActors('Il faut garantir la conformité HDS', ACTORS), [])
    assert.deepEqual(findMentionedActors('Article 33 RGPD', ACTORS), [])
    assert.deepEqual(findAddressedActors('Conformité, vous validez ?', ACTORS).addressedIds, ['dpo'])
  })

  test('findMentionedActors : comportement historique pour les alias texte (ordre d\'apparition)', () => {
    assert.deepEqual(findMentionedActors('Je réponds à la DG, mais Julien a raison', ACTORS).map((a) => a.id).slice(0, 2), ['dg', 'rssi'])
    assert.deepEqual(findAddressedActors('Je réponds à la DG, mais Julien a raison', ACTORS).addressedIds, ['dg'])
  })
})

describe('négations et normalisation (F12, F13)', () => {
  const FARR = [{ label: 'FARR', terms: ['farr'] }]
  test('« point » et « rien que » ne nient pas ; « ne … point » nie', () => {
    assert.deepEqual(matchTermGroups('Faisons un point sur la FARR signée', FARR).met, ['FARR'])
    assert.deepEqual(matchTermGroups('Rien que la FARR suffit', FARR).met, ['FARR'])
    assert.deepEqual(matchTermGroups('Nous ne signerons point la FARR', FARR).met, [])
  })

  test('« sans attendre » figé seulement sans complément', () => {
    assert.deepEqual(matchTermGroups('Sans attendre la FARR, on déploie', FARR).met, [])
    assert.deepEqual(matchTermGroups('Sans attendre, on signe la FARR', FARR).met, ['FARR'])
  })

  test('hypothèse : ligne rouge testée, pas franchie (option hypotheticalAsQuestion)', () => {
    const rssi = ACTORS[1]
    const probe = assessAgainstStakeholder('Et si on passait sans correctif ?', rssi, { hypotheticalAsQuestion: true })
    assert.deepEqual(probe.redLinesCrossed, [])
    assert.deepEqual(probe.redLinesProbed, ['Mise en production sans correctif'])
    const real = assessAgainstStakeholder('On passe sans correctif. D\'accord ?', rssi, { hypotheticalAsQuestion: true })
    assert.deepEqual(real.redLinesCrossed, ['Mise en production sans correctif'])
    assert.equal(real.hasRedLine, true)
    assert.equal(typeof real.totalScore, 'number')
    const legacy = assessAgainstStakeholder('Et si on passait sans correctif ?', rssi)
    assert.deepEqual(legacy.redLinesCrossed, ['Mise en production sans correctif'])
  })

  test('ligatures œ / æ', () => {
    assert.equal(normalize('Mise en Œuvre'), 'mise en oeuvre')
    assert.equal(containsTerm('mise en oeuvre du plan', 'mise en œuvre'), true)
    assert.equal(containsTerm('mise en œuvre du plan', 'mise en oeuvre'), true)
  })

  test('describeStakeholderForPrompt : alias (option) et listes en chaîne tolérées (F11)', () => {
    const actor = { id: 'x', name: 'X', profile: { aliases: ['camille', { term: 'ot', addressOnly: true }], decisionRights: { decides: 'arrêt de la production' } } }
    const block = describeStakeholderForPrompt(actor)
    assert.ok(block.includes('- Interpellé par : camille ; ot'))
    assert.ok(block.includes('- Décide : arrêt de la production'))
    assert.ok(!describeStakeholderForPrompt(actor, { includeAliases: false }).includes('Interpellé par'))
  })
})
