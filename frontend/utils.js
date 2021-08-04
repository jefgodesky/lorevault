/**
 * Run a function when the DOM is ready.
 * @param fn {function} - The function that will be run when the DOM is ready.
 */

const ready = fn => {
  if (document.readyState !== 'loading') {
    fn()
  } else {
    document.addEventListener('DOMContentLoaded', fn)
  }
}

/**
 * Returns an array of those elements that match the given selector.
 * @param selector {string} - The selector to find.
 * @param all {boolean=} - Optional. If `true`, returns all of the elements
 *   that match the given selector. If not, only returns the first one
 *   (Default: `true`).
 * @returns {Element[]} - An array of matching elements.
 */

const select = (selector, all = true) => {
  if (all) {
    return Array.from(document.querySelectorAll(selector))
  } else {
    return [document.querySelector(selector)].filter(e => e !== null)
  }
}

export {
  ready,
  select
}