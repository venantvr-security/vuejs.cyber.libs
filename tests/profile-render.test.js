import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  matchTermGroups,
  assessAgainstStakeholder,
  assessAll,
  isHypotheticalSentence,
  mergeStakeholderForScenario,
  describeStakeholderForPrompt,
  shortRegulatoryRef,
  RED_LINE_PATTERNS,
  meetsRequirements,
  containsTerm,
  buildFollowUpQuestion,
  createReplyPicker,
  frenchTypography,
  formatChatText,
  readingPause,
  typingDelay,
  classifyPlayerMessage
} from '../index.js'
import { ACTORS, seq } from './fixtures.js'

describe('profil : motifs de lignes rouges, cooccurrence, preuves, formes conjuguées', () => {
  test('RED_LINE_PATTERNS : dissimulation, notification retardée, contournement d\'homologation ; tournures refusées ignorées', () => {
    assert.equal(RED_LINE_PATTERNS.concealment('On déploie lundi sans rien dire à l\'ARS.'), true)
    assert.equal(RED_LINE_PATTERNS.concealment('Il est exclu de déployer sans rien dire à l\'ARS.'), false)
    assert.equal(RED_LINE_PATTERNS.lateNotification('On attendra la fin de la conférence pour notifier la CNIL.'), true)
    assert.equal(RED_LINE_PATTERNS.lateNotification('Nous ne retarderons pas la notification.'), false)
    assert.equal(RED_LINE_PATTERNS.bypassApproval('On ouvre lundi sans attendre la FARR.'), true)
    assert.equal(RED_LINE_PATTERNS.bypassApproval('Nous ne déploierons pas sans homologation.'), false)
    assert.equal(RED_LINE_PATTERNS.bypassApproval('Homologation a posteriori, ça ira.'), true)
    assert.equal(RED_LINE_PATTERNS.dropPentest('On supprime le pentest.'), true)
  })

  test('TermGroup : patterns, all (cooccurrence), requires (preuve), conjugate', () => {
    const groups = [
      { label: 'Dissimulation', patterns: ['concealment'] },
      { label: 'Notification ANSSI', all: [['notif', 'signal'], ['anssi']] },
      { label: 'Coût chiffré', terms: ['coût', 'budget'], requires: ['amount'] },
      { label: 'Coupure SCADA', terms: ['couper le scada'], conjugate: true }
    ]
    assert.deepEqual(matchTermGroups('Notification faite hier.', groups).met, [])
    assert.deepEqual(matchTermGroups('Notification à l\'ANSSI sous 24 h.', groups).met, ['Notification ANSSI'])
    assert.deepEqual(matchTermGroups('Le coût est maîtrisé.', groups).met, [])
    assert.deepEqual(matchTermGroups('Le coût est de 40 k€.', groups).met, ['Coût chiffré'])
    assert.deepEqual(matchTermGroups('Et si on coupait le SCADA ?', groups).met, ['Coupure SCADA'])
    assert.deepEqual(matchTermGroups('On garde tout pour nous, motus.', groups).triggers, { Dissimulation: ['concealment'] })
    assert.equal(containsTerm('nous laissons passer', 'laisser passer', { conjugate: true }), true)
    assert.equal(containsTerm('nous laissons passer', 'laisser passer'), false)
    assert.equal(meetsRequirements('Livraison jeudi', ['date']), true)
    assert.equal(meetsRequirements('Livraison bientôt', ['date']), false)
  })

  test('isHypotheticalSentence : « si X, on fera Y » est un engagement ; conditionnel et « si » + imparfait sont exploratoires', () => {
    assert.equal(isHypotheticalSentence('Si une fuite arrive, on attendra la fin du trimestre.'), false)
    assert.equal(isHypotheticalSentence('Si on coupait le SCADA, on perdrait la production.'), true)
    assert.equal(isHypotheticalSentence('On pourrait couper le VPN.'), true)
    assert.equal(isHypotheticalSentence('Et si on passait sans correctif ?'), true)
    assert.equal(classifyPlayerMessage('Si on achetait le lot, on serait couverts.').isHypothetical, true)
  })

  test('assessAgainstStakeholder : ligne rouge conjuguée testée, engagement conditionnel franchi, attentes neutralisées', () => {
    const ot = { id: 'ot', name: 'Claire Ot', profile: { expectations: [{ label: 'Date', terms: ['lundi'] }], redLines: [{ label: 'Coupure SCADA', terms: ['couper le scada'] }, { label: 'Notification retardée', patterns: ['lateNotification'] }] } }
    const probe = assessAgainstStakeholder('Et si on coupait le SCADA ?', ot, { hypotheticalAsQuestion: true })
    assert.deepEqual(probe.redLinesProbed, ['Coupure SCADA'])
    const pledge = assessAgainstStakeholder('Si une fuite arrive, on attendra la fin du trimestre pour notifier.', ot, { hypotheticalAsQuestion: true })
    assert.deepEqual(pledge.redLinesCrossed, ['Notification retardée'])
    assert.deepEqual(pledge.redLineTriggers['Notification retardée'], ['lateNotification'])
    const mixed = assessAgainstStakeholder('On coupe le SCADA lundi.', ot)
    assert.deepEqual(mixed.expectationsMet, [])
    assert.deepEqual(assessAgainstStakeholder('On coupe le SCADA lundi.', ot, { neutralizeRedLineSentences: false }).expectationsMet, ['Date'])
    const all = assessAll('On déploie lundi sans rien dire à l\'ARS.', [{ id: 'a', profile: { redLines: [{ label: 'Silence', patterns: ['concealment'] }] } }, { id: 'b', profile: { expectations: [{ label: 'Date', terms: ['lundi'] }] } }])
    assert.deepEqual(all.a.redLinesCrossed, ['Silence'])
    assert.deepEqual(all.b.expectationsMet, [])
  })

  test('mergeStakeholderForScenario : angle par scénario (concern, keyAngle, expectations, redLines, questions)', () => {
    const scenario = { actorAngles: { rssi: { concern: 'La faille du portail', keyAngle: 'un retest daté', expectations: [{ label: 'Retest daté', terms: ['retest'] }], redLines: [{ label: 'Silence', patterns: ['concealment'] }], questions: ['Qui retest ?'] } } }
    const merged = mergeStakeholderForScenario(ACTORS[1], scenario)
    assert.equal(merged.profile.stakes[0], 'La faille du portail')
    assert.ok(merged.profile.evaluationCriteria.includes('Angle attendu sur ce scénario : un retest daté'))
    assert.deepEqual(merged.profile.expectations.map((g) => g.label), ['Retest daté'])
    assert.deepEqual(merged.profile.redLines.map((g) => g.label), ['Silence', 'Mise en production sans correctif'])
    assert.deepEqual(merged.profile.questions, ['Qui retest ?'])
    assert.equal(merged.scenarioAngle, scenario.actorAngles.rssi)
    assert.equal(mergeStakeholderForScenario(ACTORS[0], scenario), ACTORS[0])
  })

  test('describeStakeholderForPrompt : options compactes ; shortRegulatoryRef', () => {
    assert.equal(shortRegulatoryRef('RGPD art. 33 (violation) : notification à la CNIL sous 72 h'), 'RGPD art. 33')
    const actor = { ...ACTORS[2], profile: { ...ACTORS[2].profile, evaluationCriteria: ['Rigueur'], decisionRights: { advises: ['AIPD'] }, regulatoryFocus: ['RGPD art. 33 : 72 h', 'RGPD art. 34 : information des personnes'] } }
    const full = describeStakeholderForPrompt(actor)
    assert.match(full, /Interpellé par/)
    assert.match(full, /Donne un avis sur : AIPD/)
    const compact = describeStakeholderForPrompt(actor, { compact: true })
    assert.ok(!/Interpellé par|Juge une proposition|Donne un avis/.test(compact))
    assert.match(compact, /- Cadre surveillé : RGPD art\. 33 ; RGPD art\. 34/)
    assert.ok(!/Cadre surveillé/.test(describeStakeholderForPrompt(actor, { regulatoryFocus: 'none' })))
  })
})

