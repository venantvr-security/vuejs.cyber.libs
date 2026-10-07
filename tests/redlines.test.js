import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { RED_LINE_CORPUS, INJECTION_CORPUS, REPLY_CORPUS } from './fixtures/redlines.fr.js'
import {
  detectRedLines,
  redLineModality,
  isExploratoryQuestion,
  RED_LINE_PATTERNS,
  RED_LINE_FAMILIES,
  linkRedLineFamilies,
  withRedLineFamilies,
  assessAgainstStakeholder,
  assessAll,
  matchTermGroups,
  isManipulationAttempt,
  isQuestionTreated,
  classifyPlayerMessage,
  gateDeltas,
  applyRedLineGate,
  redLineGateState,
  createCreditLedger,
  diminishingReturns,
  applyDiminishingReturns,
  statementKey
} from '../index.js'

const expected = (c) => (c.kind === 'crossed' ? 'crossed' : c.kind === 'probed' ? 'probed' : 'none')
const classify = (text) => {
  const r = detectRedLines(text)
  return { got: r.hasCrossed ? 'crossed' : r.hasProbed ? 'probed' : 'none', families: [...r.crossed, ...r.probed].map((x) => x.family) }
}

describe('corpus étiqueté (tests/fixtures/redlines.fr.js)', () => {
  test('au moins 150 phrases, toutes les familles et toutes les catégories représentées', () => {
    const total = RED_LINE_CORPUS.length + INJECTION_CORPUS.length + REPLY_CORPUS.length
    assert.ok(total >= 150, `corpus de ${total} phrases`)
    assert.ok(RED_LINE_CORPUS.length >= 150)
    for (const family of Object.keys(RED_LINE_FAMILIES)) {
      assert.ok(RED_LINE_CORPUS.filter((c) => c.kind === 'crossed' && c.family === family).length >= 5, `famille ${family}`)
    }
    for (const kind of ['crossed', 'probed', 'negation', 'trap']) assert.ok(RED_LINE_CORPUS.some((c) => c.kind === kind), kind)
    assert.ok(INJECTION_CORPUS.some((c) => c.kind === 'injection') && INJECTION_CORPUS.some((c) => c.kind === 'trap'))
    assert.ok(REPLY_CORPUS.some((c) => c.kind === 'offTopic') && REPLY_CORPUS.some((c) => c.kind === 'relevant'))
  })

  test('lignes rouges : ≥ 95 % de bonnes classifications (modalité et famille) et 0 faux positif sur les pièges', () => {
    let ok = 0
    const errors = []
    const falsePositives = []
    for (const c of RED_LINE_CORPUS) {
      const { got, families } = classify(c.text)
      const exp = expected(c)
      const good = got === exp && (exp === 'none' || families.includes(c.family))
      if (good) ok++
      else errors.push(`${c.kind} attendu ${exp}, obtenu ${got} [${families}] : ${c.text}`)
      if (c.kind === 'trap' && got !== 'none') falsePositives.push(c.text)
    }
    const rate = ok / RED_LINE_CORPUS.length
    assert.deepEqual(falsePositives, [])
    assert.ok(rate >= 0.95, `taux ${(rate * 100).toFixed(1)} %\n${errors.join('\n')}`)
  })

  test('injections : ≥ 95 % détectées, 0 faux positif sur les phrases métier', () => {
    const misses = INJECTION_CORPUS.filter((c) => c.kind === 'injection' && !isManipulationAttempt(c.text))
    const falsePositives = INJECTION_CORPUS.filter((c) => c.kind === 'trap' && isManipulationAttempt(c.text))
    assert.deepEqual(falsePositives.map((c) => c.text), [])
    const injections = INJECTION_CORPUS.filter((c) => c.kind === 'injection').length
    assert.ok((injections - misses.length) / injections >= 0.95, misses.map((c) => c.text).join('\n'))
  })

  test('réponses via « Répondre » : ≥ 95 % bien classées (pertinentes / hors sujet)', () => {
    const errors = REPLY_CORPUS.filter((c) => isQuestionTreated(c.question, c.answer, { viaReply: true }) !== (c.kind === 'relevant'))
    assert.ok((REPLY_CORPUS.length - errors.length) / REPLY_CORPUS.length >= 0.95, errors.map((c) => `${c.kind} : ${c.question} → ${c.answer}`).join('\n'))
  })

  test('aucun piège innocent ne déclenche d\'injection ni de ligne rouge', () => {
    for (const c of RED_LINE_CORPUS.filter((x) => x.kind === 'trap' || x.kind === 'negation')) {
      assert.equal(isManipulationAttempt(c.text), false, c.text)
    }
  })
})

