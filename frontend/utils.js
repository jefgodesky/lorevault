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

/**
 * Create a Node.
 * @param tag {string=} - The name of the tag to use (e.g., `div`, `section`,
 *   `aside`, `p`, etc.) (Default: `div`).
 * @param classes {?string[]} - An array of strings to add to the node as
 *   classes.
 * @param attrs {?{}} - An object that provides attributes to add to the node,
 *   expressed as key/value pairs.
 * @param text {?string} - A string to add as the Node as a text node child.
 * @returns {Node} - A Node matching the paramaters given.
 */

const create = (tag = 'div', classes, attrs, text) => {
  const el = document.createElement(tag)
  if (classes) el.setAttribute('class', classes.join(' '))
  if (attrs) Object.keys(attrs).forEach(attr => { el.setAttribute(attr, attrs[attr]) })
  if (text) el.innerHTML = text
  return el
}

export {
  ready,
  select,
  create
}