describe('relances locales (buildFollowUpQuestion)', () => {
  test('relance : jamais de préfixe imbriqué ; detailed renvoie la question d\'origine', () => {
    const q = buildFollowUpQuestion({ actor: ACTORS[1], plan: { kind: 'relance', topic: 'Je repose ma question : Vous n\'avez pas répondu : quelle date ?' }, rng: seq(0.6), detailed: true })
    assert.equal(q.text, 'Vous n\'avez pas répondu : quelle date ?')
    assert.equal(q.question, 'Quelle date ?')
  })

  test('challenge : redLines[].question du profil, sinon tournure correcte (« côté … ») ou sans enjeu', () => {
    const actor = { id: 'soc', profile: { redLines: [{ label: 'Chaîne de preuve rompue', terms: ['effacer'], question: 'Qui garantit la chaîne de preuve si on réimage maintenant ?' }], stakes: ['chaîne de preuve intacte'] } }
    assert.equal(buildFollowUpQuestion({ actor, plan: { kind: 'challenge', topic: 'Chaîne de preuve rompue' }, rng: seq(0) }), 'Qui garantit la chaîne de preuve si on réimage maintenant ?')
    const other = buildFollowUpQuestion({ actor, plan: { kind: 'challenge', topic: 'Autre ligne' }, rng: seq(0) })
    assert.equal(other, 'Vous mesurez ce que « autre ligne » implique, notamment côté chaîne de preuve intacte ?')
    assert.equal(buildFollowUpQuestion({ actor: { id: 'x' }, plan: { kind: 'challenge', topic: 'Report' }, rng: seq(0) }), 'Vous mesurez ce que « report » implique ?')
  })

  test('précision : expectations[].question, forme orale (spoken), libellé sans parenthèse ; picker évite la répétition', () => {
    const actor = { id: 'dpo', activePreset: 'cooperative', profile: { expectations: [
      { label: 'Notification CNIL', terms: ['cnil'], question: 'À quelle heure avez-vous eu connaissance de la violation ?' },
      { label: 'Partage maîtrisé (TLP:AMBER, besoin d\'en connaître)', terms: ['tlp'] },
      { label: 'Registre', terms: ['registre'], spoken: 'la mise à jour du registre' }
    ] } }
    const picker = createReplyPicker({ rng: seq(0) })
    assert.equal(buildFollowUpQuestion({ actor, plan: { kind: 'clarification', topic: 'Notification CNIL' }, picker }), 'À quelle heure avez-vous eu connaissance de la violation ?')
    assert.notEqual(buildFollowUpQuestion({ actor, plan: { kind: 'clarification', topic: 'Notification CNIL' }, picker }), 'À quelle heure avez-vous eu connaissance de la violation ?')
    assert.equal(buildFollowUpQuestion({ actor, plan: { kind: 'clarification', topic: 'Partage maîtrisé (TLP:AMBER, besoin d\'en connaître)' }, rng: seq(0) }), 'Et concrètement, « partage maîtrisé » : qui s\'en charge et pour quand ?')
    assert.equal(buildFollowUpQuestion({ actor, plan: { kind: 'clarification', topic: 'Registre' }, rng: seq(0) }), 'Et concrètement, la mise à jour du registre : qui s\'en charge et pour quand ?')
  })
})

describe('rendu : typographie et rythme', () => {
  test('frenchTypography : espaces insécables, idempotent, heures et URL intactes ; formatChatText l\'applique', () => {
    const out = frenchTypography('Alors : « oui » ? Non! À 08:00 voir https://x.fr/?a=1')
    assert.equal(out, 'Alors : « oui » ? Non ! À 08:00 voir https://x.fr/?a=1'.replace(' ?', ' ?'))
    assert.equal(frenchTypography(out), out)
    assert.equal(formatChatText('Vraiment ?'), 'Vraiment ?')
    assert.equal(formatChatText('Vraiment ?', { typography: false }), 'Vraiment ?')
  })

  test('typingDelay (défauts plus lents) et readingPause bornés', () => {
    assert.equal(typingDelay('un deux trois quatre'), 700)
    assert.equal(typingDelay('mot '.repeat(40)), 2250)
    assert.equal(readingPause(''), 600)
    assert.equal(readingPause('mot '.repeat(20)), 1550)
    assert.equal(readingPause('mot '.repeat(500)), 2800)
  })
})
