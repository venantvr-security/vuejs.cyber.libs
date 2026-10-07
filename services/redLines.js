// Lignes rouges génériques : familles de propositions fautives reconnues par leur structure (morphologie,
// tournures, champs sémantiques), sans liste de phrases. Module pur, sans Vue.
//
// Trois issues pour une phrase qui évoque une famille :
//   - 'crossed' : PROPOSITION, quelle qu'en soit la forme (affirmative, conditionnel « on pourrait… »,
//     impératif « évitons de… », infinitif « inutile d'en parler », futur proche, euphémisme, question
//     orientée « pourquoi ne pas… ? », proposition suivie d'une demande d'accord « …, d'accord ? ») ;
//   - 'probed'  : vraie QUESTION exploratoire, sans engagement (« Et si on… ? », « Que se passerait-il si… ? »,
//     « Peut-on légalement… ? », « Je me demande si… ») ;
//   - aucune    : négation réelle (« on ne retardera pas la notification », « hors de question de dissimuler »,
//     « n'ouvrons pas sans homologation »), mise en garde (« attendre lundi nous mettrait hors délai »),
//     contraste (« plutôt que d'attendre… »).
//
// Familles : concealment, lateNotification, bypassControl, evidenceTampering, stolenDataPayment, abruptShutdown.
// Chacune est paramétrable (cibles, contrôles) et peut être reliée aux lignes rouges d'un acteur :
// { label, families: ['concealment', { family: 'lateNotification', targets: ['cnil', 'anssi'] }] }.

import { normalize, splitSentences } from './text.js'

// ---------------------------------------------------------------------------------------------
// Briques lexicales (texte normalisé : minuscules, sans accents, apostrophes droites, traits d'union → espaces)
// ---------------------------------------------------------------------------------------------

const L = String.raw`\p{L}`
// Terminaisons des verbes du 1er groupe (« parl » → parle, parler, parlons, parlerait, parlé…)
const ER = String.raw`(?:e|es|ent|er|ez|ons|ais|ait|aient|ions|iez|ant|ee|ees|era|eras|erai|erons|erez|eront|erais|erait|erions|eriez|eraient|a|ai|as)`
// Terminaisons des verbes du 2e groupe (« avert » → avertir, avertissons, avertira…)
const IR = String.raw`(?:ir|is|it|issons|issez|issent|irai|iras|ira|irons|irez|iront|irais|irait|irions|iriez|iraient|issais|issait|issions|issiez|issaient|issant|ie|ies)`
const er = (...stems) => `(?:${stems.join('|')})${ER}`
const ir = (...stems) => `(?:${stems.join('|')})${IR}`
const alt = (...parts) => `(?:${parts.join('|')})`

// Pronoms compléments et petits mots qui s'intercalent (« ne LE dites pas », « sans EN parler », « ne RIEN dire »)
const PRON = String.raw`(?:(?:le|la|les|leur|lui|en|y|rien|vous|nous|ca|cela|meme|surtout|forcement|vraiment|encore|trop|tout de suite|pour l'instant|pour le moment|pour autant) |l')`
// Déterminants
const DET = String.raw`(?:(?:le|la|les|un|une|des|du|de la|au|aux|a la|ce|cet|cette|ces|notre|nos|votre|vos|leur|leurs|son|sa|ses|tout le|toute la|tous les|toutes les|toute|tout|tous|toutes) |l'|d'|de l'|a l')?`
const ADV = String.raw`(?:(?:tout simplement|simplement|surtout|peut etre|plutot|donc|alors|juste|carrement|discretement|pour l'instant|pour le moment|provisoirement|temporairement|pour cette fois|cette fois) )*`

// Verbes de divulgation (dire, informer, noter…) : niés ou évités, ils signent une dissimulation
const DISCLOSE = alt(
  er('parl', 'mentionn', 'evoqu', 'signal', 'inform', 'declar', 'notifi', 'alert', 'consign', 'document', 'remont', 'communiqu',
    'ebruit', 'divulgu', 'revel', 'expliqu', 'abord', 'avou', 'rapport', 'montr', 'not', 'journalis', 'enregistr', 'trac', 'cit'),
  ir('avert'),
  String.raw`prev(?:enir|iens|ient|enons|enez|iennent|iendr${L}*|enu${L}*|enant|enai${L}*|enions|eniez)`,
  String.raw`(?:dire|dis|dit|dite|dites|disons|disent|dirai|diras|dira|dirons|direz|diront|dirais|dirait|dirions|diraient|disait)`,
  String.raw`(?:ecrire|ecris|ecrit|ecrivons|ecrivez|ecrirons|ecrira|ecrirait)`,
  String.raw`(?:inscrire|inscris|inscrit|inscrivons|inscrivez|inscrira|inscrirait)`,
  String.raw`(?:faire|fais|fait|faisons|faites|ferons|fera|ferait) (?:etat|mention|remonter|figurer)`,
  String.raw`port${ER} a (?:la|leur|sa) connaissance`,
  String.raw`souffl${ER} mot`,
  String.raw`(?:mis|mise|mises|mettre|mett${L}*|tenu|tenue|tenus|tenir|ten${L}*) au courant`
)
const INCIDENT_NOUNS = String.raw`(?:incident|faille|fuite|vulnerabilite|violation|compromission|intrusion|attaque|injection|retard|ecart|derive|defaut|erreur|bug|probleme|exfiltration|piratage|panne|risque|non conformite|transfert|cloud act|exposition|sinistre|rancongiciel|ransomware|malware|cyberattaque|fraude|chiffrement|vol|hameconnage|phishing|sous traitant|prestataire|hebergement)s?`
const INCIDENT_EARLY = String.raw`(?:${DET})(?:${L}+ ){0,2}?${INCIDENT_NOUNS}`
// Verbes de dissimulation (affirmés, ils suffisent)
const HIDE = alt(
  String.raw`dissimul${L}*`,
  String.raw`cach(?:er|ons|ez|erons|erez|eront|era|erai|erait|erions|eraient|ait|aient|ions|iez|ant)`,
  String.raw`(?:on|nous|je|il|elle|ils) (?:le |la |les |leur |lui |en |y |ca )?cache(?:nt)?`,
  String.raw`(?:taire|taisons|taisez|taise|taisent|tairons|tairez|tairont|taira|tairai|tairait|tairions|tairaient)`,
  String.raw`(?:ne|n') ?(?:en |lui |leur |rien )?souffl${ER} mot`,
  String.raw`(?:rest|demeur)${L}* (?:muets?|muettes?|silencieu${L}*|discrets?|discretes?|evasi${L}*|vagues?|flous?) (?:sur|quant a|a propos d[eu]?|concernant)`,
  String.raw`(?:content${L}* (?:nous |vous )?|suffi${L}* |simplement |juste |officiellement )(?:de |d')?(?:dire|annoncer|affirmer|expliquer|indiquer|pretendre|assurer)(?: a ${L}+| au ${L}+| aux ${L}+)? que tout (?:va bien|fonctionne|marche|roule|est (?:sous controle|normal|rentre dans l'ordre|ok|en ordre|nominal))`,
  String.raw`(?:dire|disons|dites|dira|dirons|dirait|annonc${ER}|affirm${ER}|assur${ER}|expliqu${ER}|indiqu${ER}|rassur${ER}|repond${L}*) (?:simplement |juste |seulement |officiellement |publiquement )?(?:a (?:la |l')?${L}+|au ${L}+|aux ${L}+|leur|lui) (?:simplement |juste |seulement )?que tout (?:va bien|fonctionne|marche|roule|est (?:sous controle|normal|rentre dans l'ordre|ok|en ordre|nominal|maitrise))`,
  String.raw`(?:on|nous|je) (?:le |la |les )?tai[st]`,
  er('occult', 'etouff', 'enterr', 'maquill', 'camoufl', 'edulcor', 'enjoliv', 'escamot'),
  String.raw`omett${L}*`,
  String.raw`pass${L}* (?:[${L}']+ |l'){0,4}?sous silence`,
  String.raw`(?:fai${L}*|faire|fass${L}*) comme si (?:de rien n'etait|rien ne s'etait passe|rien n'etait arrive|tout allait bien|de rien)`,
  String.raw`(?:mettre|mettons|mettez|mettra|mettrait|met|glisser|glissons|balayer|balayons) [${L}' ]{0,25}?sous le tapis`,
  'sous le tapis', 'en catimini', 'en douce', 'en sourdine', 'sous le manteau', 'motus', 'pas un mot', 'ni vu ni connu', 'bouche cousue',
  String.raw`a l'insu (?:de|du|des)`,
  String.raw`dans le dos (?:de|du|des)`,
  'discretement',
  String.raw`(?:garder|gardons|gardez|garde|garderons|garderait) (?:ca|cela|l'info${L}*|l'incident|la faille|la fuite|l'affaire|le sujet|tout ca|ce point) (?:pour nous|sous silence|sous le coude|entre nous)`,
  String.raw`(?:garder|gardons|gardez|garderons) (?:ca )?pour nous`,
  String.raw`(?:garder|gardons|gardez|garde|garderons|garderait) ${INCIDENT_EARLY} (?:${L}+ ){0,3}?(?:pour nous|sous silence|sous le coude|entre nous|sous le tapis|sous le manteau)`,
  String.raw`(?:que )?(?:ca|cela|tout ca) (?:reste|restera|resterait) entre nous`,
  String.raw`hors (?:du |de l'|de la )?(?:registre|dossier|pv|proces verbal|rapport|compte rendu|aipd|radar)`,
  'off the record', 'sous le radar',
  String.raw`minimis${ER} (?:${DET})?(?:gravite|ampleur|portee|severite|nombre (?:de|d')|volume)`,
  String.raw`minimis${ER} [^.;!?]{0,40}?(?:aupres (?:de|du|des)|devant|dans (?:le|la|notre|nos|son|sa|les) (?:rapport|communication|notification|declaration|bilan|compte rendu|reponse))`,
  String.raw`(?:present|montr|affich|fourn|sort|donn|arriv)${L}* [^.;!?]{0,40}?(?:un|le|des|les|notre|nos) (?:tableau|bilan|reporting|dashboard|tableau de bord|rapport|indicateurs?|kpi|statut|etat|feux?)s?(?: de bord)? (?:${L}+ ){0,2}?(?:tout |entierement |totalement |completement |tous )?(?:au )?(?:verts?|flatteurs?|lisses?|edulcores?|sans (?:aucun )?(?:point )?rouge)`,
  String.raw`(?:repeindre|repeignons|peindre|passer|passons) (?:${L}+ ){0,2}?en vert`
)

// Objets d'un incident (pour les verbes ambigus : « sans mentionner LA FAILLE »)
const INCIDENT = INCIDENT_EARLY
// Registres et documents où l'omission est fautive
const RECORD = String.raw`(?:${DET})(?:${L}+ ){0,1}?(?:registre|aipd|pia|dpia|analyse d'impact|pv|proces verbal|compte rendu|rapport|ticket|journal|dossier|releve|fiche|cahier|main courante|bilan|livrable|tableau de bord|reporting|plan d'action|plan de traitement|registre des violations|registre des incidents)s?`
const RECORD_RE = new RegExp(RECORD, 'u')

