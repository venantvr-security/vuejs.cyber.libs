import { jsonrepair } from 'jsonrepair'

// La famille gemini-1.5 est retirée : chaque appel échouait et basculait sur le moteur local
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
export const FALLBACK_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

/**
 * Présence d'un terme en début de mot (insensible à la casse) : évite les faux positifs par
 * sous-chaîne (« acl » dans « miracle », « red » dans « credential »).
 * prefix: true accepte les flexions (« bloqué » → « bloquée », « investir » → « investirons »).
 */
export function containsTerm(text, term, { prefix = false } = {}) {
  if (!text || !term) return false
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const end = prefix ? '' : '(?=$|[^\\p{L}\\p{N}])'
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}${end}`, 'u').test(text.toLowerCase())
}

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
 * Moteur d'évaluation Pédagogique (Tech to Board) avec Gemini et fallback local.
 */
export class TechToBoardEngine {
  constructor(options = {}) {
    this.apiKey = options.apiKey || null
    this.model = options.model || DEFAULT_GEMINI_MODEL
  }

  // Fallback local statique mutualisé
  evaluateLocally(text, caseStudy, targetStakeholderId) {
    const lower = (text || '').toLowerCase();
    let score = 50;
    const feedback = [];
    
    // Support for both Cyber and CTI data structures
    const isCyber = !!caseStudy.jargonWords;
    
    if (isCyber) {
      // Logique Cyber (Jargon, Business, Stakeholders)
      const st = caseStudy?.stakeholders?.[targetStakeholderId] || caseStudy?.stakeholders?.dg;
      const jargon = caseStudy.jargonWords || [];
      let jargonCount = 0;
      jargon.forEach(w => { if (containsTerm(lower, w)) jargonCount++ });
      
      if (targetStakeholderId === 'rssi' || targetStakeholderId === 'leaddev') {
        if (jargonCount >= 1) { score += 15; feedback.push("✅ Précision technique adaptée."); }
        else { score -= 5; feedback.push("💡 Un interlocuteur technique appréciera plus de précisions."); }
      } else {
        if (jargonCount > 2) { score -= 25; feedback.push("⚠️ Trop de jargon technique brut. La direction décrochera."); }
        else if (jargonCount > 0) { score -= 10; feedback.push("💡 Présence de jargon. Utilisez une analogie fonctionnelle."); }
        else { score += 15; feedback.push("✅ Bon niveau de vulgarisation sans jargon barbare."); }
      }
      
      const business = caseStudy.businessWords || [];
      let bCount = 0;
      business.forEach(w => { if (containsTerm(lower, w, { prefix: true })) bCount++ });
      if (bCount >= 2) { score += 20; feedback.push("✅ Excellente orientation métier et business."); }

      // Une note au décideur doit déboucher sur une action, un délai ou une demande d'arbitrage
      const actions = caseStudy.actionWords || [];
      const hasAction = actions.some(w => containsTerm(lower, w, { prefix: true }));
      if (hasAction) { score += 10; feedback.push("✅ Recommandation actionnable (décision, délai ou arbitrage demandé)."); }
      else if (actions.length) { score -= 10; feedback.push("💡 Aucune action ni décision explicite : terminez par ce que vous demandez au décideur."); }
      
      // Additional check for length
      if (lower.length < 50) { score -= 20; feedback.push("⚠️ Réponse beaucoup trop courte pour être convaincante."); }
      
    } else {
      // Logique CTI (Keywords, Length)
      const keywords = caseStudy.keywordsToInclude || [];
      let matched = 0;
      keywords.forEach(kw => { if (containsTerm(lower, kw, { prefix: true })) matched++ });
      
      const lengthScore = Math.min(30, Math.round(lower.length / 10));
      const keywordScore = keywords.length > 0 ? Math.round((matched / keywords.length) * 70) : 70;
      score = Math.min(100, lengthScore + keywordScore);

      // Une simple liste de mots-clés n'est pas une synthèse : plafond si le texte n'est pas rédigé
      const wordCount = lower.split(/\s+/).filter(Boolean).length;
      if (wordCount < 40) {
        score = Math.min(score, 55);
        feedback.push("⚠️ Réponse trop courte pour une note au Board : rédigez faits, impact, niveau de confiance et recommandation.");
      }
      
      feedback.push(`Vous avez inclus ${matched} mots-clés stratégiques sur ${keywords.length}.`);
      if (matched === keywords.length) {
        feedback.push("✅ Couverture parfaite des concepts clés.");
      } else {
        feedback.push("💡 Pensez à intégrer davantage les termes stratégiques attendus par la direction.");
      }
    }
    
    score = Math.max(0, Math.min(100, score));
    let grade = 'C';
    if (score >= 80) grade = 'A';
    else if (score >= 60) grade = 'B';
    else if (score < 40) grade = 'D';

    return {
      score,
      grade,
      feedback,
      stakeholderReaction: { text: "Intéressant, mais nous devons en rediscuter." },
      dgReaction: "Merci pour ce point, nous allons l'analyser.",
      _engineFallback: true
    }
  }

  async evaluateAnswer({ text, caseStudy, targetStakeholderId = 'dg' }) {
    if (!this.apiKey || !text || text.trim().length < 10) {
      return this.evaluateLocally(text, caseStudy, targetStakeholderId)
    }

    const systemInstruction = `Tu es un coach expert en communication pour responsables Cybersécurité et CTI (Cyber Threat Intelligence). Ton rôle est d'évaluer la capacité d'un expert à vulgariser un sujet complexe pour un décideur ou un membre du comité de direction (DG, DSI, DPO, RSSI, etc).

