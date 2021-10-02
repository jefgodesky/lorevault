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
