import { jsonrepair } from 'jsonrepair'
import { containsTerm, matchTermGroups, describeStakeholderForPrompt, assessAgainstStakeholder } from './services/stakeholderProfile.js'

// La famille gemini-1.5 est retirée : chaque appel échouait et basculait sur le moteur local
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
export const FALLBACK_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

export { containsTerm, matchTermGroups, findMentionedActors, describeStakeholderForPrompt, assessAgainstStakeholder } from './services/stakeholderProfile.js'

export class WarRoomEngine {
  /**
   * Initialise le moteur de War Room.
   * @param {Object} options 
   * @param {string} options.apiKey Clé API Gemini
   * @param {string} options.model Modèle préféré (ex: 'gemini-2.5-flash')
   * @param {Function} options.systemPromptGenerator Fonction retournant le prompt système
   * @param {Function} options.localSimulator Fonction de fallback si Gemini échoue
   * @param {number} options.maxTokens (Optionnel) Max tokens, defaut 2048
   */
  constructor(options) {
    this.apiKey = options.apiKey
    this.model = options.model || DEFAULT_GEMINI_MODEL
    this.systemPromptGenerator = options.systemPromptGenerator
    this.localSimulator = options.localSimulator
    this.candidateModels = options.candidateModels || FALLBACK_GEMINI_MODELS
    this.maxTokens = options.maxTokens || 2048
  }
  
  /**
   * Parse et répare un JSON tronqué ou malformé grâce à jsonrepair
   */
  parseGeminiJson(rawText) {
    if (!rawText || !rawText.trim()) {
      throw new Error("Réponse vide reçue de Gemini")
    }
    let cleaned = rawText.trim()
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1)
    } else if (firstBrace !== -1) {
      // JSON tronqué (il manque des fermetures)
      cleaned = cleaned.slice(firstBrace)
    }

    try {
      const repaired = jsonrepair(cleaned)
      return JSON.parse(repaired)
    } catch (err) {
      throw new Error(`Format JSON irrécupérable : ${err.message}`)
    }
  }

  /**
   * Construit un historique valide pour l'API Gemini (strictement alterné user/model)
   */
  buildAlternatingContents(history, userMessage) {
    const contents = []
    let currentGroupRole = null
    let currentGroupTexts = []

    const eligibleHistory = (history || []).slice(-12).filter(msg => msg.sender !== 'system' && msg.sender !== 'arbitration')

    eligibleHistory.forEach(msg => {
      const role = msg.sender === 'user' ? 'user' : 'model'
      const text = msg.sender === 'user' 
        ? msg.text 
        : `[${msg.actorName || msg.actorId || 'Acteur'} (${msg.actorRole || ''})]: ${msg.text}`

      if (currentGroupRole === null) {
        currentGroupRole = role
        currentGroupTexts.push(text)
      } else if (currentGroupRole === role) {
        currentGroupTexts.push(text)
      } else {
        contents.push({
          role: currentGroupRole,
          parts: [{ text: currentGroupTexts.join('\n\n') }]
        })
        currentGroupRole = role
        currentGroupTexts = [text]
      }
    })

    if (currentGroupRole !== null && currentGroupTexts.length > 0) {
      contents.push({
        role: currentGroupRole,
        parts: [{ text: currentGroupTexts.join('\n\n') }]
      })
    }

    // Le premier message DOIT être 'user'
    while (contents.length > 0 && contents[0].role !== 'user') {
      contents.shift()
    }

    const promptInstruction = `L'utilisateur intervient : "${userMessage}".\nRépondez directement à ses propos ou à ses questions sans jamais répéter les mêmes phrases génériques. Faites réagir 2 à 3 membres du comité selon leurs tempéraments actifs et générez le JSON de réponse.`

    // Le dernier message DOIT être 'user'
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n[Nouvelle intervention] : ${userMessage}`
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: promptInstruction }]
      })
    }
    
    return contents
  }

  /**
   * Joue un tour de War Room en tentant Gemini d'abord, puis le simulateur local.
   */
  async playTurn({ actors, scenario, metrics, userMessage, history }) {
    if (!this.apiKey) {
      const res = this.localSimulator({ actors, scenario, metrics, userMessage, history })
      res._engineFallback = true
      return res
    }

    const systemPrompt = this.systemPromptGenerator(actors, scenario, metrics)
    const contents = this.buildAlternatingContents(history, userMessage)

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.85,
        maxOutputTokens: this.maxTokens
      }
    }
    
    let lastError = null
    const modelsToTry = [this.model, ...this.candidateModels]
    const uniqueModels = Array.from(new Set(modelsToTry.map(m => m.replace(/^models\//, ''))))

    for (const mName of uniqueModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${this.apiKey.trim()}`
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          const data = await response.json()
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (rawText) {
            const parsed = this.parseGeminiJson(rawText)
            
            if (parsed && parsed.metricsImpact) {
              const normalizeDelta = (val) => {
                if (typeof val !== 'number' || isNaN(val)) return 0
                return Math.max(-20, Math.min(20, Math.round(val)))
              }
              parsed.metricsImpact = {
                security: normalizeDelta(parsed.metricsImpact.security),
                compliance: normalizeDelta(parsed.metricsImpact.compliance),
                trust: normalizeDelta(parsed.metricsImpact.trust),
                teamClimate: normalizeDelta(parsed.metricsImpact.teamClimate)
              }
            }
            parsed._engineUsedModel = mName
            return parsed
          }
        } else {
          const errObj = await response.json().catch(() => ({}))
          lastError = new Error(errObj.error?.message || `HTTP ${response.status} sur modèle ${mName}`)
        }
      } catch (netErr) {
        lastError = netErr
      }
    }
    
    console.warn(`[WarRoomEngine] Tous les appels Gemini ont échoué, bascule locale. Dernière erreur:`, lastError?.message)
    const localRes = this.localSimulator({ actors, scenario, metrics, userMessage, history })
    localRes._engineFallback = true
    localRes._engineError = lastError
    return localRes
  }
}

