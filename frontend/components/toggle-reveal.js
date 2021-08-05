import { create, toggleClass } from '../utils'

/**
 * Initialize reveal form toggles.
 * @param {Node[]} reveals - An array of elements that should have reveal
 *   toggles set up for them.
 */

const initToggleReveals = reveals => {
  for (const reveal of reveals) {
    const toggle = create('button', [], {}, 'Reveal')
    reveal.insertBefore(toggle, reveal.firstChild)
    toggle.addEventListener('click',() => {
      toggleClass(reveal, 'open')
    })
  }
}

export default initToggleReveals
