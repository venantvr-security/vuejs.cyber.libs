// Acteurs fictifs pour les tests (aucune donnée des applications)
export const ACTORS = [
  {
    id: 'dg',
    name: 'Dr. Marie Bernard',
    role: 'Directrice générale',
    avatar: 'D',
    activePreset: 'demanding',
    presets: { demanding: { levelLabel: 'Exigeant', name: 'Pression budgétaire', promptStyle: 'Phrases courtes, chiffrées.' } },
    profile: {
      aliases: ['dg', 'marie', 'directrice'],
      stakes: ['budget de 2,8 M€'],
      expectations: [
        { label: 'Coût et délai chiffrés', terms: ['€', 'k€', 'jours', '72h'] },
        { label: 'Décision demandée', terms: ['valid', 'décision', 'signer'] }
      ],
      redLines: [{ label: 'Report sans date', terms: ['reporter sine die', 'report sine die'] }]
    }
  },
  {
    id: 'rssi',
    name: 'Julien Moreau',
    role: 'RSSI',
    avatar: 'R',
    activePreset: 'cooperative',
    profile: {
      aliases: ['rssi', 'julien'],
      expectations: [
        { label: 'Date de retest du correctif', terms: ['retest'] },
        { label: 'FARR signée', terms: ['farr'] }
      ],
      redLines: [{ label: 'Mise en production sans correctif', terms: ['sans correctif'], negatable: false }]
    }
  },
  {
    id: 'dpo',
    name: 'Me Paul Castelnau',
    role: 'DPO',
    avatar: 'P',
    profile: {
      aliases: ['dpo', { term: 'conformité', addressOnly: true }, { term: 'rgpd', addressOnly: true }],
      expectations: [{ label: 'Notification CNIL sous 72 h', terms: ['cnil'] }],
      redLines: [{ label: 'Ne pas notifier la CNIL', terms: ['ne pas notifier'], negatable: false }]
    }
  }
]

/** Générateur pseudo-aléatoire déterministe (suite fournie, puis bouclage). */
export function seq(...values) {
  let i = 0
  return () => values[i++ % values.length]
}
