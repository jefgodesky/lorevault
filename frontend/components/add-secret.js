import { create } from '../utils'

/**
 * Add a new secret form to the list.
 * @param {Node} list - The list element.
 * @param {Node} btn - The wrapper for the button to add new secrets. New
 *   secrets should be added above this wrapper.
 */

const addSecret = (list, btn) => {
  const entries = list.querySelectorAll('.secret-form.list-group-item')
  if (!entries || entries.length < 0) return
  const cpy = entries[0].cloneNode(true)

  const hidden = cpy.querySelectorAll('input[type="hidden"]')
  for (const field of hidden) field.parentNode.removeChild(field)

  const num = cpy.querySelector('input[name="secret-order"]')
  if (num) num.value = entries.length + 1

  const body = cpy.querySelector('textarea[name="secret"]')
  body.value = ''

  list.insertBefore(cpy, btn)
}

/**
 * Initialize secrets lists, allowing users to add more secrets.
 * @param {Node[]} lists - An array of list elements to initialize.
 */

const initAddSecret = lists => {
  for (const list of lists) {
    const wrapper = create('p', ['actions', 'add-secret'])
    const btn = create('button', [], {}, 'Add Secret')
    wrapper.appendChild(btn)
    list.appendChild(wrapper)
    btn.addEventListener('click', event => {
      event.preventDefault()
      addSecret(list, wrapper)
    })
  }
}

export default initAddSecret