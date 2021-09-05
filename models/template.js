import { saveBlocks, restoreBlocks } from '../utils.js'

class Template {
  constructor (arg) {
    this.name = arg.name
  }

  /**
   * Parse a string representing a template's parameters into an object.
   * @param {string} str - A string representing the template's parameters.
   * @return {{ordered: string[], named: {}}} - An object representing the
   *   template's parameters, with the following properties:
   *     `ordered`   The template's ordered parameters. This is an array of
   *                 strings. Each parameter is identified by its index within
   *                 the array.
   *     `named`     The template's named parameters. This is an object that
   *                 provides a dictionary of key/value pairs for each of the
   *                 template's named parameters.
   */

  static parseParams (str) {
    const params = { ordered: [], named: {} }
    const brackets = saveBlocks(str, /\[\[(.*?)\]\]/im, 'BRACKET')
    const elems = brackets.str.split('|').map(el => el.trim())
    for (const elem of elems) {
      const pair = elem.split('=').map(el => el.trim())
      const val = restoreBlocks(pair[pair.length - 1], brackets.blocks)
      const int = parseInt(pair[0])
      if (pair.length < 2) {
        params.ordered.push(val)
      } else if (isNaN(int)) {
        params.named[pair[0]] = val
      } else {
        params.ordered[int - 1] = val
      }
    }
    return params
  }
}

export default Template
