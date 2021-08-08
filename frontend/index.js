import 'core-js/stable'
import 'regenerator-runtime/runtime'

import { ready, select } from './utils'

/**
 * Abstract dynamic import method.
 * @param selector {string} - The selector which, if present, would indicate
 *   that the module should be loaded.
 * @param component {string} - The name of the module to load if any elements
 *   with the given selector are present.
 * @returns {Promise<void>} - If any elements matching the given selector are
 *   present, this Promise resolves once the appropriate module has been loaded
 *   and initialized with an array of those elements. If no such elements are
 *   present, the Promise resolves immediately.
 */

const initComponent = async (selector, component) => {
  const elems = select(selector)
  if (elems && elems.length > 0) {
    const init = (await import(`./components/${component}`)).default
    init(elems)
  }
}

ready(async () => {
  await initComponent('.secret', 'toggle-reveal')
  await initComponent('.sortable-list', 'sortable')
  await initComponent('.secrets.sortable-list', 'add-secret')
})