describe('sémantique des lignes rouges', () => {
  test('proposition au conditionnel, à l\'impératif ou à l\'infinitif : franchie ; vraie question : testée ; négation : rien', () => {
    assert.equal(redLineModality('On pourrait suspendre la gate deux sprints.'), 'crossed')
    assert.equal(redLineModality('Et si on suspendait la gate deux sprints ?'), 'probed')
    assert.equal(redLineModality('Pourquoi ne pas suspendre la gate ?'), 'crossed')
    assert.equal(redLineModality('On suspend la gate, d\'accord ?'), 'crossed')
    assert.equal(redLineModality('Et si on attendait lundi ? Ça éviterait la panique.', { following: [] }), 'crossed')
    assert.equal(isExploratoryQuestion('Que se passerait-il si on attendait lundi pour prévenir l\'ANSSI ?'), true)
    assert.equal(detectRedLines('Nous ne retarderons pas la notification.').any, false)
    assert.equal(detectRedLines('Hors de question de dissimuler quoi que ce soit.').any, false)
    assert.equal(detectRedLines('N\'ouvrons pas sans homologation.').any, false)
  })

  test('RED_LINE_PATTERNS : clés historiques conservées, nouvelles familles ajoutées', () => {
    for (const key of ['concealment', 'silence', 'lateNotification', 'untraced', 'bypassApproval', 'dropPentest', 'bypassControl', 'evidenceTampering', 'stolenDataPayment', 'ransomPayment', 'abruptShutdown']) {
      assert.equal(typeof RED_LINE_PATTERNS[key], 'function', key)
    }
    assert.equal(RED_LINE_PATTERNS.bypassApproval('On n\'ouvre pas sans homologation.'), false)
    assert.equal(RED_LINE_PATTERNS.bypassApproval('On ouvre lundi, l\'homologation suivra.'), true)
    assert.equal(RED_LINE_PATTERNS.bypassApproval('On se passe du pentest.'), false)
    assert.equal(RED_LINE_PATTERNS.dropPentest('On se passe du pentest.'), true)
  })

  test('assessAgainstStakeholder (hypotheticalAsQuestion) : le conditionnel franchit ; conditionalAsProbe rétablit l\'ancienne règle', () => {
    const rssi = { id: 'rssi', profile: { redLines: [{ label: 'Gate contournée', families: [{ family: 'bypassControl', controls: ['approval'] }] }] } }
    const cond = assessAgainstStakeholder('On pourrait suspendre la security gate deux sprints sans le noter.', rssi, { hypotheticalAsQuestion: true })
    assert.deepEqual(cond.redLinesCrossed, ['Gate contournée'])
    assert.deepEqual(cond.redLineTriggers['Gate contournée'], ['family:bypassControl'])
    const probe = assessAgainstStakeholder('Et si on suspendait la security gate deux sprints ?', rssi, { hypotheticalAsQuestion: true })
    assert.deepEqual(probe.redLinesProbed, ['Gate contournée'])
    const legacy = assessAgainstStakeholder('On pourrait suspendre la security gate deux sprints.', rssi, { hypotheticalAsQuestion: true, conditionalAsProbe: true })
    assert.deepEqual(legacy.redLinesProbed, ['Gate contournée'])
  })

  test('linkRedLineFamilies / withRedLineFamilies : une app relie une famille à la ligne rouge d\'un acteur', () => {
    const dpo = { id: 'dpo', profile: { redLines: [{ label: 'Retard de notification CNIL' }] } }
    const [linked] = withRedLineFamilies([dpo], { dpo: { 'Retard de notification CNIL': [{ family: 'lateNotification', targets: ['cnil'] }] } })
    assert.deepEqual(assessAgainstStakeholder('Attendons d\'être sûrs avant de parler à la CNIL.', linked).redLinesCrossed, ['Retard de notification CNIL'])
    // Cible imposée : une autre autorité ne déclenche pas cette ligne rouge
    assert.deepEqual(assessAgainstStakeholder('Attendons lundi pour prévenir l\'ACPR.', linked).redLinesCrossed, [])
    const added = linkRedLineFamilies([], { 'Rançon': ['stolenDataPayment'] }, { addMissing: true })
    assert.deepEqual(matchTermGroups('Payons la rançon.', added).met, ['Rançon'])
  })

  test('classifyPlayerMessage : une ligne rouge proposée compte comme proposition, jamais comme simple hypothèse', () => {
    const cls = classifyPlayerMessage('Et si on rachetait discrètement l\'échantillon, puis attendre d\'être sûrs avant de parler à la CNIL.')
    assert.equal(cls.crossesRedLine, true)
    assert.equal(cls.hasProposal, true)
    assert.ok(cls.redLines.crossed.includes('stolenDataPayment'))
    const probe = classifyPlayerMessage('Et si on rachetait l\'échantillon volé ?')
    assert.equal(probe.probesRedLine, true)
    assert.equal(probe.crossesRedLine, false)
  })
})