// Autorités, instances et personnes à informer (cibles par défaut)
export const RED_LINE_TARGETS = Object.freeze({
  cnil: ['cnil'],
  anssi: ['anssi', 'cert fr', 'cert-fr'],
  ars: ['ars', 'agence regionale de sante', 'cert sante', 'cert-sante'],
  acpr: ['acpr', 'banque de france', 'autorite de controle prudentiel'],
  bce: ['bce', 'banque centrale europeenne', 'mss', 'mecanisme de surveillance unique'],
  amf: ['amf'],
  autorite: ['autorite', 'autorites', 'regulateur', 'superviseur', 'tutelle', 'ministere', 'hfds', 'haut fonctionnaire', 'prefecture', 'parquet', 'police', 'gendarmerie'],
  comite: ['comite', 'codir', 'comex', 'conseil', 'board', 'direction', 'directoire', 'organe de direction', 'actionnaires', 'conseil d\'administration'],
  registre: ['registre', 'aipd', 'pia', 'dpia', 'analyse d\'impact', 'pv', 'proces verbal', 'compte rendu', 'rapport', 'reporting', 'tableau de bord'],
  patients: ['patient', 'patients', 'familles', 'usagers'],
  clients: ['client', 'clients', 'usagers', 'assures', 'adherents', 'abonnes', 'beneficiaires', 'utilisateurs'],
  personnes: ['personnes concernees', 'personnes', 'victimes', 'salaries', 'agents', 'parents', 'eleves'],
  assureur: ['assureur', 'assurance', 'courtier'],
  auditeurs: ['auditeur', 'auditeurs', 'commissaire aux comptes', 'commissaires aux comptes', 'audit']
})
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const PRESS = /(?:^|[^\p{L}])(?:presse|journalistes?|medias?|reseaux sociaux|grand public|public|concurrents?|twitter|linkedin|la concurrence|les forums?)(?![\p{L}])/u
const AUTHORITY_OR_BOARD = new RegExp(String.raw`(?:^|[^\p{L}])(?:${Object.values(RED_LINE_TARGETS).flat().map((t) => escapeRe(normalize(t))).join('|')})(?![\p{L}])`, 'u')

// Contrôles contournables, par classe
const CONTROL_CLASSES = {
  approval: String.raw`(?:${DET})(?:homologation|decision d'homologation|farr|security gate|gate(?: (?:de securite|securite|n ?\d+|\d+))?|quality gate|go no go|autorite d'homologation|commission d'homologation|comite d'homologation|cab|comite (?:de|des) changements?|visa (?:du |de la )?(?:rssi|securite|ssi)|(?:avis|feu vert|validation|accord|signature) (?:du |de la |de l')?(?:rssi|securite|cab|ssi|cssi|comite|cybersecurite|dpo))`,
  pentest: String.raw`(?:${DET})(?:tests? d'intrusion|pentests?|pen tests?|audits? passi|audits? d'intrusion|audits? de securite|red team(?:ing)?|campagne d'intrusion)`,
  review: String.raw`(?:${DET})(?:revues? (?:de code|de securite|d'architecture|par les pairs|croisee)|code reviews?|relectures? (?:du code|de code|securite|croisee)|peer reviews?|double validation|validation a quatre yeux|quatre yeux)`,
  testing: String.raw`(?:${DET})(?:recettes?|tests? de non regression|tests? de charge|tests? fonctionnels|campagnes? de tests|phase de tests|tests? de securite|sast|dast|scans? de vulnerabilites|analyses? de vulnerabilites|tests? de restauration|qualification)`,
  staging: String.raw`(?:${DET})(?:staging|pre production|preproduction|preprod|pre prod|environnement de (?:test|recette|qualification|preproduction|pre production))`
}
export const RED_LINE_CONTROLS = Object.freeze(Object.keys(CONTROL_CLASSES))
const controlOf = (classes) => `(?:${(classes && classes.length ? classes : Object.keys(CONTROL_CLASSES)).map((c) => CONTROL_CLASSES[c]).filter(Boolean).join('|')})`

const CONTROL_ANY_RE = new RegExp(String.raw`(?:^|[^${L}])${controlOf()}(?![${L}])`, 'u')
const GO = alt(
  String.raw`mise en (?:production|prod|service|ligne|exploitation)`,
  String.raw`met${L}* en (?:production|prod|service|ligne)`,
  String.raw`deploy${L}*`, String.raw`deploi${L}*`, er('livr'), 'livraison', String.raw`ouvr${L}*`, 'ouverture', er('lanc'), 'lancement',
  er('bascul'), 'go live', 'mep', String.raw`pass${ER} en prod${L}*`, er('demarr'), String.raw`releas${L}*`, String.raw`merg${L}*`,
  String.raw`pouss${ER} en prod${L}*`, er('activ'), 'activation'
)

const NOTIFY = alt(
  er('notifi', 'signal', 'declar', 'inform', 'contact', 'appel', 'appell', 'alert'), 'notification', 'signalement', 'declaration',
  String.raw`prev(?:enir|iens|ient|enons|enez|iennent|iendr${L}*|enu${L}*|enant|enai${L}*|enions|eniez)`,
  ir('avert', 'sais'),
  String.raw`(?:ecrire|ecrirons|ecrira|ecrivons) a`,
  String.raw`parl${ER} (?:a|au|aux)`
)
const DELAY = alt(
  String.raw`attend${L}*`, er('retard', 'differ', 'report', 'repouss', 'decal', 'temporis', 'patient', 'gel', 'frein'),
  String.raw`laiss${ER} (?:passer|filer|courir)`,
  String.raw`pren${L}* (?:notre|le|son|tout notre) temps`, String.raw`prendre (?:notre|le|son|tout notre) temps`,
  String.raw`remettr${L}* a plus tard`, String.raw`remet${L}* a plus tard`,
  String.raw`suspendr${L}*`, String.raw`suspend(?:ons|ez|s)?`,
  String.raw`mett${L}* (?:en attente|en pause|de cote|entre parentheses)`, String.raw`mettre (?:en attente|en pause|de cote|entre parentheses)`
)
const LATE_TIME = alt(
  String.raw`apres (?:${DET})?(?:${L}+ ){0,2}?(?:conference|visite|controle|salon|presse|fin (?:du|de la|de l')|subvention|ouverture|homologation|lancement|trimestre|week end|weekend|comite|evenement|inauguration|audit|cloture|assemblee|ag|conseil|levee de fonds|introduction en bourse|ipo|publication|resultats|vacances|fetes|elections|rachat|fusion|signature|certification|renouvellement|rentree|mise en production|bascule|migration|enquete|investigation|analyse complete|expertise|jalon|revue|comite de pilotage|copil)`,
  'apres coup', 'a posteriori', 'plus tard', 'ulterieurement', 'en temps voulu', 'a la rentree', 'apres les vacances', String.raw`apres l'ete`, 'apres les fetes', String.raw`l'an prochain`, String.raw`l'annee prochaine`, 'jusqu\'a nouvel ordre',
  String.raw`au (?:prochain|prochaine) (?:comite|trimestre|exercice|conseil|copil|seance)`,
  String.raw`(?:quand|lorsque|des que|une fois que) (?:${DET})?(?:${L}+ ){1,3}?(?:sera|seront|serons) (?:de retour|au complet|disponibles?|revenus?|rentres?|la|prets?)`,
  String.raw`(?:seulement|uniquement) (?:apres|une fois|quand|lorsque)`,
  String.raw`(?:quand|lorsque|des que) (?:on|nous|l'on) (?:en )?(?:saura|saurons|aura|aurons|sera|serons) (?:${L}+ ){0,3}?(?:plus|tout|sur|surs|certain|certains|fini|termine|la cause|le rapport|l'analyse|y voir clair|clair)`,
  String.raw`une fois (?:que |qu')?(?:tout|on|nous|l'enquete|l'analyse|le correctif|la crise|l'incident|ce|c'|les choses)[^.;!?]{0,30}?(?:regle|termine|clos|resolu|corrige|fini|sur|certain|confirme|stabilise|passe|calme|tasse|apaise|retombe|boucle|acheve)${L}*`,
  String.raw`la semaine (?:prochaine|d'apres|suivante)`, String.raw`le mois (?:prochain|d'apres|suivant)`,
  String.raw`dans (?:quelques|deux|trois|plusieurs|une|un|huit|quinze) (?:jours|semaines|semaine|mois)`,
  String.raw`au dela (?:de |des |du delai de )?(?:24|72|4) ?h${L}*`, String.raw`apres (?:les )?(?:24|72|4) ?h${L}*`, 'hors delai',
  String.raw`en fin de (?:mois|semaine|trimestre|annee)`,
  String.raw`a la fin (?:du|de la|de l') (?:mois|semaine|trimestre|annee|exercice|crise|projet|incident|enquete)`
)

const EVIDENCE = String.raw`(?:logs?|journaux|journal (?:d'evenements|systeme|des connexions|d'acces|d'audit)|journalisation|traces?|historiques?|preuves?|elements? de preuve|artefacts?|images? (?:disque|memoire)|dumps?(?: memoire)?|memoire vive|horodatages?|timestamps?|tickets?|e ?mails?|mails?|courriels?|messages?|enregistrements?|captures?(?: reseau)?|pcaps?|fichiers? de (?:log|journalisation)|evenements? du siem|alertes? (?:du siem|de l'edr|edr|siem)|scelles?|chaine de (?:custody|conservation))`
const EVIDENCE_STRICT = String.raw`(?:logs?|journaux|journalisation|traces?|historiques?|preuves?|elements? de preuve|artefacts?|horodatages?|timestamps?|enregistrements?|captures?(?: reseau)?|pcaps?|fichiers? de (?:log|journalisation)|scelles?)`

const PAY = alt(
  er('pay', 'regl', 'vers', 'rachet', 'achet', 'financ', 'transig', 'envoy', 'transfer'),
  String.raw`pai(?:e|es|ent|era${L}*|erai${L}*|erions|eriez|eraient)`, 'paiement', 'reglement', 'versement', 'rachat', 'achat', 'virement',
  String.raw`acqu(?:erir|iers|iert|erons|erez|errons|errait|errions|ierent)`,
  String.raw`ced(?:er|ons|ez|erons|erait|erions|eraient)`, 'cede',
  String.raw`mett${L}* la main au portefeuille`, String.raw`sort${L}* le chequier`
)
const RANSOM = String.raw`(?:(?:\d[\d ,.]* )?(?:bitcoins?|btc|monero|xmr|cryptomonnaies?|cryptos?|ethers?)(?: (?:demandes?|exiges?|reclames?|requis))?|rancon${L}*|ranson${L}*|ransom|cles? de dechiffrement|decrypteur|dechiffreur|outil de dechiffrement|chantage|silence (?:des|du|de l'|de la) ?(?:attaquants?|pirates?|hackers?|groupe|vendeur|maitre chanteur)|leur silence)`
const STOLEN = String.raw`(?:donnees|base|bases|fichiers?|lots?|echantillons?|dumps?|extraction|extrait|jeu de donnees|jeux de donnees|archive|copie|listing|liste|fichier clients|identifiants)`
const STOLEN_CONTEXT = /(?:^|[^\p{L}])(?:vol\p{L}*|exfiltr\p{L}*|derob\p{L}*|dark ?web|darknet|forum|vendeur|revendeur|pirates?|attaquants?|hackers?|cybercriminel\p{L}*|criminels?|ranconneurs?|maitres? chanteurs?|en vente|mis(?:es)? en vente|fuite|leak\p{L}*|telegram|courtier|broker|lockbit|ransomware|rancongiciel\p{L}*|onion|tor|monero|bitcoins?|cryptos?|btc|xmr|annonce)(?![\p{L}])/u
const ATTACKERS = String.raw`(?:pirates?|attaquants?|hackers?|cybercriminel${L}*|criminels?|ranconneurs?|maitres? chanteurs?|groupe (?:de )?(?:ransomware|rancongiciel|cybercriminels?)|vendeurs? (?:du|de la|des) (?:lot|base|fichier|donnees))`

