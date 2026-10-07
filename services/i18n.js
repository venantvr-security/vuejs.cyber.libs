// Internationalisation minimale des applications NEXUS (Vue) : une fabrique remplace les copies quasi identiques
// de src/services/i18n.js des trois applications, avec la même API publique (useI18n, currentLocale, t, setLocale,
// toggleLocale). Le module importe 'vue' : l'importer par 'vuejs.libs.nexus/i18n', jamais depuis le point d'entrée pur.
import { ref, computed } from 'vue'

function storage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
    if (typeof localStorage !== 'undefined') return localStorage
  } catch (e) { /* accès refusé (navigation privée, iframe) */ }
  return null
}

const isDev = () => {
  try { return !!(import.meta && import.meta.env && import.meta.env.DEV) } catch (e) { return false }
}

/**
 * Crée un service de traduction.
 * @param {Object} options
 * @param {Object<string, Object<string, string>>} options.dictionaries { fr: {...}, en: {...} }
 * @param {string|null} [options.storageKey] Clé localStorage de la langue choisie (null : pas de persistance)
 * @param {string} [options.defaultLocale] Langue initiale sans préférence enregistrée ('fr')
 * @param {string} [options.fallbackLocale] Dictionnaire utilisé si la langue courante n'en a pas ('fr')
 * @param {boolean} [options.fallbackPerKey] Cherche aussi une clé absente dans fallbackLocale (false : comportement historique)
 * @param {'key'|'empty'|Function} [options.missing] Clé introuvable sans valeur par défaut : la clé ('key'), '' ('empty'),
 *   ou missing(uid, locale)
 * @param {boolean} [options.warnMissing] Avertit en console (par défaut : en développement Vite seulement si missing vaut 'empty')
 * @returns {{ t, currentLocale, setLocale, toggleLocale, useI18n, locales, addMessages }}
 */
export function createI18n({ dictionaries = {}, storageKey = null, defaultLocale = 'fr', fallbackLocale = 'fr', fallbackPerKey = false, missing = 'key', warnMissing } = {}) {
  const dicts = { ...(dictionaries && typeof dictionaries === 'object' ? dictionaries : {}) }
  const locales = () => Object.keys(dicts)
  const read = () => {
    if (!storageKey) return null
    try { return storage()?.getItem(storageKey) || null } catch (e) { return null }
  }
  const write = (value) => {
    if (!storageKey) return
    try { storage()?.setItem(storageKey, value) } catch (e) { /* quota, accès refusé */ }
  }
  const saved = read()
  const currentLocale = ref(saved && dicts[saved] ? saved : defaultLocale)
  const warn = typeof warnMissing === 'boolean' ? warnMissing : missing === 'empty' && isDev()

  function t(uid, fallback = '') {
    if (!uid) return ''
    const dict = dicts[currentLocale.value] || dicts[fallbackLocale]
    if (dict && dict[uid] !== undefined) return dict[uid]
    if (fallbackPerKey && dicts[fallbackLocale] && dicts[fallbackLocale][uid] !== undefined) return dicts[fallbackLocale][uid]
    if (fallback) return fallback
    if (warn) console.warn(`[i18n] Missing translation for UID "${uid}"`)
    if (typeof missing === 'function') return missing(uid, currentLocale.value)
    return missing === 'empty' ? '' : uid
  }

  function setLocale(newLocale) {
    if (!dicts[newLocale]) return false
    currentLocale.value = newLocale
    write(newLocale)
    return true
  }

  // Bascule fr ↔ en (ou langue suivante parmi les dictionnaires disponibles)
  function toggleLocale() {
    const list = locales()
    const preferred = currentLocale.value === 'fr' ? 'en' : 'fr'
    const next = dicts[preferred] ? preferred : list[(list.indexOf(currentLocale.value) + 1) % Math.max(list.length, 1)]
    if (next) setLocale(next)
    return currentLocale.value
  }

  function addMessages(locale, messages) {
    if (!locale || !messages || typeof messages !== 'object') return
    dicts[locale] = { ...(dicts[locale] || {}), ...messages }
  }

  function useI18n() {
    return {
      t,
      currentLocale: computed(() => currentLocale.value),
      setLocale,
      toggleLocale,
      locales: locales()
    }
  }

  return { t, currentLocale, setLocale, toggleLocale, useI18n, addMessages, get locales() { return locales() } }
}
