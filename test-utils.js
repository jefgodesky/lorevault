/**
 * Find a string not yet in use by the given object as a property name.
 * @param {object} obj - The object we're examining.
 * @returns {string} - A string that the object is not yet using as the name of
 *   one of its properties.
 */

const codenamer = obj => {
  let num = 1
  while (true) {
    let key = `Secret${num.toString().padStart(4, '0')}`
    if (!obj.hasOwnProperty(key)) return key
    num++
  }
}

export {
  codenamer
}