const SHUT = alt(
  er('coup', 'arret', 'debranch', 'stopp', 'deconnect', 'ferm', 'isol', 'kill'), 'coupure', 'arret',
  String.raw`eteind${L}*`, String.raw`eteign${L}*`, 'eteint',
  String.raw`mett${L}* (?:[${L}']+ ){0,4}?hors (?:ligne|tension|service|reseau)`, String.raw`mettre (?:[${L}']+ ){0,4}?hors (?:ligne|tension|service|reseau)`, String.raw`mise hors (?:ligne|tension|service)`,
  'shut ?down', String.raw`tir${L}* la prise`, String.raw`arrach${L}* les cables`
)
const SHUT_OBJ = String.raw`(?:tout|tous|l'ensemble|le si|si|systemes?|systeme d'information|reseau|serveurs?|production|prod|usine|sites?|scada|automates?|chaines?|lignes? de production|courant|electricite|alimentation|datacenter|centre de donnees|salle|baies?|postes?|machines?|services?|applications?|messagerie|internet|vpn|acces|urgences|dpi|bloc|hopital|clinique|plateforme|infrastructure|cloud|stockage|bases?|equipements?|installations?|pompes?|parc|robots?|ehpad|guichets?|paiements?|caisses?|stations?|pompage|centrales?|reacteurs?|scanners?|irm|imagerie|laboratoires?|fours?|turbines?|trains?|signalisation|aiguillages?|metro|tramway|reseau electrique|distribution|chauffage|climatisation|refroidissement|ventilation|respirateurs?|dialyse|ascenseurs?)`
const SHUT_OBJ_RE = new RegExp(String.raw`(?:^|[^${L}])${SHUT_OBJ}(?![${L}])`, 'u')
const BRUTAL = alt(
  'brutalement', "d'un coup", 'net', 'sur le champ sans',
  String.raw`sans (?:aucun |aucune |le moindre |la moindre |de |d'|un |une |la |le |les |nos )?(?:plan|pca|pra|plans? de (?:reprise|continuite|repli|bascule|retour|secours)|mode degrade|procedure|preavis|prevenir|avertir|coordination|concertation|bascule|repli|alternative|redondance|continuite|reprise|redemarrage|solution de (?:repli|secours)|secours|degrade|filet)`,
  String.raw`sans se soucier (?:de|du|des)`, String.raw`tant pis pour (?:la|le|les|l')`,
  String.raw`(?:et )?on (?:verra|avisera|improvisera|bricolera|se debrouillera|reflechira)(?: (?:apres|plus tard|ensuite|bien|le reste|pour le reste|pour la suite))?`, String.raw`on (?:redemarrera|relancera) (?:quand|plus tard|apres)`, String.raw`(?:la reprise|le redemarrage|la remise en route|le reste) (?:attendra|viendra (?:apres|plus tard)|on verra)`,
  "quoi qu'il en coute", String.raw`peu importe (?:la|le|les|l') ?(?:production|activite|patients|clients|continuite|consequences|reprise)`
)

// ---------------------------------------------------------------------------------------------
// Règles par famille (texte normalisé d'une phrase). guard(ctx) → false écarte l'occurrence.
// ---------------------------------------------------------------------------------------------

