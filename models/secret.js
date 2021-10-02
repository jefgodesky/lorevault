class Secret {
  constructor (obj = {}, codenamer) {
    const { codename = codenamer(), content = '', conditions = '', knowers = [], checked = [] } = obj
    this.codename = codename
    this.content = content
    this.conditions = conditions
    this.knowers = knowers
    this.checked = checked
  }

  /**
   * Checks if a character knows this secret.
   * @param {User|Character|Schema.Types.ObjectId|string} char - The character
   *   that we're checking. If given a user, we find that user's active
   *   character. If given a string or an ObjectId, we look for that directly
   *   as the character's ID.
   * @returns {boolean} - `true` if the character given knows the secret, or
   *   `false` if hen does not.
   */

  knows (char) {
    return this.knowers.includes(Secret.getCharID(char))
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