Tu reçois la situation (Contexte, Fait Technique, Question du comité) et le texte rédigé par l'apprenant. La cible est : ${targetStakeholderId}.

Règles de notation :
- Le jargon technique brut non expliqué est sanctionné s'il s'adresse à un non-technicien (DG, DPO). Il est toléré pour un RSSI/LeadDev.
- L'apprenant doit utiliser des analogies fonctionnelles et parler "Métier" (impacts business, financiers, réputationnels).
- Le ton doit être professionnel, rassurant mais factuel.

Tu dois répondre UNIQUEMENT par un objet JSON valide (sans markdown) avec cette structure exacte :
{
  "score": <nombre entre 0 et 100>,
  "grade": "<lettre A, B, C ou D>",
  "feedback": [
    "<point fort 1>",
    "<point d'amélioration 1>",
    "<conseil spécifique sur l'analogie ou le ton>"
  ],
  "stakeholderReaction": {
    "text": "<Une phrase de réaction typique et en langage parlé du décideur cible face à cette réponse, ex: 'C'est bien beau vos histoires de hash, mais ça coûte combien cette panne ?'>"
  }
}`;

    // Les cas CTI fournissent context/technicalFact/boardQuestion ; les cas Cyber rawReport et
    // stakeholders : sans ce repli, le modèle notait sur un contexte « undefined »
    const st = caseStudy?.stakeholders?.[targetStakeholderId] || caseStudy?.stakeholders?.dg
    const context = caseStudy.context || caseStudy.title || ''
    const technicalFact = caseStudy.technicalFact || caseStudy.rawReport || ''
    const boardQuestion = caseStudy.boardQuestion || (st ? `${st.name} (${st.title}) s'inquiète : ${st.concern}` : '')
    const reference = caseStudy.idealAnswer || st?.suggestedPitch || caseStudy.suggestedPitch || 'Une réponse claire, orientée risque et métier, sans jargon.'
    const expectedAngle = st?.keyAngle ? `\nAngle attendu pour ce décideur : ${st.keyAngle}` : ''

    const userPrompt = `
Contexte du cas : ${context}
Fait technique : ${technicalFact}
Question posée par le décideur : ${boardQuestion}${expectedAngle}
Réponse idéale de référence : ${reference}

---
Réponse fournie par l'apprenant :
"${text}"
`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model.replace('models/', '')}:generateContent?key=${this.apiKey.trim()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          return parseGeminiJson(rawText);
        }
      }
    } catch (e) {
      console.warn('Erreur Gemini TechToBoard:', e);
    }
    
    return this.evaluateLocally(text, caseStudy, targetStakeholderId);
  }
}
export { default as cyberVisualsPreset } from './tailwind.preset.js'