// Tournures figées : « inutile de dire que », « pas besoin de préciser que » (= « cela va sans dire »)
const NEEDLESS_TO_SAY = /^(?:inutile|pas besoin|pas la peine|nul besoin|est il besoin)/
const IDIOM_AFTER_DISCLOSE = /^\s*(?:que |qu'|de (?:definitif|precis|faux|hatif|premature|bete|stupide|plus|nouveau|mieux)|d'(?:inexact|errone|autre|hatif)|qui ne soit|jamais assez|assez)/
const ORDERING_AFTER = /^[^.;!?]{0,30}?avant (?:d'avoir |que |de |d')?(?:[\p{L}']+ ){0,4}?(?:cnil|anssi|ars|acpr|bce|amf|autorites?|regulateur|dpo|rssi|direction|comite|dg|cert)(?![\p{L}])/u
const RESTRICTIVE_AFTER = /^\s*(?:personne )?(?:d'autre que|sauf|hormis|en dehors de|a part|rien de plus|rien d'autre|que la|que le|que l'|que les)/
const TARGETED_AFTER = /^\s*(?:a |au |aux )/
const followedBy = (ctx, re) => re.test(ctx.n.slice(ctx.end, ctx.end + 60))
// Cible de la dissimulation : la presse ou le public seulement → réserve de communication légitime
function pressOnly(ctx) {
  // Cible immédiate (« … à la presse », « auprès des journalistes ») ou complément placé avant (« à la presse, on ne dit rien »)
  const after = ctx.n.slice(ctx.end, ctx.end + 28)
  const before = ctx.n.slice(Math.max(0, ctx.start - 28), ctx.start)
  const target = PRESS.test(after) ? after : PRESS.test(before) ? before : null
  return !!target && !AUTHORITY_OR_BOARD.test(target.replace(new RegExp(PRESS.source, 'gu'), ' '))
}
function stagingTarget(ctx) {
  return /en (?:staging|pre ?production|preprod|pre prod|recette|test|qualification|environnement de (?:test|recette|qualification))/.test(ctx.n.slice(ctx.start, ctx.end + 20))
}

const RULES = {
  concealment: [
    // « évitons d'en parler », « inutile de le mentionner », « ne pas évoquer », « pas besoin de le signaler », « rien ne nous oblige à le déclarer »
    {
      id: 'avoidDisclosure',
      src: String.raw`(?:evit${ER}|on evite|abst(?:en|ien)${L}*|(?:ne|n') ?(?:vois|voit|voyons|voyez) pas (?:l'interet|la necessite|l'utilite|la peine|pourquoi)|a quoi bon|inutile|pas besoin|pas la peine|pas utile|pas necessaire|nul besoin|aucun besoin|aucune raison|plus la peine|pas obliges?|pas tenus?|rien ne nous (?:oblige|force|contraint)|ne pas|ne rien|ne surtout pas|surtout ne pas|ne plus|gardons nous|gardez vous|se garder)(?: (?:nous|vous))? ${ADV}(?:(?:de|d'|a) ?)?${ADV}${PRON}*${DISCLOSE}`,
      guard: (ctx) => {
        const after = ctx.n.slice(ctx.end, ctx.end + 60)
        if (NEEDLESS_TO_SAY.test(ctx.match) && /^\s*(?:que |qu'|,)/.test(after)) return false
        if (IDIOM_AFTER_DISCLOSE.test(after) && !TARGETED_AFTER.test(after)) return false
        if (/(?:veu|voul)\p{L}* rien dire$/u.test(ctx.match)) return false
        return !pressOnly(ctx)
      }
    },
    // Divulgation niée : « on ne va rien dire », « nous n'avons pas à le signaler », « il ne faut surtout pas en parler »
    {
      id: 'negatedDisclosure',
      src: String.raw`(?:ne|n') ?(?:(?:va|vais|vas|allons|allez|vont|faut|faudrait|faudra|doit|devons|devez|devrait|devrions|compte|comptons|souhaite|souhaitons|veux|voulons|peut|pouvons|pourrait|pourrions|a|ai|avons|aura|aurons|est|sommes|serons|serait|serions|irons|ira|soit|soient|sera|seront|sont|seraient|etre|etait|etaient|ete|avait|avaient|aurait|auraient) )?(?:surtout |meme |vraiment |forcement |encore )?(?:pas|rien|jamais|plus|point)(?: (?:obliges?|tenus?|forces?|besoin))?(?: (?:de|d'|a))? ?${ADV}${PRON}*${DISCLOSE}`,
      guard: (ctx) => {
        const after = ctx.n.slice(ctx.end, ctx.end + 60)
        if (IDIOM_AFTER_DISCLOSE.test(after) || RESTRICTIVE_AFTER.test(after) || ORDERING_AFTER.test(after)) return false
        if (/(?:veu|voul)\p{L}* rien dire$/u.test(ctx.match) && !TARGETED_AFTER.test(after)) return false
        return !pressOnly(ctx)
      }
    },
    // « on n'en parle pas », « on ne prévient personne », « on ne le mentionne pas »
    {
      id: 'negatedDisclosureVerb',
      src: String.raw`(?:ne|n') ?${PRON}*${DISCLOSE}(?: (?:${L}+))? (?:rien|pas|personne|jamais|plus|point|aucun${L}*)`,
      guard: (ctx) => {
        const after = ctx.n.slice(ctx.end, ctx.end + 60)
        if (IDIOM_AFTER_DISCLOSE.test(after) || RESTRICTIVE_AFTER.test(after) || ORDERING_AFTER.test(after)) return false
        if (/^(?:ne|n') ?(?:le |la |les )?(?:dis|dit|dirai|dirais)(?: \p{L}+)? pas$/u.test(ctx.match) && /^\s*(?:que|qu'|non|ca|cela)/.test(after)) return false
        return !pressOnly(ctx)
      }
    },
    // Verbes et locutions de dissimulation (« taire », « cacher », « en douce », « tableau tout vert »)
    { id: 'hide', src: HIDE, guard: (ctx) => !pressOnly(ctx) },
    // « sans le noter », « sans en parler à l'ARS »
    { id: 'withoutDisclosure', src: String.raw`sans ${ADV}(?:(?:le|la|les|en|y|leur|lui|rien|nous|vous) |l')+${DISCLOSE}`, guard: (ctx) => !pressOnly(ctx) },
    // « sans mentionner la faille », « sans documenter », « sans laisser de trace »
    {
      id: 'withoutDisclosureObject',
      src: String.raw`sans ${ADV}(?:${DISCLOSE}|tenir trace|garder (?:de )?trace|laisser (?:de |la moindre |aucune )?trace)`,
      guard: (ctx) => {
        if (/trace$/.test(ctx.match)) return true
        if (/(?:consign|document|journalis|tracer|inscri)/.test(ctx.match)) return true
        const after = ctx.n.slice(ctx.end, ctx.end + 70)
        if (/^\s*(?:que |qu')/.test(after)) return false
        if (/^\s*(?:a |au |aux |dans |sur )/.test(after) && (AUTHORITY_OR_BOARD.test(after) || RECORD_RE.test(after))) return true
        return new RegExp(`^\\s*${INCIDENT}(?![\\p{L}])`, 'u').test(after)
      }
    },
    // « on peut laisser de côté le volet biométrie (dans l'AIPD) », « faisons l'impasse sur la faille »
    {
      id: 'leaveOut',
      src: String.raw`(?:laiss${ER}|mett${L}*|mettre) de cote|(?:fai${L}*|faire) l'impasse sur|pass${ER} (?:a la trappe|a l'as|par pertes et profits)`,
      guard: (ctx) => RECORD_RE.test(ctx.n) || new RegExp(INCIDENT, 'u').test(ctx.n.slice(ctx.end, ctx.end + 50)) || AUTHORITY_OR_BOARD.test(ctx.n)
    },
    // « inutile d'inquiéter le conseil en leur parlant de l'intrusion »
    { id: 'spareWorry', src: String.raw`(?:inutile|pas besoin|pas la peine|evit${ER}|ne pas|mieux vaut ne pas) (?:de |d')?(?:inquieter|affoler|alarmer|effrayer|paniquer|ennuyer|embeter|deranger|alerter inutilement)[^.;!?]{0,40}?(?:en (?:leur|lui|vous) (?:parlant|disant|signalant|annoncant|montrant)|avec (?:ca|cela|cette histoire|ce sujet|l'incident|la faille|la fuite|l'intrusion))` },
    // Retrait d'un registre ou d'un rapport : « retirer la ligne du registre », « sortir l'incident du rapport »
    { id: 'removeFromRecord', src: String.raw`(?:retir|supprim|enlev|sort|effac|ot)${L}* [^.;!?]{0,30}?(?:du|de l'|de la|des) (?:registre|aipd|pia|dpia|rapport|compte rendu|pv|bilan|plan de traitement|dossier d'homologation|registre des violations|tableau de bord|reporting)` },
    // « personne ne posera la question », « ça passera inaperçu », « ils n'y verront que du feu »
    { id: 'nobodyWillKnow', src: String.raw`personne ne (?:${L}+ )?(?:(?:le|la|les|l'|en|y|nous|vous) ?)*(?:verra|voit|voient|saura|sait|verifi${L}*|remarqu${L}*|s'en (?:apercevra|apercoit|rendra compte|rend compte)|regard${L}*|demand${L}*|pos${L}* (?:la|de|une|des) questions?|ira (?:voir|verifier|regarder|chercher|fouiller)|fera le (?:lien|rapprochement)|control${L}*|lit|lira|ouvrira|s'en souci${L}*|s'y interess${L}*|epluch${L}*|examin${L}*|creus${L}*|fouill${L}*|lir${L}*|reli${L}*)` },
    { id: 'nobodyWillKnow2', src: String.raw`personne n'(?:en |y )?(?:saura|sait|verra|ira|a besoin|aura besoin|en saura|remarquera|y verra)` },
    { id: 'unnoticed', src: String.raw`(?:passer${L}*|passe|passera|passerait) inapercu${L}*|(?:n'y )?verr${L}* que du feu|ne se verra (?:pas|jamais)|ne se voit pas|(?:moins|le moins) (?:ils|elles|on|le comite|la cnil|l'ars|la direction|le conseil) (?:en )?(?:sai|sau|saur)${L}*,? mieux` },
    { id: 'onlyIfAsked', src: String.raw`(?:seulement|uniquement|que) (?:si|s'ils?|s'elles?|quand|lorsque) (?:on nous|ils nous|elle nous|elles nous|l'autorite nous|la cnil nous|l'ars nous|on|ils|elles)? ?(?:le |la )?(?:demande${L}*|reclame${L}*|pose${L}* la question|exige${L}*|interroge${L}*)|tant que (?:personne|on ne nous|nul|ils ne nous|l'autorite ne nous) (?:ne )?(?:${L}+ ){0,2}?(?:demande|pose|reclame)` },
    { id: 'needNotKnow', src: String.raw`(?:n'|ne )(?:a|ont|aura|auront|avons|avez) (?:pas|aucun) besoin (?:de |d')(?:le |la |les |l'|en )?(?:savoir|connaitre|etre (?:informe|prevenu|au courant)${L}*)|(?:pas besoin|aucun besoin|inutile|pas la peine|pas utile|pas necessaire|mieux vaut pas) (?:qu'ils|qu'elles|qu'il|qu'elle|que (?:le|la|les|l'|nos|vos|ses))[^.;!?]{0,30}?(?:sache|sachent|soit au courant|soient au courant|l'apprenne|l'apprennent|le sache|le sachent|en sache|en soit informe${L}*)` }
  ],
  lateNotification: [
    // « attendre lundi pour prévenir l'ANSSI », « on attendrait d'être sûrs avant de parler à la CNIL »
    { id: 'waitThenNotify', src: String.raw`${DELAY}[^.;!?]{0,60}?(?:pour |avant de |avant d'|avant que |puis |et ensuite |ensuite |et seulement (?:ensuite|apres|alors) |pour ensuite |et apres |apres quoi )[^.;!?]{0,20}?${NOTIFY}` },
    // « retarder la notification », « différer le signalement », « geler la déclaration »
    { id: 'delayNotification', src: String.raw`${DELAY} (?:${DET})?(?:${L}+ )?(?:notification|signalement|declaration|information (?:de|des|du|a|aux)|prise de contact|notifications|declarations|signalements)` },
    // « on préviendra la CNIL après la conférence », « notifier plus tard »
    { id: 'notifyLate', src: String.raw`${NOTIFY}[^.;!?]{0,50}?${LATE_TIME}` },
    // « ne prévenir l'ANSSI qu'après coup », « on ne notifiera qu'une fois sûrs »
    { id: 'notifyOnlyAfter', src: String.raw`(?:ne|n') ?(?:${L}+ )?${PRON}*${NOTIFY}[^.;!?]{0,40}? qu(?:e |')(?:apres|une fois|au dernier moment|a la fin|en fin|lorsque|quand|en dernier recours|la semaine|le mois|si (?:on|nous) (?:y )?(?:est|sommes) (?:oblige|obliges|contraint|contraints|force|forces))` },
    // « pas de notification avant le rapport », « aucune déclaration pour l'instant »
    { id: 'noNotificationYet', src: String.raw`(?:pas|aucune?|zero) (?:de |d')?(?:notification|declaration|signalement)s? (?:${L}+ )?(?:avant|tant que|pour l'instant|pour le moment|tout de suite|dans l'immediat|maintenant|a ce stade|d'ici)` },
    // « mettons la déclaration au régulateur en attente »
    { id: 'notificationOnHold', src: String.raw`(?:mett${L}*|mettre|laiss${ER}|gard${ER}) (?:${DET})?(?:${L}+ )?(?:notification|declaration|signalement)s?[^.;!?]{0,30}?(?:en attente|en pause|de cote|entre parentheses|au frigo|sous le coude|en stand by|dans un tiroir)` },
    // « la notification peut attendre »
    { id: 'notificationCanWait', src: String.raw`(?:la |le |notre |les |toute |une )?(?:notification|declaration|signalement|information)s?[^.;!?]{0,30}? (?:(?:peut|pourra|pourrait|peuvent|va|devra|devrait) (?:bien |largement |encore |tres bien )?(?:attendre|patienter|etre (?:reportee|differee|decalee|repoussee|faite plus tard))|attendra|attendrait|attendront|patientera|sera (?:reportee|differee|decalee|repoussee|faite plus tard)|viendra (?:apres|plus tard|ensuite))` },
    // « les 72 h, c'est indicatif »
    { id: 'deadlineIsSoft', src: String.raw`(?:72|24|4) ?h(?:eures)?[^.;!?]{0,25}?,? (?:c'est |ce sont |sont |est |reste |restent )?(?:qu'une |une |un )?(?:indicati${L}*|theorique${L}*|souple${L}*|formalite|negociable${L}*|recommandation|delai indicatif|ordre d'idee)` }
  ],
  bypassControl: [
    { id: 'goLiveWithout', src: `${GO}[^.;!?]{0,40}? (?:sans|en (?:court circuitant|contournant|sautant|zappant)) (?:(?:meme|attendre|passer par|faire|realiser|avoir|obtenir|repasser par|le feu vert de) )*@CONTROL@`, guard: (ctx) => !stagingTarget(ctx) },
    { id: 'goLiveBefore', src: `${GO}[^.;!?]{0,40}? avant (?:(?:d'avoir|la fin d[eu]|que|meme|d'obtenir|l'obtention d[eu]|le retour d[eu]) )*@APPROVAL@`, guard: (ctx) => !stagingTarget(ctx) },
    {
      id: 'bareWithout',
      src: String.raw`sans (?:(?:meme|attendre|passer par|faire|realiser|avoir|obtenir|repasser par|le feu vert de|aucun|aucune) )*@CONTROL@`,
      guard: (ctx) => !/^\s*,?\s*(?:pas de|pas d'|aucun|aucune|rien|on ne|nous ne|on n'|nous n'|impossible|interdit|jamais|point de|ce n'est pas|c'est non|non)/.test(ctx.n.slice(ctx.end)) && !stagingTarget(ctx)
    },
    {
      id: 'skipControl',
      src: String.raw`(?:suspend${L}*|desactiv${L}*|contourn${L}*|court circuit${L}*|outrepass${L}*|ignor${L}*|zapp${L}*|saut${L}*|shunt${L}*|by ?pass${L}*|enjamb${L}*|neutralis${L}*|derog${L}* (?:a|au|aux|sur)|exempt${L}*|dispens${L}*|faire sauter|fais${L}* sauter|passer outre|pass${L}* outre|faire l'impasse sur|fais${L}* l'impasse sur|supprim${L}*|annul${L}*|abandonn${L}*|renonc${L}* (?:a|au|aux)|retir${L}*|sacrifi${L}*|squeez${L}*|lev${L}* (?:la gate|le blocage)|mettre en pause|mett${L}* en pause|mett${L}* entre parentheses|se passer d[eu]?|nous passer d[eu]?|vous passer d[eu]?|on se passe d[eu]?|passons nous d[eu]?)(?: (?:temporairement|provisoirement|exceptionnellement|pour (?:cette|ce|une|deux|trois) ${L}+|purement et simplement|carrement|tout simplement))? (?:(?:les resultats|l'avis|les conclusions|les alertes|les findings|le verdict|les blocages|le blocage) (?:du |de la |des |de l')?)?@CONTROL@`
    },
    // « on met en ligne vendredi, l'homologation suivra », « la recette peut attendre »
    { id: 'controlFollows', src: String.raw`@CONTROL@ (?:${L}+ ){0,2}?(?:suivra|suivront|viendra (?:apres|ensuite|plus tard)|viendront (?:apres|ensuite|plus tard)|se fera (?:apres|ensuite|plus tard|a posteriori)|sera (?:faite|realisee|signee|bouclee|passee) (?:apres|ensuite|plus tard|a posteriori)|(?:peut|pourra|pourrait|peuvent) (?:bien |tres bien |largement )?attendre|attendra|attendront|(?:peut|pourra) etre (?:faite|realisee|passee) (?:apres|ensuite|plus tard))` },
    // « mettons la quality gate en pause le temps de livrer »
    { id: 'controlOnHold', src: String.raw`(?:mett${L}*|mettre|laiss${ER}) @CONTROL@ (?:en pause|entre parentheses|de cote|en veille|en sommeil|hors circuit|en stand by|au placard)` },
    // « exceptionnellement, on dispensera ce lot de la security gate »
    { id: 'exemptFromControl', src: String.raw`(?:dispens|exempt|exoner|soustrai)${L}* (?:[${L}']+ ){0,4}?(?:de |d'|du |des )@CONTROL@` },
    // Reprise par un pronom d'un contrôle cité juste avant (« Le pentest ? On n'en a pas besoin. »)
    {
      id: 'pronounSkip',
      src: String.raw`(?:on|nous|vous|je) (?:${L}+ )?(?:s'en|nous en|vous en|m'en) pass${L}*|(?:on|nous|vous|je) n'en (?:a|avons|aura|aurons|aurait|aurions|ai|avez) (?:pas|plus|guere) (?:vraiment |forcement |reellement |tellement |franchement )?besoin|(?:c'est|ce serait|ca reste|ca devient) (?:du luxe|superflu|optionnel|facultatif|une formalite|accessoire)`,
      guard: (ctx) => CONTROL_ANY_RE.test(`${ctx.prev || ''} ${ctx.n.slice(0, ctx.start)}`)
    },
    // « le test d'intrusion, on peut s'en passer », « la revue, c'est du luxe », « l'homologation n'est pas indispensable »
    { id: 'dislocatedSkip', src: String.raw`@CONTROL@[^.;!?]{0,40}?(?:on|nous|vous|je) (?:${L}+ )?(?:s'en|nous en|vous en|m'en) pass${L}*` },
    {
      id: 'controlIsOptional',
      src: String.raw`@CONTROL@[^.;!?]{0,30}?(?:est|sera|serait|reste|c'est|ce serait|parait|semble|me semble|devient) (?:vraiment |franchement |un peu |totalement |plutot |carrement |clairement )?(?:superflu${L}*|optionnel${L}*|facultati${L}*|du luxe|un luxe|une formalite|accessoire${L}*|de trop|inutile${L}*|secondaire${L}*|negociable${L}*)`,
      guard: (ctx) => !/(?:n'|ne )(?:est|sera|serait|reste|parait|semble|devient) (?:pas|jamais|nullement|en rien)|ce n'est (?:pas|jamais)|ce ne serait (?:pas|jamais)/.test(ctx.match)
    },
    { id: 'controlNotNeeded', src: String.raw`@CONTROL@[^.;!?]{0,30}?(?:n'est|ne sera|ne serait|ne parait|ne semble|ce n'est|ce ne serait) (?:pas|plus) (?:vraiment |franchement |si |forcement |absolument |strictement )?(?:indispensable|necessaire|obligatoire|prioritaire|utile|vital|requis|essentiel|critique|bloquant)${L}*` },
    { id: 'noNeedForControl', src: String.raw`(?:pas besoin|inutile|pas la peine|nul besoin|aucun besoin|pas necessaire|pas utile|superflu) (?:de |d')(?:(?:faire|refaire|passer|par|repasser|en|lancer|relancer|attendre|programmer|prevoir|realiser|mener|commander|organiser|reconduire) )*@CONTROL@` },
    { id: 'settleForScans', src: String.raw`(?:se contenter|on se contente${L}*|nous nous contenterons|nous nous contentons|contentons nous|on se contentera${L}*|on peut se contenter|on pourrait se contenter|vous contenter|me contenter) (?:de |d'|des |du )(?:nos |les |la |le |l'|un |une |quelques )?(?:${L}+ ){0,2}?(?:scans?|outils? automatiques?|tests? automatiques?|analyses? automatiques?|sast|dast|auto ?evaluations?|questionnaires?|attestations?|declarati${L}*|revue rapide|check ?lists?|grilles?|scanners?|nessus|qualys|openvas)` },
    { id: 'scansSuffice', src: String.raw`(?:les |le |nos |un |des )?(?:scans?|outils? automatiques?|tests? automatiques?|sast|dast|scanners?)(?: automatiques?)? (?:suffi${L}*|devrai${L}* suffire|devrait suffire|feront l'affaire|fera l'affaire|remplace${L}*|tiendr${L}* lieu|tiennent lieu|tient lieu)`, guard: (ctx) => !followedBy(ctx, /^\s*(?:a|pour) (?:confirmer|verifier|valider|detecter)/) },
    // « on ouvrira à la date prévue et on bouclera l'homologation après », « homologation a posteriori »
    {
      id: 'controlLater',
      src: String.raw`@CONTROL@[^.;!?]{0,40}?(?:plus tard|apres coup|a posteriori|en regularisation|en rattrapage|apres (?:${DET})?(?:mise en (?:production|service|ligne)|ouverture|lancement|go live|mep|bascule|deploiement|livraison|release|demarrage|jalon|salon|annonce)|une fois (?:${DET})?(?:${L}+ ){0,2}?(?:ouvert|ouverte|lance|lancee|en production|en prod|en ligne|deploye|deployee|livre|livree|demarre|demarree|en service)|(?:on|nous) (?:la|le|les|l') ?(?:fera|ferons|passera|passerons|signera|signerons|bouclera|boucle${L}*|regularisera|terminera)(?: (?:apres|ensuite|plus tard|a posteriori|une fois))|en parallele (?:de |du |de la |de l')?(?:${DET})?(?:ouverture|production|mise en (?:production|service|ligne)|lancement|exploitation)|apres(?=\s*(?:$|[.,;!?)])))`,
      guard: (ctx) => !/(?:annuel|periodique|recurrent|de suivi|complementaire|regulier|chaque annee|tous les ans|de controle|supplementaire|additionnel|retest)/.test(ctx.n)
    },
    { id: 'finishControlLater', src: String.raw`(?:boucl|termin|finalis|regularis|rattrap|complet|fai|fer|signer|sign)${L}* (?:${L}+ )?@CONTROL@ (?:apres|ensuite|plus tard|a posteriori|apres coup|dans la foulee|au fil de l'eau|en cours de route|une fois (?:ouvert|lance|en production|en prod))` },
    { id: 'approveLater', src: String.raw`homologu${ER} (?:apres coup|a posteriori|plus tard|apres|ensuite|dans la foulee)` },
    {
      id: 'straightToProd',
      src: String.raw`(?:pouss|deploy|deploi|livr|merg|pass|mett|bascul|envoy)${L}* (?:[${L}']+ ){0,3}?(?:directement|en direct|tout droit|direct) en prod${L}*`,
      guard: (ctx) => !/(?:apres|une fois) (?:\p{L}+ ){0,2}?(?:validation|valide|revue|recette|tests?|teste|homologation|feu vert|accord|cab|approbation)/u.test(ctx.n)
    }
  ],
  evidenceTampering: [
    {
      id: 'destroyEvidence',
      src: String.raw`(?:supprim|effac|detrui|detruis|purg|vid|nettoy|ecras|wip|reinitialis|caviard|expurg|trafiqu|falsifi|alter|antidat|maquill|bidouill|fai${L}* disparaitre|fass${L}* disparaitre|faire disparaitre)${L}* (?:${DET})?(?:${L}+ ){0,2}?${EVIDENCE}`,
      guard: (ctx) => {
        if (/(?:phishing|hameconnage|spam|malveillant|frauduleu|piege|indesirable)/.test(ctx.n)) return false
        if (/(?:de plus de|anterieurs? a|au dela de|vieux de|datant de plus de|plus vieux que) \d+ ?(?:jours?|mois|ans?|semaines?)|duree de (?:conservation|retention)|politique de (?:conservation|retention|purge)|conformement a/.test(ctx.n)) return false
        if (/^(?:vid|nettoy|ecras|reinitialis)\p{L}* (?:\p{L}+ |l'|d'){0,3}?(?:e ?mails?|mails?|courriels?|messages?|tickets?)$/u.test(ctx.match)) return false
        return true
      }
    },
    {
      id: 'destroyIncidentRecords',
      src: String.raw`(?:supprim|effac|detrui|detruis|purg|jet|brul|dechiquet|fai${L}* disparaitre)${L}* (?:${DET})?(?:${L}+ ){0,1}?(?:copies?|echanges?|conversations?|correspondances?|notes? de rancon|captures? d'ecran|messages? (?:des|du) (?:attaquants?|pirates?|groupe))`,
      guard: (ctx) => /(?:attaquant|pirate|groupe|criminel|rancon|incident|intrusion|fuite|compromission|enquete|plainte|chantage|hacker)/.test(ctx.n)
    },
    { id: 'rewriteEvidence', src: String.raw`(?:modifi|reecri|manipul|retouch|chang)${L}* (?:${DET})?(?:${L}+ ){0,2}?${EVIDENCE_STRICT}` },
    { id: 'wipeBeforeCapture', src: String.raw`(?:(?:reinstall|reimag|re imag|formatt?|reformat|restaur|reconstrui|redemarr|relanc|rebooter|reboot|eteind|eteign|nettoy|ecras)${L}*|remett${L}* (?:[${L}']+ ){0,3}?en (?:service|production|ligne|route)|remettre (?:[${L}']+ ){0,3}?en (?:service|production|ligne|route)) [^.;!?]{0,40}?(?:sans (?:faire |prendre |realiser |conserver |garder |copier |sauvegarder |collecter |extraire |attendre )?(?:de |d'|une |la |les |l'|un )?(?:copie|image|dump|collecte|capture|sauvegarde|preuves?|analyse|forensi${L}*|instantane|snapshot|expertise)|avant (?:toute |la |l'|les |une |meme )?(?:analyse|collecte|copie|image|expertise|investigation|forensi${L}*|enquete|intervention (?:du|de l'|des) (?:cert|anssi|enqueteurs|police|gendarmerie|prestataire)|arrivee (?:du|de l'|des) (?:cert|anssi|enqueteurs|police|gendarmerie|prestataire|experts?)))` },
    // « avant l'arrivée des enquêteurs, on réinstalle les serveurs »
    { id: 'wipeBeforeArrival', src: String.raw`avant (?:l'|la |le |les |toute |meme )?(?:arrivee|intervention|analyse|collecte|expertise|venue|passage|investigation|copie|image|enquete) (?:des |du |de l'|de la |d')?(?:${L}+ ){0,2}?[^.;!?]{0,30}?(?:reinstall|reimag|formatt?|restaur|reconstrui|nettoy|ecras|effac|supprim|purg|eteind|eteign|redemarr|remasteris)${L}*` },
    // « laissons les logs être écrasés par la rotation »
    { id: 'letDestroy', src: String.raw`laiss${ER} (?:${DET})?(?:${L}+ ){0,2}?${EVIDENCE}[^.;!?]{0,25}?(?:etre )?(?:ecras|effac|supprim|purg|detrui|disparaitre|perdre|tourner)${L}*` },
    { id: 'falsifyPurpose', src: String.raw`(?:modifi|chang|reecri|corrig|ajust|retouch|arrang|recul|avanc)${L}* (?:${DET})?(?:${L}+ ){0,2}?(?:date|heure|horodatage|timestamp|ticket|rapport|pv|proces verbal|compte rendu|chiffres|resultats?|score|cotation|registre|journal|historique)s?[^.;!?]{0,40}?(?:pour (?:que|qu'${L}+|faire croire|faire coller|coller|masquer|cacher|couvrir|laisser croire|donner l'impression|faire comme si|eviter (?:que|qu'${L}+)|(?:rester|tenir|etre|paraitre|sembler|rentrer|entrer) dans (?:les |le )?(?:delais?|clous|temps|(?:72|24|4) ?h?|normes|cases?))|afin (?:que|qu'${L}+|de (?:masquer|cacher|couvrir|faire croire))|de (?:sorte|maniere|facon) (?:que|qu'${L}+|a (?:masquer|cacher|faire croire)))` },
    { id: 'antedate', src: String.raw`antidat${L}*|falsifi${L}*|contrefai${L}*` },
    { id: 'stopLogging', src: String.raw`(?:desactiv|coup|arret|suspend|stopp)${L}* (?:${DET})?(?:journalisation|logs?|audit trail|traces? d'audit|collecte des (?:logs|journaux|traces))`, guard: (ctx) => !/(?:verbeu|debug|bruit|niveau de detail)/.test(ctx.n) }
  ],
  stolenDataPayment: [
    { id: 'payRansom', src: String.raw`${PAY} (?:${DET})?(?:${L}+ ){0,2}?${RANSOM}` },
    { id: 'buyBack', src: String.raw`(?:rachet${L}*|rachat)[^.;!?]{0,25}?${STOLEN}`, guard: (ctx) => !/(?:licences?|actions|parts|societe|entreprise|contrat)/.test(ctx.match) },
    {
      id: 'buyStolen',
      src: String.raw`${PAY}[^.;!?]{0,25}?${STOLEN}`,
      guard: (ctx) => STOLEN_CONTEXT.test(ctx.n) && !/(?:outil|solution|logiciel|licence|service|abonnement|prestation|offre|contrat|module|sonde|edr|dlp|assurance|formation|audit|expertise|serveur|disque|stockage|materiel)/.test(ctx.match)
    },
    { id: 'payAttackers', src: String.raw`${PAY}[^.;!?]{0,30}?(?:aux|les|des|a des|au|le) ${ATTACKERS}` },
    { id: 'payToRecover', src: String.raw`pay${L}* pour (?:qu'ils|qu'elles|que les (?:pirates|attaquants|hackers)|recuperer (?:nos|les|notre) (?:donnees|fichiers|base)|obtenir (?:la|les) cles?|que (?:la base|les donnees|le fichier|le lot)|faire (?:retirer|supprimer|disparaitre|effacer))` },
    { id: 'negotiatePrice', src: String.raw`(?:negoci|discut|transig|marchand)${L}* (?:avec )?(?:${DET})?${ATTACKERS}[^.;!?]{0,40}?(?:prix|montant|rancon|rachat|paiement|remise|ristourne|somme|tarif)` },
    { id: 'negotiateRansom', src: String.raw`(?:negoci|marchand|discut|transig)${L}* [^.;!?]{0,80}?${RANSOM}` },
    // « Ils réclament 300 000 € : payons », « verser ce que les pirates exigent »
    {
      id: 'payDemanded',
      src: String.raw`${PAY}(?:[^.;!?]{0,20}?ce (?:qu'ils|qu'elles|que les ${L}+) (?:exigent|demandent|reclament|veulent))?`,
      guard: (ctx) => /(?:ils|elles|les attaquants|les pirates|le groupe|les hackers|les ranconneurs|on nous|qu'ils|qu'elles|que les \p{L}+) (?:veulent|exigent|demandent|reclament|menacent|exigeaient|demandaient)/u.test(ctx.whole || ctx.n)
        && (STOLEN_CONTEXT.test(ctx.whole || ctx.n) || new RegExp(RANSOM, 'u').test(ctx.whole || ctx.n) || /\d[\d ]*(?:k€|m€|€|euros)/.test(ctx.whole || ctx.n))
        && !/(?:prestataire|facture|fournisseur|expert|avocat|salaire|prime)/.test(ctx.n)
    },
    // « Proposons-leur 50 000 € contre la suppression des données »
    {
      id: 'offerMoney',
      src: String.raw`(?:propos|offr|accord|consent)${L}* (?:leur |aux (?:pirates|attaquants|hackers|ranconneurs) )?(?:une somme|un montant|un paiement|\d[\d ]*(?:k€|m€|€|euros|bitcoins?|btc))[^.;!?]{0,40}?(?:contre|en echange|pour (?:que|qu'|recuperer|supprimer|retirer|effacer|obtenir))`,
      guard: (ctx) => STOLEN_CONTEXT.test(ctx.whole || ctx.n) || /(?:rancon|chantage|exfiltr|vol)/.test(ctx.whole || ctx.n)
    },
    // « envoyons la somme sur le portefeuille indiqué dans la note de rançon »
    {
      id: 'paySum',
      src: String.raw`${PAY} (?:${DET})?(?:somme|montant|sommes|fonds|virement|paiement)`,
      guard: (ctx) => new RegExp(RANSOM, 'u').test(ctx.n) || /(?:portefeuille|wallet|attaquants|pirates|hackers|ranconneurs)/.test(ctx.n)
    },
    { id: 'yieldToDemand', src: String.raw`(?:accept|repond|satisf|ced)${L}* (?:a |au |aux )?(?:${DET})?(?:demandes?|exigences?|chantage|ultimatum)s? (?:de rancon|des (?:pirates|attaquants|ranconneurs|hackers|cybercriminels)|du groupe)` }
  ],
  abruptShutdown: [
    { id: 'shutWithoutPlan', src: String.raw`${SHUT}[^.;!?]{0,60}?${BRUTAL}`, guard: (ctx) => SHUT_OBJ_RE.test(ctx.match) },
    { id: 'shutBrutally', src: String.raw`${SHUT} (?:brutalement|d'un coup|net|sec|sans sommation)` },
    { id: 'brutalThenShut', src: String.raw`sans (?:aucune? |la moindre |le moindre )?(?:prevenir|avertir|plan|pca|pra|mode degrade|preavis|coordination|concertation|plan de (?:reprise|continuite))[^.;!?]{0,30}?${SHUT} (?:${DET})?(?:${L}+ ){0,2}?${SHUT_OBJ}` },
    { id: 'shutEverything', src: String.raw`(?:tout (?:couper|eteindre|arreter|debrancher)|(?:coup|eteign|eteind|arret|debranch)${L}* tout)[^.;!?]{0,40}?(?:et (?:on )?(?:verra|avisera)|tant pis|peu importe|quoi qu'il en coute|sans (?:plan|pca|pra|mode degrade|prevenir))` }
  ]
}

// ---------------------------------------------------------------------------------------------
// Négation, refus et mise en garde autour d'une occurrence
// ---------------------------------------------------------------------------------------------

const SUBJECT = new Set(['on', 'nous', 'je', 'vous', 'il', 'elle', 'ils', 'elles', "j'"])
const REFUSAL_WORDS = String.raw`(?:exclu${L}*|interdi${L}*|proscri${L}*|inacceptable|inenvisageable|impensable|refus${L}*|jamais|en aucun cas|pas question|hors de question|aucunement|nullement|m'oppose|nous opposons|s'oppose|opposes?|pas le droit|plutot que|au lieu|evit${ER}|on evite|on evitera|sans chercher a|loin de|ni|empech${L}*|interdisons|proscrivons|bannissons|banni${L}*|il serait (?:illegal|irresponsable|dangereux|inacceptable|une faute|une erreur|suicidaire)|ce serait (?:illegal|irresponsable|une faute|une erreur|inacceptable|dangereux|suicidaire))`
const REFUSAL_RE = new RegExp(String.raw`(?:^|[^${L}])${REFUSAL_WORDS}(?:[^${L}]+|$)((?:[${L}']+[^${L}]*){0,7})$`, 'u')
const NEG_VERB_BEFORE = new RegExp(String.raw`(?:^|[^${L}])(?:ne|n') ?(?:[${L}']+ ){0,2}?(?:pas|jamais|plus|point|guere|nullement|rien|aucun|aucune|personne)(?:[^${L}]+|$)((?:[${L}']+[^${L}]*){0,4})$`, 'u')
const SHORT_NEG_BEFORE = new RegExp(String.raw`(?:^|[^${L}])(?:aucun|aucune|nul|nulle|pas de|pas d'|jamais de|jamais d'|point de|zero|rien ne|personne ne|nulle part)(?:[^${L}]+|$)((?:[${L}']+[^${L}]*){0,6})$`, 'u')
const SANS_BEFORE = /(?:^|[^\p{L}])sans (?:(?:le|la|les|en|y|rien|jamais|meme|pour autant|chercher a|vouloir) |l')*$/u
const NE_BEFORE = /(?:^|[^\p{L}])(?:ne|n') ?(?:(?:le|la|les|en|y|se|s'|lui|leur|nous|vous|me|m'|te|t') ?)*$/u
const NEG_WORD_AFTER_VERB = /^(?:[\p{L}]+)(?:'|\s)+(?:surtout |absolument |vraiment )?(?:pas|jamais|plus|point|guere|nullement|aucunement|rien|personne|aucun|aucune|en aucun cas|en rien)(?![\p{L}])/u
// Négation explétive ou suggestive : « pourquoi ne pas… », « je me demande si on ne pourrait pas… », « ne pourrait-on pas… »
const EXPLETIVE_NEG = /(?:(?:^|[^\p{L}])(?:pourquoi|si|est ce qu'on|est ce que (?:nous|l'on|on))\s+(?:on |nous |l'on )?(?:ne|n')\s?(?:[\p{L}']+\s){0,2}?(?:pas|plus)|(?:^|[^\p{L}])(?:ne|n')\s?(?:pourrait|pourrions|faudrait|devrait|devrions|serait|vaudrait|peut|pouvons|faut)\s(?:t\s)?(?:on|il|nous|ce)\s(?:pas|plus))\s(?:[\p{L}']+\s?){0,3}$/u

// Le reste du segment après le mot de refus doit appartenir à la même proposition : un nouveau sujet
// (« tant qu'on n'est pas sûrs ON attend… ») hors subordonnée (« exclu QUE nous attendions ») rompt la portée.
function sameClause(tail, { leadingSubject = false } = {}) {
  const words = (tail || '').match(/[\p{L}']+/gu) || []
  for (let i = 0; i < words.length; i++) {
    if (leadingSubject && i === 0) continue
    if (SUBJECT.has(words[i]) && !(i > 0 && /^(?:que|qu'|de|d'|a)$/.test(words[i - 1]))) return false
  }
  return true
}

// Proposition qui précède l'occurrence : bornée par . ! ? ; : et les connecteurs adversatifs
function clauseBeforeAt(n, start) {
  const head = n.slice(Math.max(0, start - 120), start)
  const cut = Math.max(head.lastIndexOf(';'), head.lastIndexOf(':'), head.lastIndexOf('!'), head.lastIndexOf('?'), head.lastIndexOf('.'))
  let clause = cut >= 0 ? head.slice(cut + 1) : head
  const adversative = clause.match(/^.*(?:^|[^\p{L}])(?:mais|donc|cependant|toutefois|neanmoins|pourtant|alors que)(?![\p{L}])/u)
  if (adversative) clause = clause.slice(adversative[0].length)
  // Après une virgule, un nouveau sujet ouvre une autre proposition (« Il ne faut pas paniquer, on attend lundi »)
  const parts = clause.split(',')
  if (parts.length > 1) {
    const last = parts[parts.length - 1]
    const first = (last.match(/[\p{L}']+/u) || [''])[0]
    if (SUBJECT.has(first) || /^qu'(?:on|il|elle)$/.test(first)) return last
  }
  return clause
}

/** L'occurrence est-elle niée ou refusée par ce qui la précède ? */
function refusedBefore(n, start) {
  const before = clauseBeforeAt(n, start)
  if (SANS_BEFORE.test(before) && !/^sans/.test(n.slice(start))) return true
  if (EXPLETIVE_NEG.test(before)) return false
  for (const re of [REFUSAL_RE, NEG_VERB_BEFORE, SHORT_NEG_BEFORE]) {
    const m = before.match(re)
    if (m && sameClause(m[1], { leadingSubject: re === REFUSAL_RE })) return true
  }
  // Verbe nié : « on n'ouvre pas sans homologation », « nous ne retarderons pas la notification »
  if (NE_BEFORE.test(before) && NEG_WORD_AFTER_VERB.test(n.slice(start))) return true
  return false
}

// Mise en garde qui suit : « … nous mettrait hors délai », « … serait une faute », « … ne garantit rien »
const WARNING_AFTER = new RegExp([
  String.raw`(?:serait|sera|est|constituerait|constitue|reviendrait a|revient a|serait vu comme|serait percu comme|apparaitrait comme) (?:${L}+ )?(?:une? )?(?:faute|erreur|illegal${L}*|manquement|infraction|violation|delit|interdit${L}*|inacceptable|irresponsable|dangereu${L}*|grave|suicidaire|catastrophique|contraire|exclu${L}*|hors de question|inenvisageable|sanctionn${L}*|passible)`,
  String.raw`(?:nous|vous|les|l'|on|me|te) ?(?:exposerait|expose|exposera|exposeraient|mettrait|met|mettra) (?:a |en |hors |dans )`,
  String.raw`(?:^|[^${L}])(?:exposerait|exposeraient)(?![${L}])`, 'hors delai', 'en infraction', 'en faute', 'amendes?', 'sanctions?', 'mise en demeure', 'responsabilite penale',
  String.raw`engag${L}* (?:notre|la|sa|leur|votre) responsabilite`, String.raw`(?:violer|violerait|enfreindr${L}*|enfreint)`,
  String.raw`ne garanti${L}* (?:rien|pas|aucun${L}*)`, String.raw`n'apporte${L}* (?:rien|aucune?)`, String.raw`financ${L}* (?:le crime|les criminels|la criminalite)`,
  String.raw`alimente${L}* (?:le crime|les criminels|la criminalite)`, 'on perdrait', 'nous perdrions', String.raw`detruirait (?:la|notre|toute) (?:confiance|credibilite)`,
  String.raw`(?:n'est|ne sera|ne serait) (?:pas|jamais) (?:une option|envisageable|acceptable|possible|tolere${L}*|permis)`, String.raw`n'entre pas en ligne de compte`,
  String.raw`ne (?:se fera|passera|tiendra) (?:pas|jamais)`, String.raw`(?:est|serait|sera) (?:formellement |strictement |totalement )?(?:exclu${L}*|proscrit${L}*|interdit${L}*)`
].join('|'), 'u')
const WARNING_DISCOUNT = /(?:^|[^\p{L}])(?:sinon|autrement|faute de quoi|sans quoi|pour ne pas|pour eviter|de peur de|de crainte de|plutot que de|par peur de)(?![\p{L}])|(?:^|[^\p{L}])(?:sans|aucune?|ni|pas d'|pas de|zero)\s*(?:\p{L}+\s){0,1}$/u
const OVERRIDE = /(?:^|[^\p{L}])(?:tant pis|quitte a|peu importe|on assume|on prendra le risque|on prend le risque|au pire|ca vaut le coup|ca vaut la peine|le jeu en vaut la chandelle|c'est jouable)(?![\p{L}])/u

function warnedAfter(n, end) {
  const after = n.slice(end, end + 160).split(/[.!?;\n]/)[0]
  const m = after.match(WARNING_AFTER)
  if (!m) return false
  if (WARNING_DISCOUNT.test(after.slice(0, m.index))) return false
  return !OVERRIDE.test(n)
}

// Contextes légitimes propres à une famille
const NO_BREACH_CONTEXT = /tant qu(?:'|e )(?:aucune?|il n'y a (?:pas|aucune?)|on n'a (?:pas|aucune?)|nous n'avons (?:pas|aucune?)|la violation n'est pas|ce n'est pas|rien n'|personne n'a (?:confirme|etabli))|aucune? (?:compromission|exploitation|violation|fuite|donnee personnelle)|pas de (?:compromission|violation|fuite|donnees? personnelles?)|n'est pas (?:une violation|averee|etablie)/
const TIMELY = /(?:sous|dans les|dans un delai de|avant|en moins de|au plus tard (?:dans|sous)?|d'ici) (?:24|72|4) ?h|dans (?:le|les) delais? (?:legaux|reglementaires|impartis)?|dans les temps|sans delai|immediatement|des maintenant|tout de suite/
const DELAY_RE = new RegExp(String.raw`(?:^|[^${L}])${DELAY}(?![${L}])`, 'u')
const LATE_TIME_RE = new RegExp(String.raw`(?:^|[^${L}])${LATE_TIME}(?![${L}])`, 'u')
const LATE_LEGIT = /(?:classification|classement|qualification) (?:de l'incident|en incident majeur|comme majeur|majeur)?|rapport (?:final|complet|definitif|intermediaire)|notification (?:complementaire|intermediaire|finale)|bilan final|complet\p{L}* (?:la |le |l'|notre )?(?:notification|declaration|signalement)|(?:notification|declaration|signalement) (?:initiale |precoce )?(?:deja )?(?:faite|envoyee|transmise|deposee|effectuee)|deja (?:faite|envoyee|transmise|deposee|notifiee|declaree|effectuee)|complement\p{L}*|mise a jour de la notification|alerte precoce (?:envoyee|faite|transmise|deposee)|notification initiale (?:envoyee|faite|transmise|deposee)/u

const FAMILY_GUARDS = {
  concealment: (n, hit) => !(NO_BREACH_CONTEXT.test(n) && !DELAY_RE.test(n) && !LATE_TIME_RE.test(n) && hit.rule !== 'hide' && !/^nobody/.test(hit.rule)),
  lateNotification: (n, hit) => !(PRESS.test(hit.match || '') && !AUTHORITY_OR_BOARD.test((hit.match || '').replace(new RegExp(PRESS.source, 'gu'), ' ').replace(/apres (?:la |l')?(?:notification|declaration|information|signalement).*$/, '')))
    && !(NO_BREACH_CONTEXT.test(n) && !DELAY_RE.test(n) && !LATE_TIME_RE.test(n))
    && !(TIMELY.test(n) && !/(?:au dela|apres les|hors delai)/.test(n)) && !(LATE_LEGIT.test(n) && !LATE_TIME_RE.test(n))
}

// ---------------------------------------------------------------------------------------------
// Familles : description, compilation, paramètres
// ---------------------------------------------------------------------------------------------

/**
 * Familles de lignes rouges génériques. Chaque entrée : { key, label, description, params }.
 * params : options acceptées dans une référence { family, ...params } (targets, controls).
 */
export const RED_LINE_FAMILIES = Object.freeze({
  concealment: Object.freeze({ key: 'concealment', label: 'Dissimulation ou omission d\'information', description: 'Taire, omettre ou maquiller une information due à une autorité, à un comité, à un registre, à une AIPD, aux patients ou aux clients.', params: ['targets'] }),
  lateNotification: Object.freeze({ key: 'lateNotification', label: 'Notification réglementaire retardée', description: 'Attendre, différer ou conditionner une notification obligatoire (CNIL, ANSSI, ARS, ACPR/BCE, clients, personnes concernées).', params: ['targets'] }),
  bypassControl: Object.freeze({ key: 'bypassControl', label: 'Contournement d\'un contrôle', description: 'Ouvrir ou livrer sans homologation, security gate, revue, test d\'intrusion ou staging ; suspendre ou reporter le contrôle.', params: ['controls'] }),
  evidenceTampering: Object.freeze({ key: 'evidenceTampering', label: 'Destruction ou altération de preuves', description: 'Effacer, modifier ou écraser journaux, traces et images avant collecte ; antidater un document.', params: [] }),
  stolenDataPayment: Object.freeze({ key: 'stolenDataPayment', label: 'Paiement d\'une rançon ou rachat de données volées', description: 'Payer une rançon, racheter un lot ou un échantillon exfiltré, négocier un prix avec les attaquants.', params: [] }),
  abruptShutdown: Object.freeze({ key: 'abruptShutdown', label: 'Coupure brutale sans plan de reprise', description: 'Couper, éteindre ou isoler brutalement un système critique sans plan de reprise, mode dégradé ni coordination.', params: [] })
})
export const RED_LINE_FAMILY_KEYS = Object.freeze(Object.keys(RED_LINE_FAMILIES))
// Anciennes clés de motifs → famille et sous-ensemble de règles
const LEGACY = {
  silence: { family: 'concealment' },
  untraced: { family: 'concealment', onlyRecord: true },
  bypassApproval: { family: 'bypassControl', controls: ['approval'] },
  dropPentest: { family: 'bypassControl', controls: ['pentest'] },
  ransomPayment: { family: 'stolenDataPayment' },
  dataPurchase: { family: 'stolenDataPayment' }
}

const compiled = new Map()
function rulesFor(family, controls) {
  const key = `${family}|${(controls || []).join(',')}`
  if (compiled.has(key)) return compiled.get(key)
  const control = controlOf(controls)
  const approval = controlOf(['approval'])
  const list = (RULES[family] || []).map((rule) => {
    if (/@APPROVAL@/.test(rule.src) && controls && controls.length && !controls.includes('approval')) return null
    const src = rule.src.replace(/@CONTROL@/g, control).replace(/@APPROVAL@/g, approval)
    return { ...rule, re: new RegExp(String.raw`(?:^|[^${L}])(${src})(?![${L}])`, 'gu') }
  }).filter(Boolean)
  compiled.set(key, list)
  return list
}

/** Référence de famille normalisée : 'concealment' | { family, targets?, controls?, rules? } → { family, targets, controls, rules } ou null. */
export function resolveFamilySpec(spec) {
  if (typeof spec === 'string') {
    if (RED_LINE_FAMILIES[spec]) return { family: spec, targets: null, controls: null, rules: null }
    if (LEGACY[spec]) return { targets: null, rules: null, controls: null, ...LEGACY[spec] }
    return null
  }
  if (!spec || typeof spec !== 'object') return null
  const base = resolveFamilySpec(spec.family || spec.key)
  if (!base) return null
  const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? [v] : null)
  return { ...base, targets: list(spec.targets) || base.targets, controls: list(spec.controls) || base.controls, rules: list(spec.rules) || base.rules }
}

const targetCache = new Map()
function targetsRegex(targets) {
  if (!targets || !targets.length) return null
  const key = targets.join('|')
  if (targetCache.has(key)) return targetCache.get(key)
  const terms = targets.flatMap((t) => RED_LINE_TARGETS[t] || [t]).map((t) => normalize(t)).filter(Boolean)
  const re = terms.length ? new RegExp(String.raw`(?:^|[^${L}])(?:${terms.map(escapeRe).join('|')})`, 'u') : null
  targetCache.set(key, re)
  return re
}

const RECORD_HINT = /trace|document|consign|journalis|ecri|accord verbal|oralement/

/** Première occurrence non niée d'une famille dans une phrase (texte normalisé), ou null : { family, rule, start, end, match }. */
function findInSentence(n, spec, wholeNormalized, prev = '') {
  const targetRe = targetsRegex(spec.targets)
  if (targetRe && !targetRe.test(wholeNormalized || n)) return null
  if (spec.onlyRecord && !RECORD_RE.test(n) && !RECORD_HINT.test(n)) return null
  for (const rule of rulesFor(spec.family, spec.controls)) {
    if (spec.rules && !spec.rules.includes(rule.id)) continue
    let count = 0
    for (const m of n.matchAll(rule.re)) {
      if (++count > 50) break
      const start = m.index + (m[0].length - m[1].length)
      const end = start + m[1].length
      const ctx = { n, start, end, match: m[1], rule, whole: wholeNormalized || n, prev }
      if (rule.guard && !rule.guard(ctx)) continue
      if (refusedBefore(n, start)) continue
      if (!exploratoryStart(n) && warnedAfter(n, end)) continue
      const familyGuard = FAMILY_GUARDS[spec.family]
      if (familyGuard && !familyGuard(n, { rule: rule.id, start, end, match: m[1] })) continue
      return { family: spec.family, rule: rule.id, start, end, match: m[1] }
    }
  }
  return null
}

// ---------------------------------------------------------------------------------------------
// Modalité : proposition (franchie) ou vraie question exploratoire (testée)
// ---------------------------------------------------------------------------------------------

const ENDS_WITH_QUESTION = /\?[\s»"”'’)\]]*$/
// Demande d'accord en fin de proposition : « …, d'accord ? », « …, on y va ? », « …, qu'en pensez-vous ? »
const TAG_QUESTION = /(?:^|[,:;—–-]|\s)\s*(?:non|hein|ok|okay|d'accord|on est d'accord|vous etes d'accord|tout le monde est d'accord|ca vous va|ca vous irait|ca vous convient|ca marche|ca passe|ca tient|c'est bon|c'est jouable|c'est ok|n'est ce pas|vous validez|vous valideriez|on valide|on y va|on fait comme ca|on part (?:la dessus|sur ca)|banco|qu'en pensez vous|qu'en dites vous|vous en pensez quoi|vous en dites quoi|votre avis|des objections?|une objection|quelqu'un s'y oppose|ca vous parait (?:jouable|raisonnable|acceptable|bien)|vu|compris|oui ou non|vous me suivez|vous signez|on signe|on acte|on tranche|ca vous semble (?:jouable|raisonnable|acceptable|bien))\s*[?!.\s]*$/u
// Question orientée (suggestion déguisée) : « pourquoi ne pas… ? », « ne pourrait-on pas… ? », « ce ne serait pas plus simple de… ? »
const SUGGESTIVE_QUESTION = /^(?:et )?pourquoi (?:ne pas|pas|ne (?:\p{L}+ )?(?:on|nous|vous) pas|on ne|ne pourrait on pas)|^ne (?:pourrait|pourrions|faudrait|devrait|devrions|serait|vaudrait|vaut|faut|peut)[ -]?(?:t )?(?:on|il|nous|ce)|^n'(?:est|aurait|aurions|avons) (?:t )?(?:il|on|ce|nous) pas|^on ne pourrait pas|^ce ne serait pas|^ca ne serait pas|^vous ne trouvez pas|^il ne vaudrait pas mieux|^(?:il )?vaudrait (?:pas )?mieux|^(?:ce|ca) serait (?:pas )?(?:plus simple|mieux|plus malin|plus sage)|^le plus simple ne serait il pas|^le plus simple,? ce serait pas/u
// Vraie question exploratoire : « Et si… ? », « Que se passerait-il si… ? », « Peut-on… ? », « Est-ce qu'on… ? »
const LEADING_FILLER_EARLY = /^(?:(?:alors|bon|bref|donc|mais|euh|question|une question|petite question|simple question|juste une question|hypothese|par curiosite)\s*[,:]?\s*)+/
const EXPLORATORY_QUESTION = /^(?:et )?si |^imaginons|^supposons|^admettons|^mettons que|^dans l'hypothese|^a supposer|^en admettant|^que se passerait|^que se passe t il si|^qu'est ce qui se passe(?:rait)? si|^qu'arriverait|^qu'arrive t il si|^que risque(?:rait|rions|ions)?(?: t)? (?:on|nous|l'on)|^que risquons nous|^quels? (?:seraient |serait |sont |est |serait le |seraient les )?(?:le |les |la )?(?:risques?|consequences?|impacts?|effets?|sanctions?|implications?)|^quelles? (?:seraient |sont |serait )?(?:les |la )?(?:consequences?|sanctions?|implications?)|^que dirai(?:t|ent)|^comment (?:reagirai\p{L}*|le prendrai\p{L}*|reagirait|serait percu)|^est ce (?:qu'on|que (?:l'on|nous|on|vous|ce|c'|la|le|les|l')|qu'il|qu'elle|possible|envisageable|legal|jouable|permis|autorise|grave|risque)|^est il (?:possible|envisageable|legal|permis|autorise|concevable|raisonnable)|^serait il (?:possible|envisageable|legal|permis|autorise|concevable|raisonnable)|^serait ce (?:possible|envisageable|legal|grave|risque|permis)|^(?:peut|pourrait|faudrait|faut|devrait|doit|aurait|a) (?:t )?(?:on|il)(?![\p{L}])|^pouvons nous|^pourrions nous|^devons nous|^devrions nous|^avons nous le droit|^aurions nous le droit|^jusqu'(?:a|ou)|^combien de temps (?:peut|pourrait|pouvons|pourrions|a t|avons|aurait)|^dans quelle mesure|^y a t il (?:un |une )?(?:risque|moyen|possibilite|marge)|^quel (?:delai|risque|est le risque|serait le risque) (?:si|a|aurait|avons|a t)|^qu'est ce qu'on risque|^on risque quoi|^ca risque quoi|^c'est (?:legal|permis|autorise|possible|envisageable) (?:de|d')|^on a le droit (?:de|d')|^on peut (?:legalement |vraiment |reellement )|^on pourrait (?:legalement |vraiment )/u
const exploratoryStart = (n) => EXPLORATORY_QUESTION.test(n.replace(LEADING_FILLER_EARLY, '')) && /\?[\s»"”'’)\]]*$/.test(n)
const INDIRECT_QUESTION = /(?:^|[^\p{L}])(?:je me demande si|je me demandais si|on peut se demander si|on pourrait se demander si|je m'interroge sur|la question se pose de savoir si|reste a savoir si|ma question est de savoir si|je pose la question de savoir si)(?![\p{L}])/u
const TEMPTATION = /(?:^|[^\p{L}])(?:tente\p{L}* de|tentant de|la tentation (?:serait|est|sera) de|certains (?:voudraient|proposent|suggerent|aimeraient|pensent qu'il faut|diront qu'il faut)|d'aucuns|on (?:m'a|nous a) (?:suggere|propose) de|le reflexe serait de|le reflexe naturel serait de)(?![\p{L}])/u
// Avantage avancé pour l'option : la question devient un plaidoyer (« …, ça éviterait la panique »)
const BENEFIT = /(?:^|[^\p{L}])(?:(?:ca|cela|ce|on) (?:nous )?(?:eviterait|eviterai|permettrait|laisserait|donnerait|simplifierait|arrangerait|ferait gagner|epargnerait|economiserait|calmerait|rassurerait)|on gagnerait|on eviterait|ce serait plus (?:simple|facile|rapide|sur|confortable|discret)|plus simple|plus discret|moins de bruit|moins de vagues|personne ne (?:le )?(?:saura|verra|remarquera)|ni vu ni connu|ca passerait|ca nous arrange|on serait tranquilles?|on economise|on gagne du temps|gain de temps|pas de vagues)(?![\p{L}])/u
const LEADING_FILLER = /^(?:(?:alors|bon|bref|donc|mais|euh|dites|dites moi|question|une question|petite question|simple question|juste une question|hypothese|par curiosite|honnetement|franchement|sincerement|serieusement|entre nous)\s*[,:]?\s*)+/

/**
 * Modalité d'une phrase qui évoque une ligne rouge : 'probed' (vraie question exploratoire, sans engagement)
 * ou 'crossed' (proposition, même au conditionnel, à l'impératif, à l'infinitif ou sous forme de question orientée).
 * following : phrases suivantes du même message (un argument en faveur de l'option la transforme en proposition).
 */
export function redLineModality(sentence, { following = [] } = {}) {
  const raw = String(sentence || '').trim()
  if (!raw) return 'crossed'
  const n = normalize(raw)
  const pleads = BENEFIT.test(n) || (Array.isArray(following) && following.some((s) => {
    const t = typeof s === 'string' ? s : s?.text
    return t && !ENDS_WITH_QUESTION.test(t.trim()) && BENEFIT.test(normalize(t))
  }))
  if (TEMPTATION.test(n) && !pleads) return 'probed'
  const indirect = INDIRECT_QUESTION.test(n)
  if (!ENDS_WITH_QUESTION.test(raw) && !indirect) return 'crossed'
  const body = n.replace(/[\s?!.»"”'’)\]]+$/u, '')
  if (!indirect && TAG_QUESTION.test(body)) return 'crossed'
  const variants = [body.replace(LEADING_FILLER, '')]
  // Vocatif ou thème détaché en tête (« Julien, et si… ? », « Pour la fuite, peut-on… ? »)
  const detached = variants[0].match(/^[^,?]{1,40},\s*(.+)$/)
  if (detached) variants.push(detached[1].replace(LEADING_FILLER, ''))
  if (variants.some((v) => SUGGESTIVE_QUESTION.test(v))) return 'crossed'
  if (pleads) return 'crossed'
  if (indirect || variants.some((v) => EXPLORATORY_QUESTION.test(v))) return 'probed'
  return 'crossed'
}

/**
 * Mise en garde contre l'option évoquée (pas une proposition) : protase en « si » ou sujet à l'infinitif suivi d'une
 * conséquence négative (« Si on coupait le SCADA, on perdrait la production », « Couper le SCADA serait illégal »).
 * Une question n'est jamais une mise en garde (« …, qu'est-ce qu'on perdrait ? » interroge).
 */
export function isWarningSentence(sentence) {
  const raw = String(sentence || '').trim()
  if (!raw || ENDS_WITH_QUESTION.test(raw)) return false
  const n = normalize(raw)
  if (OVERRIDE.test(n) || BENEFIT.test(n)) return false
  const si = n.match(/^(?:(?:et|mais|alors|bon|donc|meme) )*si [^,]{3,}?,\s*(.+)$/)
  const tail = si ? si[1] : /^[\p{L}]+(?:er|ir|re)(?![\p{L}])/u.test(n) ? n : null
  if (!tail) return false
  const m = tail.match(WARNING_AFTER)
  return !!m && !WARNING_DISCOUNT.test(tail.slice(0, m.index))
}

/** Vraie question exploratoire (« Et si… ? », « Que se passerait-il si… ? », « Peut-on… ? »), sans engagement ni argument en faveur. */
export function isExploratoryQuestion(sentence, options = {}) {
  const raw = String(sentence || '').trim()
  if (!ENDS_WITH_QUESTION.test(raw) && !INDIRECT_QUESTION.test(normalize(raw))) return false
  return redLineModality(raw, options) === 'probed'
}

// ---------------------------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------------------------

const asSpecs = (families) => {
  const list = families === undefined || families === null ? RED_LINE_FAMILY_KEYS : Array.isArray(families) ? families : [families]
  return list.map(resolveFamilySpec).filter(Boolean)
}

/**
 * Une famille (ou une référence { family, targets, controls }) est-elle évoquée dans le texte, sans négation ?
 * Booléen, indépendant de la modalité (proposition ou question) : sert de motif à matchTermGroups.
 */
const hitCache = new Map()
export function familyHit(text, spec) {
  const resolved = resolveFamilySpec(spec)
  if (!resolved) return false
  const key = `${JSON.stringify(resolved)}|${text}`
  if (hitCache.has(key)) return hitCache.get(key)
  const hit = familyHitUncached(text, resolved)
  if (hitCache.size > 1000) hitCache.delete(hitCache.keys().next().value)
  hitCache.set(key, hit)
  return hit
}

function familyHitUncached(text, resolved) {
  const whole = normalize(text)
  const sentences = splitSentences(String(text || ''))
  return sentences.some((s, i) => !!findInSentence(normalize(s.text), resolved, whole, i > 0 ? normalize(sentences[i - 1].text) : ''))
}

/**
 * Lignes rouges génériques d'un message, phrase par phrase.
 * Options : families (clés ou références paramétrées, défaut toutes), modality (true : distingue franchie / testée).
 * @returns {{ crossed: Array<{ family, label, rule, sentence, index }>, probed: Array<…>, families: Object<string, 'crossed'|'probed'>,
 *   hasCrossed: boolean, hasProbed: boolean, any: boolean }}
 */
const detectCache = new Map()
export function detectRedLines(text, { families, modality = true } = {}) {
  const raw = typeof text === 'string' ? text : ''
  const cacheKey = families === undefined || families === null ? `${modality ? 1 : 0}|${raw}` : null
  if (cacheKey !== null && detectCache.has(cacheKey)) return JSON.parse(JSON.stringify(detectCache.get(cacheKey)))
  const result = detectRedLinesUncached(raw, { families, modality })
  if (cacheKey !== null) {
    if (detectCache.size > 200) detectCache.delete(detectCache.keys().next().value)
    detectCache.set(cacheKey, result)
    return JSON.parse(JSON.stringify(result))
  }
  return result
}

function detectRedLinesUncached(raw, { families, modality }) {
  const sentences = splitSentences(raw)
  const whole = normalize(raw)
  const specs = asSpecs(families)
  const crossed = []
  const probed = []
  const state = {}
  sentences.forEach((s, i) => {
    const n = normalize(s.text)
    for (const spec of specs) {
      const hit = findInSentence(n, spec, whole, i > 0 ? normalize(sentences[i - 1].text) : '')
      if (!hit) continue
      const mode = modality ? redLineModality(s.text, { following: sentences.slice(i + 1) }) : 'crossed'
      const entry = { family: spec.family, label: RED_LINE_FAMILIES[spec.family]?.label || spec.family, rule: hit.rule, sentence: s.text, index: i }
      ;(mode === 'probed' ? probed : crossed).push(entry)
      if (mode === 'crossed' || !state[spec.family]) state[spec.family] = mode
    }
  })
  const crossedFamilies = new Set(crossed.map((c) => c.family))
  const probedOnly = probed.filter((p) => !crossedFamilies.has(p.family))
  return { crossed, probed: probedOnly, families: state, hasCrossed: crossed.length > 0, hasProbed: probedOnly.length > 0, any: crossed.length + probedOnly.length > 0 }
}

/**
 * Motifs booléens par famille (phrase → booléen), pour TermGroup.patterns : clés historiques (concealment, silence,
 * lateNotification, untraced, bypassApproval, dropPentest) et familles (bypassControl, evidenceTampering,
 * stolenDataPayment / ransomPayment, abruptShutdown). Une tournure niée ou refusée ne compte pas.
 */
export const RED_LINE_PATTERNS = Object.freeze(Object.fromEntries(
  [...RED_LINE_FAMILY_KEYS, ...Object.keys(LEGACY)].map((key) => [key, (s) => familyHit(s, key)])
))

/**
 * Relie des familles génériques aux lignes rouges d'un acteur, sans recopier de motif :
 * linkRedLineFamilies(redLines, { 'Libellé de la ligne rouge': ['concealment', { family: 'lateNotification', targets: ['ars'] }] })
 * → nouvelles lignes rouges avec families renseigné (fusionné). Les libellés absents sont ignorés ; addMissing: true
 * ajoute une ligne rouge { label, families } pour un libellé absent.
 */
export function linkRedLineFamilies(redLines, mapping = {}, { addMissing = false } = {}) {
  const list = Array.isArray(redLines) ? redLines.filter((g) => g && typeof g === 'object') : []
  const map = mapping && typeof mapping === 'object' ? mapping : {}
  const asList = (v) => (Array.isArray(v) ? v : v ? [v] : [])
  const out = list.map((g) => {
    const extra = asList(map[g.label])
    if (!extra.length) return g
    return { ...g, families: [...asList(g.families), ...extra] }
  })
  if (addMissing) {
    for (const [label, fams] of Object.entries(map)) {
      if (!list.some((g) => g.label === label)) out.push({ label, families: asList(fams) })
    }
  }
  return out
}

/** Pour chaque acteur, applique linkRedLineFamilies(profile.redLines, mapping[actor.id]) ; renvoie de nouveaux acteurs. */
export function withRedLineFamilies(actors, mapping = {}, options = {}) {
  return (Array.isArray(actors) ? actors : []).map((a) => {
    if (!a || typeof a !== 'object' || !mapping?.[a.id]) return a
    const profile = a.profile || {}
    return { ...a, profile: { ...profile, redLines: linkRedLineFamilies(profile.redLines, mapping[a.id], options) } }
  })
}
