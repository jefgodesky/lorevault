import renderTags from '../transformers/renderTags.js'
import { saveBlocks, restoreBlocks, indexOfRegExp } from '../utils.js'

import mongoose from 'mongoose'
const { model } = mongoose

class Template {
  constructor (arg) {
    if (typeof arg === 'string') return new Template(Template.parseInstance(arg))
    if (typeof arg !== 'object') return new Template({})
    for (const key of Object.keys(arg)) this[key] = arg[key]
  }

  /**
   * Load the template from the database, perform a function on it (`fn`), then
   * find any other templates that the template invokes and perform the same
   * function on them, recursively.
   * @param {User|string} user - The user who initiated this action, or the
   *   string `Loremaster` for a loremaster, or the string `Anonymous` for an
   *   anonymous user.
   * @param {function} fn - The function that is recursively called on this
   *   template and any others that this template invokes. The syntax for this
   *   function is `fn(tpl, page, body)`, with arguments:
   *     `tpl`    The Template instance.
   *     `page`   The template's Page document.
   *     `body`   The body of the template, with any <noinclude> tags and their
   *              contents stripped out, and any <includeonly> tags unwrapped.
   * @returns {Promise<void>} - A Promise that resolves once the recursion has
   *   finished, and the function `fn` has been run on this template and any
   *   templates that it invokes.
   */

  async recurse (user, fn) {
    const Page = model('Page')
    const tpl = await Page.findOneByTitle(`Template:${this.name}`, user)
    if (!tpl) return

    let { body } = tpl.getCurr()
    body = renderTags(body, '<includeonly>', true)
    body = renderTags(body, '<noinclude>')

    fn(this, tpl, body)
    const templates = Template.parse(body)
    for (const template of templates) {
      await template.recurse(user, fn)
    }
  }

  /**
   * Returns an array listing this template and any templates that it invokes,
   * recursively.
   * @param {User|string} lister - The user who asked for this list, or the
   *   string `Loremaster` for a loremaster, or the string `Anonymous` for an
   *   anonymous user.
   * @returns {Promise<{ page: Schema.Types.ObjectId, name: string}[]>} - An
   *   array of objects documenting the template and any other templates that
   *   this template calls, recursively. Each object has the following
   *   properties:
   *     `page`   The ID of the template's Page document.
   *     `name`   The name of the template.
   *     `path`   The path for the template's Page document.
   */

  async list (lister) {
    const templates = []
    await this.recurse(lister, (tpl, page) => {
      templates.push({ page: page._id, name: tpl.name, path: page.path })
    })
    return templates
  }

  /**
   * Render the template.
   * @param {User|string} renderer - The user that we're rendering the template
   *   for, or the string `Loremaster` for a loremaster, or the string
   *   `Anonymous` for an anonymous user.
   * @returns {Promise<string>} - The string rendering of the template.
   */

  async render (renderer) {
    let str = this.str
    await this.recurse(renderer, (tpl, page, body) => {
      for (let i = 0; i < tpl.params.ordered.length; i++) {
        body = body.replace(`{{{${i+1}}}}`, tpl.params.ordered[i])
      }
      for (const key of Object.keys(tpl.params.named)) {
        body = body.replace(`{{{${key}}}}`, tpl.params.named[key])
      }
      str = str.replace(tpl.str, body)
    })
    return str
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
   *     `str`      The original string invocation.
   */

  static parseInstance (str) {
    const front = str.match(/^{{(?!\/)(.*?)((\s|\n|\r)*?\|((.|\n|\r)*?))?}}/im)
    if (!front || front.length < 6) return
    const name = front[1]
    const params = Template.parseParams(front[4])
    const contentRegex = new RegExp(`{{${name}.*?}}((.|\n|\r)*?){{\\/${name}}}`)
    const content = str.match(contentRegex)
    if (!content || content.length < 1) return { name, params, str }
    params.named.content = content[1]
    return { name, params, str }
  }

  /**
   * Parse an array of Template instances from invocations in a string.
   * @param {string} str - The string to parse.
   * @returns {Template[]} - An array of Template instances parsed from the
   *   given string `str`.
   */

  static parse (str) {
    const regex = /{{(?!\/)(.*?)((\s|\n|\r)*?\|((.|\n|\r)*?))?}}/im
    const instances = []
    let reader = 0
    while (reader > -1) {
      reader = indexOfRegExp(str, regex, reader)
      if (reader < 0) continue
      const match = str.substring(reader).match(regex)
      if (!match || match.length < 1) { reader += 2; continue }
      const name = match[1].trim()
      const afterMatch = reader + match[0].length
      const closerRegex = new RegExp(`{{\\/${name}}}`)
      const closer = indexOfRegExp(str, closerRegex, afterMatch)
      const next = indexOfRegExp(str, regex, afterMatch)
      if (closer > 0 && (next < 0 || closer < next)) {
        instances.push(str.substring(reader, closer + name.length + 5))
        reader = closer + name.length + 5
      }  else {
        instances.push(str.substring(reader, afterMatch))
        reader = afterMatch
      }
    }
    return instances.map(instance => new Template(instance))
  }
}

export default Template
