import Parser from 'morph-expressions'
import { match, loadGames } from '../utils.js'

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
   * Reveal a secret to the character associated with a page.
   * @param {Page} page - The page for the character that the secret is to be
   *   revealed to.
   * @param {{}} models - An object that passes the necessary Mongoose models.
   * @param {Model} models.Character - The Character model.
   * @returns {Promise<void>} - A Promise that resolves when the secret has
   *   been revealed to the character associated with the given page. If the
   *   given page does not have any character associated with it, then the
   *   promise resolves without doing anything.
   */

  async revealToPage (page, models) {
    const { Character } = models
    if (Character.collection.modelName !== 'Character') return
    const char = await Character.getCharacter(page)
    if (char) this.reveal(char)
  }

  /**
   * Reveal the secret to each character with a page in a given category. This
   * is applied recursively, so that character in any category descended from
   * this one also learns the secret.
   * @param {string} name - The name of the category that the secret should be
   *   revealed to.
   * @param {{}} models - An object that passes the necessary Mongoose models.
   * @param {Model} models.Character - The Character model.
   * @param {Model} models.Page - The Page model.
   * @returns {Promise<void>} - A Promise that resolves once the secret has
   *   been revealed to all characters in the category or any of its
   *   subcategories.
   */

  async revealToCategory (name, models) {
    const { Page } = models
    const { subcategories, pages } = await Page.findMembers(name, 'Loremaster')
    for (const categorization of subcategories) {
      const { title } = categorization.page
      const name = title.startsWith('Category:') ? title.substring(9) : title
      await this.revealToCategory(name, models)
    }
    for (const categorization of pages) await this.revealToPage(categorization.page, models)
  }

  /**
   * Reveal a secret to the characters indicated by the string `names`. This
   * is a comma- or semicolon-separated list of names. Each could be just one
   * character, if `name` is the name of a single character. It could be
   * several characters who share the same name. It could be a whole group, if
   * `name` is the name of a category.
   * @param {string} names - A comma- or semicolon-separated list of names
   *   indicating who you'd like to reveal the secret to.
   * @param {{}} models - An object that passes the necessary Mongoose models.
   * @param {Model} models.Character - The Character model.
   * @param {Model} models.Page - The Page model.
   * @returns {Promise<void>} - A Promise that resolves when the secret has been
   *   revealed to the characters indicated by the `names` argument.
   */

  async revealToNames (names, models) {
    const { Page } = models
    const n = names.split(/[,;]/).map(n => n.trim())
    for (const name of n) {
      await this.revealToCategory(name, models)
      const pages = await Page.findByTitle(name, 'Loremaster')
      for (const page of pages) await this.revealToPage(page, models)
    }
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
   * Evaluate a condition based on a character's tags.
   * @param {string} condition - The condition being evaluated.
   * @param {{}} context - The context in which the condition should
   *   be evaluated.
   * @param {Character} context.character - The character that we're evaluating
   *   the secret for.
   * @returns {boolean} - `true` if the condition given is a tag that the
   *   character in this context has, or `false` if it is not.
   */

  evaluateTag (condition, context) {
    return context?.character?.tags?.includes(condition) || false
  }

  /**
   * Evaluates a condition based on whether a character already knows another
   * secret on the page.
   * @param {string} condition - The condition being evaluated.
   * @param {{}} context - The context in which the condition should
   *   be evaluated.
   * @param {Character} context.character - The character that we're evaluating
   *   the secret for.
   * @param {Page} context.page - The page that the secret appears on.
   * @returns {boolean} - `true` if the page has a secret with this codename
   *   and the character in this context knows it, or `false` if otherwise.
   */

  evaluateOtherSecret (condition, context) {
    const { page, character } = context
    if (!page || !character) return false
    if (page.secrets.filter(s => s.codename === condition).length <= 0) return false
    return page.knows(character, condition)
  }

  /**
   * Evaluates a condition based on whether or not the character knows about
   * the page provided.
   * @param {string} condition - The condition being evaluated.
   * @param {{}} context - The context in which the condition should
   *   be evaluated.
   * @param {Character} context.character - The character that we're evaluating
   *   the secret for.
   * @param {{}} models - An object that passes the necessary Mongoose models.
   * @param {Model} models.Page - The Page model.
   * @returns {Promise<boolean>} - A Promise that resolves with `true` if the
   *   condition provides the path of a page that exists and which the
   *   character in this context knows about, or `false` if the condition does
   *   not provide the path of any page, or if that page is a secret to the
   *   character.
   */

  async evaluateOtherPage (condition, context, models) {
    const { Page } = models
    const page = await Page.findOne({ path: condition.substr(1) })
    if (!page) return false
    return page && page.knows(context.character)
  }

  /**
   * Evaluate a condition using the rules of each game specified in the
   * configuration.
   * @param {string} condition - The condition being evaluated.
   * @param {{}} context - The context in which the condition should
   *   be evaluated.
   * @param {Character} context.character - The character that we're evaluating
   *   the secret for.
   * @param {Page} context.page - The page that the secret appears on.
   * @returns {Promise<boolean>} - `true` if one or more of the games specified
   *   in the configuration returns `true`, or `false` if they all return
   *   `false`.
   */

  async evaluateGames (condition, context) {
    const games = await loadGames()
    const checks = Object.keys(games).map(game => games[game].evaluate(condition, context))
    return checks.reduce((acc, curr) => acc || curr, false)
  }

  /**
   * Evaluate a secret's conditions.
   * @param {{}} context - The context in which the condition should
   *   be evaluated.
   * @param {Character} context.character - The character that we're evaluating
   *   the secret for.
   * @param {Page} context.page - The page that the secret appears on.
   * @param {{}} models - An object that passes the necessary Mongoose models.
   * @param {Model} models.Page - The Page model.
   * @returns {Promise<boolean>} - A Promise that resolves with an evaluation
   *   of the secret's conditions in the given context.
   */

  async evaluate (context, models) {
    let expr = this.conditions
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
    const values = {}
    const conditions = expr.match(/\[(.*?)\]/gm)
    for (let i = 0; i < conditions.length; i++) {
      const variable = alphabet[i]
      const condition = conditions[i].substr(1, conditions[i].length - 2)
      const evaluations = [
        this.evaluateTag(condition, context),
        this.evaluateOtherSecret(condition, context),
        await this.evaluateGames(condition, context)
      ]
      if (condition.startsWith('/')) evaluations.push(await this.evaluateOtherPage(condition, context, models))
      values[variable] = evaluations.reduce((acc, curr) => acc || curr, false)
      expr = expr.replace(conditions[i], variable)
    }
    const parser = new Parser.default()
    return parser.parseAndEval(expr, values)
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
   * @param {boolean} [rewrite = false] - If `true`, the method parses the
   *   secrets and returns the string rewritten with all secrets re-rendered.
   *   This is useful for assigning codenames to secrets that do not yet have
   *   them, for example. If `false`, the method returns the array of secrets,
   *   as usual. (Default: `false`)
   * @returns {Secret[]|string} - An array of secrets parsed from the given
   *   string, or that string with all secrets re-rendered, if `rewrite` is
   *   `true`.
   */

  static parse (str, codenamer, rewrite = false) {
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
      const secret = new Secret(Object.assign({}, attrs, { content: elems[2] }), codenamer)
      secrets.push(secret)
      if (rewrite) str = str.replace(tag, secret.render())
    }
    return rewrite ? str : secrets
  }

  /**
   * Render the secrets in a string.
   * @param {string} str - The string to render.
   * @param {Secret[]} secrets - An array of the secrets in the string.
   * @param {{}} [params = {}] - An object providing parameters for how the
   *   string should be rendered.
   * @param {Character|string} [params.pov = 'Anonymous'] - The point of view
   *   from which the string should be rendered. If this is the string
   *   `Loremaster,` then all secrets are shown. If this is the string
   *   `Anonymous` (which it is by default), then no secrets are shown. If
   *   given a Character, only those secrets which are known to that character
   *   are shown.
   * @param {string} [params.mode = 'reading'] - The mode in which we are
   *   rendering the string. In `editing` mode, codenames are used to create
   *   placeholders for where secrets appear in the text for points of view
   *   that are not privy to those secrets. In `reading` mode, no indication is
   *   made of any secrets that the point of view is not privy to. Acceptable
   *   strings for this parameter are `editing` or `reading`.
   *   (Default: `reading`)
   * @return {string} - The rendered string.
   */

  static render (str, secrets, params = {}) {
    const { pov = 'Anonymous', mode = 'reading' } = params
    for (const secret of secrets) {
      const { codename } = secret
      const knows = secret.knows(pov)
      const match = str.match(new RegExp(`<secret.*? codename="${codename}".*?>[\\s\\S]*?<\\/secret>`))
      let replacement = ''
      if (mode === 'editing') {
        replacement = knows ? secret.render('full') : secret.render('placeholder')
      } else {
        replacement = knows ? secret.render('reading') : ''
      }
      if (match && match.length > 0) str = str.replace(match[0], replacement)
    }

    return str
  }
}

export default Secret
