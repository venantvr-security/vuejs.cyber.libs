import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateTurnWith,
  createTurnSchema,
  CYBER_TURN_SCHEMA,
  CTI_TURN_SCHEMA,
  DEPLOY_TURN_SCHEMA,
  toResponseSchema,
  toLegacyShape
} from '../services/conversation.js'
import { ACTORS } from './fixtures.js'

describe('validateTurnWith', () => {
  test('CYBER : jauges bornées à ±20, chaînes « -5 » et « +5 » acceptées, NaN → 0, clés hors schéma ignorées', () => {
    const turn = validateTurnWith(CYBER_TURN_SCHEMA, {
      dialogues: [{ actorId: 'dg', text: 'Combien de jours ?', mood: 'annoyed' }],
      metricsImpact: { security: '-5', compliance: '+5', trust: 99, teamClimate: 'beaucoup', availability: 7 }
    }, { actors: ACTORS })
    assert.deepEqual(turn.metricsImpact, { security: -5, compliance: 5, trust: 20, teamClimate: 0 })
  })

  test('CTI : plafond +10 / plancher -15', () => {
    const turn = validateTurnWith(CTI_TURN_SCHEMA, {
      dialogues: [{ actorId: 'rssi', text: 'D\'accord.' }],
      metricsImpact: { security: 20, compliance: -40, trust: 3.6, teamClimate: null }
    })
    assert.deepEqual(turn.metricsImpact, { security: 10, compliance: -15, trust: 4, teamClimate: 0 })
  })

  test('DEPLOY : alias interventions / metricsDelta / feedback / sentiment résolus, jauges deploy', () => {
    const turn = validateTurnWith(DEPLOY_TURN_SCHEMA, {
      interventions: [{ actorId: 'dpo', text: 'La CNIL sous 72 h.', sentiment: 'furious' }],
      metricsDelta: { availability: '5', teamResilience: -30, security: 'NaN' },
      feedback: 'Tension sur la notification.'
    }, { actors: ACTORS })
    assert.equal(turn.dialogues.length, 1)
    assert.equal(turn.dialogues[0].mood, 'furious')
    assert.equal(turn.dialogues[0].sentiment, 'furious')
    assert.deepEqual(turn.metricsImpact, { security: 0, compliance: 0, availability: 5, teamResilience: -15 })
    assert.equal(turn.summary, 'Tension sur la notification.')
    assert.equal('interventions' in turn, false)
    assert.equal('metricsDelta' in turn, false)
  })

  test('actorId inconnu écarté, correspondance par nom, une seule réplique par acteur', () => {
    const turn = validateTurnWith(CYBER_TURN_SCHEMA, {
      dialogues: [
        { actorId: 'pirate', text: 'Je prends la main.' },
        { actorId: 'Julien Moreau', text: 'Premier.' },
        { actorId: 'rssi', text: 'Doublon.' },
        { actorId: 'dg', text: 'Et le budget.' }
      ],
      metricsImpact: {}
    }, { actors: ACTORS })
    assert.deepEqual(turn.dialogues.map((d) => d.actorId), ['rssi', 'dg'])
    assert.equal(turn.dialogues[0].text, 'Premier.')
    assert.ok(turn._warnings.some((w) => w.includes('pirate')))
  })

  test('clés « _ » injectées par le modèle ignorées, autres clés conservées', () => {
    const turn = validateTurnWith(CYBER_TURN_SCHEMA, {
      dialogues: [{ actorId: 'dg', text: 'x.', _engineFallback: true }],
      metricsImpact: { trust: 99 },
      _engineFallback: true,
      consensus: 'partiel'
    })
    assert.equal(turn._engineFallback, undefined)
    assert.equal(turn.dialogues[0]._engineFallback, undefined)
    assert.equal(turn.consensus, 'partiel')
    assert.equal(turn.metricsImpact.trust, 20)
  })

  test('mood hors énumération → neutral, psychology bornée 1..5, préfixe « [Nom (Rôle)] : » retiré', () => {
    const turn = validateTurnWith(CYBER_TURN_SCHEMA, {
      dialogues: [{ actorId: 'dg', text: '[Dr. Marie Bernard (DG)]: Le budget est tenu.', mood: 'ravie', psychology: { agacement: 9, confiance: '0', stress: 'x' } }],
      metricsImpact: {}
    }, { actors: ACTORS })
    const d = turn.dialogues[0]
    assert.equal(d.mood, 'neutral')
    assert.equal(d.text, 'Le budget est tenu.')
    assert.deepEqual(d.psychology, { agacement: 5, confiance: 1 })
    assert.equal(d.actorName, 'Dr. Marie Bernard')
  })

  test('question déduite de la fin du texte ; question fournie absente du texte → ajoutée ; addressee validé', () => {
    const turn = validateTurnWith(CYBER_TURN_SCHEMA, {
      dialogues: [
        { actorId: 'dg', text: 'Je note les 72 h. Qui signe la FARR ?' },
        { actorId: 'rssi', text: 'Je suis d\'accord avec la DG.', question: 'Quelle date de retest ?', addressee: 'dg' },
        { actorId: 'dpo', text: 'Rien à ajouter.', addressee: 'inconnu', intent: 'n\'importe' }
      ],
      metricsImpact: {}
    }, { actors: ACTORS })
    const [dg, rssi, dpo] = turn.dialogues
    assert.equal(dg.question, 'Qui signe la FARR ?')
    assert.equal(dg.intent, 'question')
    assert.equal(dg.addressee, 'player')
    assert.equal(rssi.addressee, 'dg')
    assert.ok(rssi.text.endsWith('Quelle date de retest ?'))
    assert.equal(dpo.addressee, 'player')
    assert.equal(dpo.intent, 'answer')
    assert.equal(dpo.question, null)
  })

  test('tronqué : dernière réplique coupée retirée ; null si plus aucune réplique', () => {
    const parsed = { dialogues: [{ actorId: 'dg', text: 'Phrase complète.' }, { actorId: 'rssi', text: 'Je pense que nous dev' }], metricsImpact: {} }
    const turn = validateTurnWith(CYBER_TURN_SCHEMA, parsed, { truncated: true })
    assert.equal(turn.dialogues.length, 1)
    assert.equal(turn._truncated, true)
    assert.equal(validateTurnWith(CYBER_TURN_SCHEMA, { dialogues: [{ actorId: 'dg', text: 'Je pense que' }] }, { truncated: true }), null)
  })

  test('entrées invalides → null ; tableau au premier niveau accepté', () => {
    assert.equal(validateTurnWith(CYBER_TURN_SCHEMA, null), null)
    assert.equal(validateTurnWith(CYBER_TURN_SCHEMA, 'texte'), null)
    assert.equal(validateTurnWith(CYBER_TURN_SCHEMA, { dialogues: [] }), null)
    assert.equal(validateTurnWith(CYBER_TURN_SCHEMA, { dialogues: [{ actorId: 'dg', text: '   ' }] }), null)
    const turn = validateTurnWith(CYBER_TURN_SCHEMA, [{ actorId: 'dg', text: 'OK.' }])
    assert.equal(turn.dialogues.length, 1)
    assert.deepEqual(turn.metricsImpact, { security: 0, compliance: 0, trust: 0, teamClimate: 0 })
  })

  test('maxDialogues, maxReplyLength et targetActorId en tête', () => {
    const schema = createTurnSchema({ gauges: { a: { min: -1, max: 1 } }, maxDialogues: 2, maxReplyLength: 20 })
    const turn = validateTurnWith(schema, {
      dialogues: [
        { actorId: 'dg', text: 'Une réplique beaucoup trop longue pour la limite fixée.' },
        { actorId: 'rssi', text: 'Deux.' },
        { actorId: 'dpo', text: 'Trois.' }
      ]
    }, { actors: ACTORS, targetActorId: 'rssi' })
    assert.deepEqual(turn.dialogues.map((d) => d.actorId), ['rssi', 'dg'])
    assert.ok(turn.dialogues[1].text.length <= 21)
    assert.ok(turn.dialogues[1].text.endsWith('…'))
  })
})

