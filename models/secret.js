import { match } from '../utils.js'

class Secret {
  constructor (obj = {}, codenamer) {
    const { codename = codenamer(), content = '', conditions = '', knowers = [] } = obj
    this.codename = codename
    this.content = content
    this.conditions = conditions
    this.knowers = knowers
  }

  /**
   * Reveal this secret to the character given (i.e., add the character's ID to
   * the `knowers` array).
   * @param {User|Character|ObjectId|string} char - The character that we're
   *   revealing the secret to.
   */

  reveal (char) {
    const id = Secret.getCharID(char)
    this.knowers = [...new Set([...this.knowers, id])]
  }

  /**
   * Checks if a character knows this secret.
   * @param {User|Character|ObjectId|string} char - The character that we're
   *   checking.
   * @returns {boolean} - `true` if the character given knows the secret, or
   *   `false` if hen does not.
   */

  knows (char) {
    if (typeof char === 'string' && char.toLowerCase() === 'anonymous') return false
    if (typeof char === 'string' && char.toLowerCase() === 'loremaster') return true
    return this.knowers.includes(Secret.getCharID(char))
  }

  /**
   * Return a string representation of the secret.
   * @param {string} [mode = 'full'] - What kind of string do we want to
   *   represent the secret? In `full` mode, the secret is rendered in the full
   *   `<secret>` tag, with its codename and conditions. In `placeholder` mode,
   *   it's just a `<secret>` tag with a codename, and no content. In `reading`
   *   mode, the content of the secret is rendered without a `<secret>` tag.
   *   (Default: `full`)
   * @returns {string} - The rendered secret.
   */

  render (mode = 'full') {
    const { codename, content, conditions } = this
    const full = mode.toLowerCase() === 'full'
    const placeholder = mode.toLowerCase() === 'placeholder'
    const reading = mode.toLowerCase() === 'reading'

    if (full && conditions?.length > 0) return `<secret codename="${codename}" conditions="${conditions}">${content}</secret>`
    if (full) return `<secret codename="${codename}">${content}</secret>`
    if (placeholder) return `<secret codename="${codename}"></secret>`
    if (reading) return content
  }

  /**
   * This method normalizes unexpected input to the string representation of a
   * character's ID. If given a Character, it returns the string representation
   * of the character's ID. If given a User, it finds that user's active
   * character and returns the string representation of that character's ID. If
   * given a string, it returns that string, and if given an ObjectId, it
   * returns the string representation of that ObjectId. If given something
   * else altogether, it converts that into a string and returns that.
   * @param {User|Character|ObjectId|string} param - The input to figure out.
   * @returns {string} - The input normalized as best it can be into the string
   *   representation of a character's ID.
   */

  static getCharID (param) {
    const isStr = typeof param === 'string'
    const isID = param.constructor.name === 'ObjectId'
    const id = isStr || isID ? param : param.characters?.active?._id || param._id || param
    return id.toString()
  }

  /**
   * Checks to see if the subject (`subj`) appears within any of the secrets in
   * the string provided (`str`).
   * @param {object} subj - An object that provides data on the string we're
   *   looking for. An object like this is provided by the `match` utility.
   * @param {number} subj.index - The index in the `str` string at which this
   *   substring begins.
   * @param {string} subj.str - The substring of `str` that this object provides
   *   data about.
   * @param {string} str - The full string.
   * @returns {string|boolean} - The codename of the secret that `subj` appears
   *   in, or `true` if it appears in a secret that doesn't have a codename, or
   *   `false` if it doesn't appear in any secret at all.
   */

  static isInSecret (subj, str) {
    const start = subj.index
    const end = start + subj.str.length
    const secrets = match(str, /<secret(.*?)>(.*?)<\/secret>/mi)
    for (const secret of secrets) {
      const secretStart = secret.index
      const secretEnd = secret.index + secret.str.length
      if (secretStart <= start && secretEnd >= end) {
        const codenameMatch = secret.str.match(/ codename="(.*?)"[ >]/)
        return codenameMatch && codenameMatch.length > 1 ? codenameMatch[1] : true
      }
    }
    return false
  }

  /**
   * Parse <secret> tags from a string.
   * @param {string} str - The string to be parsed.
   * @param {function} codenamer - A function that produces codenames for those
   *   secrets that haven't set one.
   * @returns {Secret[]} - An array of secrets parsed from the given string.
   */

  static parse (str, codenamer) {
    const tags = str.match(/<secret(.*?)>(.*?)<\/secret>/gmi)
    if (!tags) return []
    const secrets = []
    for (const tag of tags) {
      const elems = tag.match(/<secret(.*?)>(.*?)<\/secret>/i)
      if (!elems || elems.length < 3) continue
      const attrMatch = elems[1] !== '' ? elems[1].match(/([A-Za-z]*?)=["“](.*?)["”]/gmi) : []
      const attrs = {}
      for (const attr of attrMatch) {
        const pair = attr.split('=')
        if (!pair || pair.length < 2) continue
        attrs[pair[0]] = pair[1].substring(1, pair[1].length - 1)
      }
      secrets.push(new Secret(Object.assign({}, attrs, { content: elems[2] }), codenamer))
    }
    return secrets
  }
}

export default Secret
