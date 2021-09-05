import { saveBlocks, restoreBlocks } from '../utils.js'

class Template {
  constructor (arg) {
    if (typeof arg === 'string') return new Template(Template.parseInstance(arg))
    if (typeof arg !== 'object') return new Template({})
    for (const key of Object.keys(arg)) this[key] = arg[key]
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
    if (!str) return params
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

  /**
   * Parse a string invoking a template into an object representing the details
   * of the invocation.
   * @param {string} str - A string invoking a template.
   * @returns {{name, params: {ordered: string[], named: {}}}} - An object with
   *   the following parameters:
   *     `name`     The name of the template being invoked.
   *     `params`   The paramaters of the invocation. This is an object with
   *                the properties `ordered` and `named` (see this class's
   *                `parseParams` method for more details on this). Any content
   *                within the invocation is saved as the named `content`
   *                parameter.
   */

  static parseInstance (str) {
    const front = str.match(/^{{(?!\/)(.*?)((\s|\n|\r)*?\|((.|\n|\r)*?))?}}/im)
    if (!front || front.length < 6) return
    const name = front[1]
    const params = Template.parseParams(front[4])
    const contentRegex = new RegExp(`{{${name}.*?}}((.|\n|\r)*?){{\\/${name}}}`)
    const content = str.match(contentRegex)
    if (!content || content.length < 1) return { name, params }
    params.named.content = content[1]
    return { name, params }
  }
}

export default Template
