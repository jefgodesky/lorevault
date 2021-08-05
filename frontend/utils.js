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

/**
 * Tests if an element has a partciular class.
 * @param el {Element} - The element to test.
 * @param classes {string} - The class to test for.
 * @returns {boolean} - `true` if `el` has the class `className`, or `false`
 *   if it does not.
 */

const hasClass = (el, ...classes) => {
  const has = el.classList ? Array.from(el.classList) : el.className.split(' ')
  const intersection = has.filter(x => classes.includes(x))
  return intersection.length > 0
}

/**
 * Add one or more classes to an element.
 * @param el {Element} - The element to add the classes to.
 * @param classes {string} - The classes to add to the element.
 */

const addClass = (el, ...classes) => {
  classes.forEach(className => {
    if (el.classList) {
      el.classList.add(className)
    } else {
      const curr = el.className.split(' ')
      if (!curr.includes(className)) {
        el.className += ` ${className}`
      }
    }
  })
}

/**
 * Removes one or more classes from an element.
 * @param el {Element} - The element to remove the classes from.
 * @param classes {string} - The classes to remove from the element.
 */

const removeClass = (el, ...classes) => {
  classes.forEach(className => {
    if (el.classList) {
      el.classList.remove(className)
    } else {
      const curr = el.className.split(' ')
      el.className = curr.filter(cls => cls !== className).join(' ')
    }
  })
}

/**
 * Toggle one or more classes from an element. For each class, if the element
 * has that class, this method removes it, and if it doesn't have the class, it
 * adds it.
 * @param el {Element} - The element to toggle the classes on.
 * @param classes {string} - The classes to toggle on the element.
 */

const toggleClass = (el, ...classes) => {
  classes.forEach(className => {
    if (hasClass(el, className)) {
      removeClass(el, className)
    } else {
      addClass(el, className)
    }
  })
}

export {
  ready,
  select,
  create,
  hasClass,
  addClass,
  removeClass,
  toggleClass
}