export async function fetchAvailableGeminiModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return []
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`
    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      return (data.models || [])
        .filter(m => m.supportedGenerationMethods.includes('generateContent') && m.name.includes('gemini'))
        .map(m => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name }))
    }
  } catch (err) {
    console.warn("Impossible de lister les modèles :", err)
  }
  return []
}

export async function testGeminiApiKey(apiKey, requestedModel = null) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Clé API requise')
  }

  const models = await fetchAvailableGeminiModels(apiKey)
  if (!models || models.length === 0) {
    throw new Error('Aucun modèle de génération compatible détecté pour cette clé API')
  }

  const cleanRequested = (requestedModel || '').replace(/^models\//, '')
  const validModelObj = models.find(m => m.id === cleanRequested) || models[0]
  const validModel = validModelObj.id

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${validModel}:generateContent?key=${apiKey.trim()}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'OK' }] }]
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Erreur de connexion API (${response.status})`)
  }

  return { success: true, models, testedModel: validModel }
}

export function parseGeminiJson(rawText) {
  const engine = new WarRoomEngine({})
  return engine.parseGeminiJson(rawText)
}


/**
 * Moteur d'évaluation pédagogique (Tech-to-Board) : Gemini, avec repli local.
 *
 * caseStudy (champs communs aux deux applications, tous optionnels sauf le texte de référence) :
 *   context, technicalFact, decisionQuestion (ou boardQuestion), idealAnswer (ou suggestedPitch),
 *   mustConvey: TermGroup[]  faits à transmettre, pitfalls: TermGroup[]  affirmations à proscrire,
 *   jargonWords, businessWords, actionWords, keywordsToInclude: string[]
 * stakeholder : acteur de data/actors.js avec son profile (voir services/stakeholderProfile.js)
 */
export class TechToBoardEngine {
  constructor(options = {}) {
    this.apiKey = options.apiKey || null
    this.model = options.model || DEFAULT_GEMINI_MODEL
  }