describe('toResponseSchema / toLegacyShape', () => {
  test('schéma Gemini : enum des actorId, addressee, jauges INTEGER requises', () => {
    const rs = toResponseSchema(DEPLOY_TURN_SCHEMA, ACTORS)
    assert.equal(rs.type, 'OBJECT')
    const item = rs.properties.dialogues.items
    assert.deepEqual(item.properties.actorId.enum, ['dg', 'rssi', 'dpo'])
    assert.deepEqual(item.properties.addressee.enum, ['player', 'dg', 'rssi', 'dpo'])
    assert.equal(item.properties.question.nullable, true)
    assert.deepEqual(rs.properties.metricsImpact.required, ['security', 'compliance', 'availability', 'teamResilience'])
    assert.equal(rs.properties.metricsImpact.properties.availability.type, 'INTEGER')
    assert.deepEqual(rs.required, ['dialogues', 'metricsImpact', 'assessment'])
    assert.deepEqual(rs.properties.assessment.required, ['redLines', 'manipulation', 'proposal', 'answeredQuestions'])
    assert.deepEqual(toResponseSchema(DEPLOY_TURN_SCHEMA, ACTORS, { assessment: false }).required, ['dialogues', 'metricsImpact'])
  })

  test('toLegacyShape renomme pour deploy', () => {
    const legacy = toLegacyShape({ dialogues: [1], metricsImpact: { a: 1 }, summary: 's', _engineFallback: true })
    assert.deepEqual(legacy, { interventions: [1], metricsDelta: { a: 1 }, feedback: 's', _engineFallback: true })
  })
})
