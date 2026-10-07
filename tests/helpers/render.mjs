// Rendu SSR d'un composant de la lib sous Node (sans navigateur) : renderComponent('CyberChatBubble', props, slots).
import { register } from 'node:module'

register('./vue-hooks.mjs', import.meta.url)

const { createSSRApp, h } = await import('vue')
const { renderToString } = await import('vue/server-renderer')

export async function renderComponent(name, props = {}, slots = undefined) {
  const { default: Component } = await import(`../../components/${name}.vue`)
  return renderToString(createSSRApp({ render: () => h(Component, props, slots) }))
}