  evaluateLocally(text, caseStudy = {}, stakeholder = null) {
    const lower = (text || '').toLowerCase()
    const feedback = []
    const hits = (words) => (words || []).filter((w) => containsTerm(lower, w, { prefix: true })).length
    let score = 50

    // 1. Jargon, selon la tolérance du décideur visé
    const jargonCount = (caseStudy.jargonWords || []).filter((w) => containsTerm(lower, w)).length
    const tolerance = stakeholder?.profile?.jargonTolerance || 'low'
    if (caseStudy.jargonWords?.length) {
      if (tolerance === 'high') {
        if (jargonCount >= 1) { score += 10; feedback.push('✅ Précision technique adaptée à cet interlocuteur.') }
        else { score -= 5; feedback.push('💡 Cet interlocuteur attend des précisions techniques.') }
      } else if (tolerance === 'medium') {
        if (jargonCount > 3) { score -= 10; feedback.push('💡 Beaucoup de termes techniques : expliquez-les.') }
        else { score += 5 }
      } else if (jargonCount > 2) { score -= 20; feedback.push('⚠️ Trop de jargon technique brut : la direction décrochera.') }
      else if (jargonCount > 0) { score -= 8; feedback.push('💡 Présence de jargon : préférez une analogie fonctionnelle.') }
      else { score += 10; feedback.push('✅ Bon niveau de vulgarisation.') }
    }

    // 2. Vocabulaire métier attendu (cas Cyber) ou mots-clés du cas (cas CTI)
    if (caseStudy.businessWords?.length && hits(caseStudy.businessWords) >= 2) {
      score += 10
      feedback.push('✅ Orientation métier (patients, coûts, planning, réputation).')
    }
    if (caseStudy.keywordsToInclude?.length) {
      const matched = hits(caseStudy.keywordsToInclude)
      score += Math.round((matched / caseStudy.keywordsToInclude.length) * 40) - 15
      feedback.push(`Concepts clés couverts : ${matched} / ${caseStudy.keywordsToInclude.length}.`)
    }

    // 3. Faits à transmettre et affirmations à proscrire
    const convey = matchTermGroups(lower, caseStudy.mustConvey)
    score += convey.met.length * 5
    if (convey.missed.length) feedback.push(`💡 Il manque : ${convey.missed.join(', ')}.`)
    const pitfalls = matchTermGroups(lower, caseStudy.pitfalls)
    score -= pitfalls.met.length * 15
    pitfalls.met.forEach((label) => feedback.push(`⚠️ À proscrire : ${label}.`))
    const breaches = [...pitfalls.met]

    // 4. Attentes et lignes rouges du décideur
    let assessment = null
    if (stakeholder) {
      assessment = assessAgainstStakeholder(lower, stakeholder)
      score += assessment.expectationsMet.length * 4
      if (assessment.expectationsMissed.length) {
        feedback.push(`💡 ${stakeholder.name} attend aussi : ${assessment.expectationsMissed.join(', ')}.`)
      }
      score -= assessment.redLinesCrossed.length * 15
      assessment.redLinesCrossed.forEach((label) => feedback.push(`⛔ Ligne rouge pour ${stakeholder.name} : ${label}.`))
      breaches.push(...assessment.redLinesCrossed)
    }

    // 5. Une note au décideur se termine par une décision, un délai ou une demande d'arbitrage
    if (caseStudy.actionWords?.length) {
      if (hits(caseStudy.actionWords)) { score += 10; feedback.push('✅ Recommandation actionnable.') }
      else { score -= 10; feedback.push('💡 Aucune décision explicite : terminez par ce que vous demandez au décideur.') }
    }

    // 6. Une liste de mots-clés n'est pas une synthèse rédigée
    const wordCount = lower.split(/\s+/).filter(Boolean).length
    if (wordCount < 40) {
      score = Math.min(score, 55)
      feedback.push('⚠️ Réponse trop courte : rédigez faits, impact, niveau de confiance et recommandation.')
    }

    // Un piège ou une ligne rouge franchis empêchent une bonne note, quel que soit le reste
    const rawScore = Math.round(score)
    score = Math.max(0, Math.min(100, rawScore))
    if (breaches.length) score = Math.min(score, 45)
    const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'

    return {
      score,
      rawScore,
      grade,
      feedback,
      stakeholderReaction: { text: this.localReaction(score, caseStudy, stakeholder, breaches, assessment) },
      dgReaction: "Merci pour ce point, nous allons l'analyser.",
      _engineFallback: true
    }
  }