describe('porte des lignes rouges et dégressivité', () => {
  test('gateDeltas : aucune variation positive si une ligne rouge est franchie ou testée ; plafond négatif sur franchie', () => {
    const d = { security: 4, trust: 2, compliance: -1 }
    assert.deepEqual(gateDeltas(d, false), d)
    assert.deepEqual(gateDeltas(d, { probed: true }), { security: 0, trust: 0, compliance: -1 })
    assert.deepEqual(gateDeltas(d, true, { penalty: { trust: -3 } }), { security: 0, trust: -3, compliance: -1 })
    assert.deepEqual(redLineGateState(detectRedLines('Et si on payait la rançon ?')), { crossed: false, probed: true, labels: [RED_LINE_FAMILIES.stolenDataPayment.label], families: ['stolenDataPayment'] })
  })

  test('applyRedLineGate : tour Gemini ou local (metricsImpact / metricsDelta), profils et familles', () => {
    const turn = { metricsDelta: { security: 3, compliance: 2 } }
    const info = applyRedLineGate(turn, { userMessage: 'Personne ne posera la question, on n\'a pas besoin de le mentionner dans l\'AIPD.' })
    assert.equal(info.crossed, true)
    assert.deepEqual(turn.metricsDelta, { security: 0, compliance: 0 })
    assert.deepEqual(turn._redLineGate.zeroed.sort(), ['compliance', 'security'])
    const clean = { metricsImpact: { security: 3 } }
    assert.equal(applyRedLineGate(clean, { userMessage: 'Je propose un WAF en blocage dès ce soir.' }).gated, false)
    assert.equal(clean.metricsImpact.security, 3)
    const actors = [{ id: 'dg', profile: { redLines: [{ label: 'Report sans date', terms: ['reporter sine die'], impact: { trust: -4 } }] } }]
    const t2 = { metricsImpact: { trust: 2 } }
    applyRedLineGate(t2, { userMessage: 'On va reporter sine die.', actors })
    assert.equal(t2.metricsImpact.trust, -4)
    assert.deepEqual(Object.keys(assessAll('x', actors)), ['dg'])
  })

  test('diminishingReturns : énoncé déjà crédité = 0, peu d\'éléments nouveaux = moitié, nouvel élément = plein', () => {
    const ledger = createCreditLedger()
    const pledge = 'Les DSI des établissements seront associés au cadrage du projet.'
    assert.equal(diminishingReturns(ledger, pledge).factor, 1)
    ledger.record(pledge)
    assert.equal(diminishingReturns(ledger, 'Les DSI des établissements seront bien associés au cadrage du projet.').factor, 0)
    assert.equal(diminishingReturns(ledger, 'Le cadrage du projet associera les DSI des établissements, avec un comité mensuel et une revue trimestrielle chiffrée à 12 k€.').factor, 1)
    assert.equal(statementKey('Retest jeudi à 14 h.'), statementKey('À 14 h jeudi, retest.'))
    assert.deepEqual(applyDiminishingReturns({ a: 5, b: -2 }, 0.5), { a: 2, b: -2 })
    assert.equal(diminishingReturns(null, pledge).factor, 1)
  })
})
