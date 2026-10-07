// Thème jour / nuit des applications NEXUS (Vue) : une fabrique remplace les copies de src/services/themeService.js,
// avec la même API publique (initTheme, setTheme, toggleTheme, useTheme). La classe 'light' ou 'dark' est posée sur
// <html> ; le choix est mémorisé dans localStorage. Import : 'vuejs.libs.nexus/theme'.
import { ref } from 'vue'

function storage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
    if (typeof localStorage !== 'undefined') return localStorage
  } catch (e) { /* accès refusé */ }
  return null
}

/**
 * Crée un service de thème.
 * @param {string} [storageKey] Clé localStorage (ex. 'cyber_nexus_theme') ; null : pas de persistance
 * @param {Object} [options]
 * @param {'dark'|'light'} [options.defaultTheme] Thème sans préférence enregistrée ('dark')
 * @param {Function} [options.root] Élément qui reçoit la classe (défaut document.documentElement)
 * @returns {{ theme, currentTheme, initTheme, setTheme, toggleTheme, useTheme }}
 */
export function createThemeService(storageKey = 'nexus_theme', { defaultTheme = 'dark', root = null } = {}) {
  const currentTheme = ref(defaultTheme === 'light' ? 'light' : 'dark')
  const rootEl = () => {
    if (typeof root === 'function') { try { return root() } catch (e) { return null } }
    return typeof document !== 'undefined' ? document.documentElement : null
  }

  function setTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark'
    currentTheme.value = next
    if (storageKey) { try { storage()?.setItem(storageKey, next) } catch (e) { /* quota, accès refusé */ } }
    const el = rootEl()
    if (el && el.classList) {
      el.classList.remove(next === 'light' ? 'dark' : 'light')
      el.classList.add(next)
    }
    return next
  }

  function initTheme() {
    let saved = null
    if (storageKey) { try { saved = storage()?.getItem(storageKey) || null } catch (e) { saved = null } }
    return setTheme(saved === 'light' || saved === 'dark' ? saved : defaultTheme)
  }

  function toggleTheme() {
    return setTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
  }

  function useTheme() {
    return { theme: currentTheme, toggleTheme, setTheme }
  }

  return { theme: currentTheme, currentTheme, initTheme, setTheme, toggleTheme, useTheme }
}