  // Réaction hors ligne : celle rédigée pour le cas si elle existe, sinon tirée du profil du décideur
  localReaction(score, caseStudy, stakeholder, breaches, assessment) {
    const band = score >= 75 ? 'success' : score >= 50 ? 'neutral' : 'fail'
    const written = caseStudy.stakeholders?.[stakeholder?.id]?.reactions?.[band]
    if (written) return written
    if (breaches.length) return `« ${breaches[0]} : je ne peux pas valider cela en l'état. »`
    const missing = assessment?.expectationsMissed?.[0]
    if (band === 'success') return '« Clair et actionnable, je valide la recommandation. »'
    if (missing) return `« Sur le principe je vous suis, mais il me manque : ${missing.charAt(0).toLowerCase() + missing.slice(1)}. »`
    return '« Intéressant, mais nous devons en rediscuter. »'
  }

  async evaluateAnswer({ text, caseStudy = {}, stakeholder = null }) {
    if (!this.apiKey || !text || text.trim().length < 10) {
      return this.evaluateLocally(text, caseStudy, stakeholder)
    }

    const labels = (groups) => (groups || []).map((g) => `- ${g.label}`).join('\n')
    const systemInstruction = `Tu es un coach expert en communication pour responsables cybersécurité et CTI. Tu évalues la capacité d'un expert à exposer un sujet technique à un décideur précis, dont le profil est fourni.

Règles de notation :
- Adapte l'exigence de vulgarisation à la tolérance au jargon du décideur.
- Valorise : faits exacts, impact métier chiffré, niveau de confiance explicite, recommandation actionnable (décision, délai, arbitrage demandé), réponse aux enjeux et attentes du décideur.
- Sanctionne : affirmations à proscrire listées, franchissement des lignes rouges du décideur, promesses non tenables, jargon non expliqué pour un non-technicien.

Réponds UNIQUEMENT par un objet JSON valide (sans markdown) :
{
  "score": <0 à 100>,
  "grade": "<A, B, C ou D>",
  "feedback": ["<point fort>", "<point d'amélioration>", "<conseil sur la formulation pour ce décideur>"],
  "stakeholderReaction": { "text": "<réaction parlée, crédible, de ce décideur à cette réponse>" }
}`

    const userPrompt = `
DÉCIDEUR VISÉ
${describeStakeholderForPrompt(stakeholder) || 'Comité de direction'}

CAS
Contexte : ${caseStudy.context || caseStudy.title || ''}
Fait technique : ${caseStudy.technicalFact || ''}
Question du décideur : ${caseStudy.decisionQuestion || caseStudy.boardQuestion || ''}
Faits à transmettre :
${labels(caseStudy.mustConvey) || '- (non précisé)'}
Affirmations à proscrire :
${labels(caseStudy.pitfalls) || '- (non précisé)'}
Réponse de référence : ${caseStudy.idealAnswer || caseStudy.suggestedPitch || 'Une réponse claire, orientée risque et métier, sans jargon.'}

---
Réponse de l'apprenant :
"${text}"
`

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model.replace('models/', '')}:generateContent?key=${this.apiKey.trim()}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (rawText) return parseGeminiJson(rawText)
      }
    } catch (e) {
      console.warn('Erreur Gemini TechToBoard:', e)
    }

    return this.evaluateLocally(text, caseStudy, stakeholder)
  }
}
export { default as cyberVisualsPreset } from './tailwind.preset.js'
