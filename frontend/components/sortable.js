import Sortable from 'sortablejs'
import { create, addClass } from '../utils'

/**
 * Resort the values of the secret order fields to reflect their current
 * positions.
 * @param {Node} list - The list element to be re-sorted.
 */

const resort = list => {
  const numbers = list.querySelectorAll('input[name="secret-order"]')
  for (let i = 0; i < numbers.length; i++) numbers[i].value = i+1
}

/**
 * Initialize sortable lists.
 * @param {Node[]} lists - An array of elements that should be sortable.
 */

const initSortable = lists => {
  for (const list of lists) {
    addClass(list, 'initialized')

    const items = list.querySelectorAll('.list-group-item')
    for (const item of items) {
      const handle = create('div', ['handle'])
      handle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 25 25">\n  <rect width="25" height="5" x="0" y="0" />\n  <rect width="25" height="5" x="0" y="10" />\n  <rect width="25" height="5" x="0" y="20" />\n</svg>'
      item.insertBefore(handle, item.firstChild)
    }

    new Sortable(list, {
      animation: 150,
      ghostClass: 'in-sorting',
      onSort: () => resort(list)
    })
  }
}

export default initSortable
