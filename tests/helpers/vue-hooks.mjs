// Crochets de chargement Node (module.register) : compile les .vue de la lib à la volée pour les tests SSR.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { parse, compileScript } from '@vue/compiler-sfc'

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.vue')) return nextLoad(url, context)
  const filename = fileURLToPath(url)
  const source = await readFile(filename, 'utf8')
  const { descriptor, errors } = parse(source, { filename })
  if (errors.length) throw errors[0]
  const id = createHash('sha1').update(filename).digest('hex').slice(0, 8)
  const script = compileScript(descriptor, { id, inlineTemplate: true })
  return { format: 'module', source: script.content, shortCircuit: true }
}
