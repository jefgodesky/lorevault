import smartquotes from 'smartquotes'

import assignCodenames from '../transformers/assignCodenames.js'
import renderLinks from '../transformers/renderLinks.js'
import renderFiles from '../transformers/renderFiles.js'
import renderMarkup from '../transformers/renderMarkup.js'
import renderTags from '../transformers/renderTags.js'
import Template from './template.js'
import {
  pickRandom,
  union,
  findOne,
  match,
  isInSecret,
  makeDiscreetQuery,
  alphabetize,
  saveBlocks,
  restoreBlocks,
  getReadableFileSize,
  getS3
} from '../utils.js'

import config from '../config/index.js'

import axios from 'axios'
import mongoose from 'mongoose'
import slugger from 'mongoose-slug-generator'
import dayjs from 'dayjs'
const { Schema, model } = mongoose

const ContentSchema = {
  title: String,
  body: String
}

const VersionSchema = new Schema(Object.assign({}, ContentSchema, {
  msg: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  editor: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}))

const SecretSchema = new Schema({
  codename: String,
  content: String,
  knowers: [{
    type: Schema.Types.ObjectId,
    ref: 'Character'
  }],
  checked: [{
    type: Schema.Types.ObjectId,
    ref: 'Character'
  }]
})

const PageSchema = new Schema({
  title: String,
  path: {
    type: String,
    slug: 'title',
    unique: true
  },
  categories: [{
    name: String,
    sort: String,
    secret: Boolean,
    codename: String
  }],
  links: [{
    page: {
      type: Schema.Types.ObjectId,
      ref: 'Page'
    },
    secret: Boolean,
    codename: String
  }],
  templates: [{
    type: Schema.Types.ObjectId,
    ref: 'Page'
  }],
  created: {
    type: Date,
    default: Date.now
  },
  modified: {
    type: Date,
    default: Date.now
  },
  secrets: {
    existence: {
      type: Boolean,
      default: false
    },
    knowers: [{
      type: Schema.Types.ObjectId,
      ref: 'Character'
    }],
    list: [SecretSchema]
  },
  file: {
    url: String,
    mimetype: String,
    size: Number
  },
  versions: [VersionSchema]
}, {
  collation: {
    locale: 'en',
    strength: 1,
    numericOrdering: true
  }
})

PageSchema.plugin(slugger)

/**
 * Update the modified date each time the page is saved.
 */

PageSchema.pre('save', function (next) {
  this.modified = Date.now()
  next()
})

/**
 * Pull categories from text each time the page is saved.
 */

PageSchema.pre('save', async function (next) {
  let { body } = this.getCurr()
  const pre = saveBlocks(body, /(```|<pre><code>)(\r|\n|.)*?(```|<\/code><\/pre>)/, 'PREBLOCK')
  body = renderTags(pre.str, '<noinclude>', true)
  body = renderTags(body, '<includeonly>')
  body = await Template.render(body, 'Loremaster')

  const regex = /\[\[Category:(.*?)(\|(.*?))?]]/im
  this.categories = match(body, regex).map(category => {
    const regexMatch = category.str.match(regex)
    const name = regexMatch && regexMatch[1] ? regexMatch[1].trim() : null
    const sort = regexMatch && regexMatch[3] ? regexMatch[3].trim() : this.title
    const secret = isInSecret(category, body)
    if (!name) return false
    const obj = { name, secret: Boolean(secret) }
    if (sort) obj.sort = sort
    if (secret) obj.codename = secret
    return obj
  }).filter(cat => cat !== false)
  next()
})

/**
 * Pull links from text each time the page is saved.
 */

PageSchema.pre('save', async function (next) {
  const User = model('User')
  const curr = this.getCurr()
  const editor = await User.findById(curr.editor)
  const pov = editor.getPOV() || pov
  const { links } = await renderLinks(curr.body, this.getSecrets(pov), editor)
  this.links = links.map(link => ({
    page: link.page,
    secret: Boolean(link.secret),
    codename: link.secret || ''
  })).filter(link => link.page !== null)
  next()
})

/**
 * Catalog templates used on save.
 */

PageSchema.pre('save', async function (next) {
  const { body } = this.getCurr()
  const templates = Template.parse(body)
  const arr = []
  for (const template of templates) {
    await template.recurse('Loremaster', (tpl, page) => {
      arr.push(page._id)
    })
  }
  this.templates = arr
  next()
})

/**
 * Return the most recent version of the page.
 * @returns {Version} - The most recent version of the page.
 */

PageSchema.methods.getCurr = function () {
  return this.versions[this.versions.length - 1]
}

/**
 * Return the version of the page with the matching ID.
 * @param {Schema.Types.ObjectID|string} id - The ID of the version you want to
 *   find, or a string representation of it.
 * @returns {Version|null} - The version with the given ID if it exists, or
 *   `null` if it does not.
 */

PageSchema.methods.getVersion = function (id) {
  return findOne(this.versions, v => v._id === id || v._id.toString() === id)
}

/**
 * Return one or more versions of the page, sorted in chronological order.
 * @param {(Schema.Types.ObjectId|string)[]} ids - An array of ID's of the
 *   versions to be returned.
 * @returns {Version[]} - An array of versions with ID's identified by the
 *   `ids` array, sorted in chronological order.
 */

PageSchema.methods.getVersions = function (ids) {
  const clean = ids.filter(id => id !== null && id !== undefined)
  const versions = clean.map(id => this.getVersion(id)).filter(v => v !== null)
  return versions.sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Return the categories for the page that the user knows about.
 * @param {User} user - The user asking for the page's categories.
 * @returns {{title: string, path: string}[]} - An array of objects
 *   representing the  categories that the page belongs to, which the user is
 *   privy to. Each object has the following properties:
 *     `title`   The name of the category. This does not include the
 *               "Category:" prefix.
 *     `path`    The path to the category page. This is only included if the
 *               category has a page.
 */

PageSchema.methods.getCategories = async function (user) {
  const Page = model('Page')
  const titles = this.categories.filter(category => {
    if (!category.secret) return true
    const pov = user?.getPOV() || user
    if (pov === 'Loremaster' || this.knows(pov, category.codename)) return true
    return false
  }).map(category => category.name)
  const categories = []
  for (const title of titles) {
    const page = await Page.findOneByTitle(`Category:${title}`, user)
    const obj = page ? { title, path: page.path } : { title }
    categories.push(obj)
  }
  return categories
}

/**
 * Return the page's categorization object for the given category.
 * @param {string} name - The name of the category.
 * @param {User|string} searcher - The user asking for the categorization, or
 *   the string `Loremaster` for a loremaster, or the string `Anonymous` for an
 *   anonymous user.
 * @returns {{name: string, sort: string, secret: string}|false} - The page's
 *   categorization object for the category requested, or `false` if it cannot
 *   be returned (e.g., the page isn't in that category, or it is, but it's a
 *   secret that the searcher's POV doesn't know about).
 */

PageSchema.methods.getCategorization = function (name, searcher) {
  const cat = findOne(this.categories, c => c.name === name)
  if (!cat || (cat.secret && (searcher === 'Loremaster' || !this.knows(searcher?.getPOV(), cat.codename)))) return false
  return cat
}

/**
 * Return an array of the pages that link to this page (that you know about).
 * @param {User|string} searcher - The user conducting the search, or the
 *   string `Loremaster` for a loremaster, or the string `Anonymous` for an
 *   anonymous user.
 * @returns {Promise<Page[]>} - An array of pages that link to this page,
 *   excluding any pages that are secret to you, or where any links to this
 *   page are part of secrets that you don't know.
 */

PageSchema.methods.getLinks = async function (searcher) {
  const Page = model('Page')
  const pages = await Page.find(makeDiscreetQuery({ 'links.page': this._id }, searcher))
  if (!pages) return []
  return pages.filter(page => {
    const pov = searcher.getPOV()
    const links = page.links.filter(link => !link.secret || pov === 'Loremaster' || page.knows(pov, link.codename))
    return links.length > 0
  })
}

/**
 * Return an object with information about the page's file.
 * @returns {{url: string, mimetype: string, display: string,
 *   size: number}|null} - An object that describes the page's file. This
 *   object includes the following properties:
 *     `url`        The URL where the file can be found.
 *     `mimetype`   The file's MIME type.
 *     `display`    A string indicating how the file should be displayed
 *                  (e.g., as an image, an SVG, an audio file, a video, or as
 *                  a file for download).
 *     `size`       The size of the file in bytes.
 */

PageSchema.methods.getFile = function () {
  if (!this.file || !this.file.url) return null
  const display = config.fileDisplay[this.file.mimetype] || 'Download'
  return Object.assign({}, this.file, { display })
}

/**
 * Finds an acceptable new codename.
 * @returns {string} - A string that has not yet been used as a codename for
 *   any of the secrets for this page.
 */

PageSchema.methods.findCodename = function () {
  const used = this.secrets.list.map(s => s.codename)
  const unused = config.codenames.filter(c => !used.includes(c))
  if (unused.length > 0) return pickRandom(config.codenames.filter(c => !used.includes(c)))
  let num = 1
  while (true) {
    let key = `Secret${num.toString().padStart(4, '0')}`
    if (!used.includes(key)) return key
    num++
  }
}

/**
 * Find a secret with the given codename.
 * @param {string} codename - The codename of the secret that we want to find.
 * @returns {{ codename: string, content: string,
 *   knowers: [Schema.Types.ObjectId] }|null} - The secret with the given
 *   codename if the page has a secret with that codename, or `null` if it
 *   does not.
 */

PageSchema.methods.findSecret = function (codename) {
  const { existence, knowers } = this.secrets
  if (!codename && existence) return { knowers }
  return findOne(this.secrets.list, s => s.codename === codename)
}

/**
 * Process new secrets provided to the page in an update.
 * @param {{}} secrets - An object in which each property is named with a
 *   codename that will be used to identify the secret. Each property should be
 *   an object with a `content` property of its own, providing a string that is
 *   the content of the secret.
 * @param {User} editor - The person making this update.
 */

PageSchema.methods.processSecrets = function (secrets, editor) {
  const { list } = this.secrets
  const updatedCodenames = Object.keys(secrets)
  const codenames = union(list.map(s => s.codename), updatedCodenames)
  for (const codename of codenames) {
    const existing = this.findSecret(codename)
    const inUpdate = updatedCodenames.includes(codename)
    const editorKnows = existing && (existing.knowers.includes(editor._id) || existing.knowers.includes(editor.getPOV()._id) )
    if (existing && inUpdate && editorKnows) {
      existing.content = secrets[codename].content
    } else if (existing && !inUpdate && editorKnows) {
      list.pull({ _id: existing._id })
    } else if (!existing) {
      const pov = editor.getPOV()
      const knowers = pov === 'Loremaster' ? [editor._id] : pov._id ? [pov._id] : []
      list.addToSet({ codename, content: secrets[codename].content, knowers })
    }
  }
}

/**
 * Return a mapping of all of the page's secrets. Each object has a `codename`
 * property, but it will only have a `content` property if the point of view
 * (`pov`) provided is one that knows the secret.
 * @param {Character|string} [pov = 'Anonymous'] - The point of view of the
 *   person asking for the secrets. If given the string `Loremaster`, you'll
 *   know all of the secrets. If given the string `Anonymous`, you won't know
 *   any of them. Given a Character object, whether or not you know the secret
 *   will depend on whether or not the given character is on the list of people
 *   who know this secret.
 * @returns {{codename: string, content: string, known: boolean}[]} - An array
 *   of the page's secrets. The `codename` proeprty provides the codename used
 *   to identify the string. The `content` property provides the actual text of
 *   the secret. The `known` property is a boolean, which is `true` if the POV
 *   provided knows this secret, or `false` if hen does not.
 */

PageSchema.methods.getSecrets = function (pov = 'Anonymous') {
  return this.secrets.list.map(secret => {
    const { codename, content, knowers } = secret
    return { codename, content, known: pov === 'Loremaster' || knowers.includes(pov?._id) }
  })
}

/**
 * Use game modules to determine if any secrets should be revealed to this
 * character. Each character only has one chance to check each secret.
 * @param {Character} char - The character being checked.
 * @returns {Promise<void>} - A Promise that resolves once all checks have been
 *   made and recorded, and the document has been saved to the database.
 */

PageSchema.methods.checkSecrets = async function (char) {
  for (const secret of this.secrets.list) {
    if (secret.checked.includes(char._id)) continue
    for (const game of config.games) {
      const { info, checkSecret } = await import(`../games/${game}/${game}.js`)
      for (const stat of info.sheet) {
        const match = secret.content.match(stat.regex)
        if (match && checkSecret(stat, match, char)) {
          await this.reveal(char, secret.codename)
        }
      }
    }
    secret.checked.addToSet(char._id)
  }
  await this.save()
}

/**
 * Reveal a secret to a character.
 * @param {Character|Schema.Types.ObjectId|string} char - The character that
 *   you would like to reveal the secret to (or hens ID, or the string
 *   representation of hens ID).
 * @param {string} [codename = null] - The codename of the secret that you
 *   would like to reveal to the character `char`. If the page itself is a
 *   secret, and you set this argument to a falsy value (`false`, `null`, etc.)
 *   then the secret to reveal is the existence of the page.
 * @returns {Promise<boolean>} - A Promise that resolves with `true` once the
 *   character has been added to the list of those who know the secret
 *   indicated, or `false` if there is no such secret to reveal.
 */

PageSchema.methods.reveal = async function (char, codename = null) {
  const { existence } = this.secrets
  const id = char?._id || char
  const secret = codename ? this.findSecret(codename) : null
  const knowers = secret ? secret.knowers : existence && !codename ? this.secrets.knowers : false
  if (!knowers) return false
  knowers.addToSet(id)
  await this.save()
  return true
}

/**
 * Reveal a secret to every character that has a page in a given category. This
 * is a recursive function, so it will explore all of the category's
 * subcategories, and reveal the secret to any characters with pages in any of
 * those categories, too.
 * @param {string} category - The name of the category.
 * @param {string} [codename = null] - The codename of the secret that you
 *   would like to reveal. If the page itself is a secret, and you set this
 *   argument to a falsy value (`false`, `null`, etc.) then the secret to
 *   reveal is the existence of the page.
 * @returns {Promise<void>} - A Promise that resolves once the secret has been
 *   revealed to all characters with pages in the category or any of its
 *   subcategories.
 */

PageSchema.methods.revealToCategory = async function (category, codename = null) {
  const Page = model('Page')
  const Character = model('Character')
  const { subcategories, pages } = await Page.findMembers(category, 'Loremaster')
  for (const categorization of subcategories) {
    const { title } = categorization.page
    const name = title.startsWith('Category:') ? title.substring(9) : title
    await this.revealToCategory(name, codename)
  }
  for (const categorization of pages) {
    const char = await Character.findOne({ page: categorization.page._id })
    if (char) await this.reveal(char, codename)
  }
}

/**
 * Reveal a secret to the characters indicated by the string `name`. This could
 * be just one character, if `name` is the name of a single character. It could
 * be several characters who share the same name. It could be a whole group, if
 * `name` is the name of a category.
 * @param {string} name - The name indicating who you'd like to reveal the
 *   secret to.
 * @param {string} [codename = null] - The codename of the secret that you
 *   would like to reveal. If the page itself is a secret, and you set this
 *   argument to a falsy value (`false`, `null`, etc.) then the secret to
 *   reveal is the existence of the page.
 * @returns {Promise<void>} - A Promise that resolves when the secret has been
 *   revealed to the characters indicated by the `name` argument.
 */

PageSchema.methods.revealToName = async function (name, codename = null) {
  const Page = model('Page')
  const Character = model('Character')
  await this.revealToCategory(name, codename)
  const pages = await Page.findByTitle(name, 'Loremaster')
  for (const page of pages) {
    const char = await Character.findOne({ page: page._id })
    if (char) await this.reveal(char, codename)
  }
}

/**
 * Reports on whether the character `char` knows the secret identified by the
 * given `codename`.
 * @param {Character|Schema.Types.ObjectId|string} char - The character who
 *   might (or might not) know the secret (or hens ID, or the string
 *   representation of hens ID), or the string 'Anonymous' for an anonymous
 *   user, or the string 'Loremaster' for a loremaster.
 * @param {string} codename - The codename identifying the secret. If you
 *   provide a falsy value (e.g., `false` or `null`) and the page itself is a
 *   secret, then the secret the method reports on is the existence of the page
 *   itself.
 * @returns {boolean} - `true` if the character `char` knows the secret
 *   identified by the given `codename`, or `false` if hen does not.
 */

PageSchema.methods.knows = function (char, codename) {
  if (typeof char === 'string' && char.toLowerCase() === 'loremaster') return true
  if (typeof char === 'string') return false
  const secret = this.findSecret(codename)
  if (!secret) return true
  const id = char?._id || char
  return secret.knowers.includes(id)
}

/**
 * Write a version of the body according to the parameters provided.
 * @param {object} params - An object defining the parameters of how the body
 *   should be written.
 * @param {Character|string} [params.pov = 'Anonymous'] - The point of view
 *   from which the body should be written. If this is the string `Loremaster,`
 *   then all secrets are shown. If this is the string `Anonymous` (which it is
 *   by default), then no secrets are shown. If given a Character, only those
 *   secrets which are known to that character are shown.
 * @param {string} [params.mode = 'reading'] - The mode in which we are writing
 *   the body from the given version. In `full` mode, we fully expand all
 *   secrets. This is typically used in preparing the version to be saved to
 *   the database. In `editing` mode, codenames are used to create placeholders
 *   for where secrets appear in the text for points of view that are not privy
 *   to those secrets. In `reading` mode, no indication is made of any secrets
 *   that the point of view is not privy to. Acceptable strings for this
 *   parameter are `full`, `editing`, or `reading`. (Default: `reading`)
 * @param {string} params.str - If provided, the method will work on this
 *   string instead of the body of any exisitng version of the page. This
 *   overrides `params.version`.
 * @param {Version} [params.version = this.getCurr()] - The version from which
 *   we take the body that we're going to write.
 * @returns {string} - The body written according to the parameters provided.
 */

PageSchema.methods.write = async function (params = {}) {
  const { pov = 'Anonymous', mode = 'reading', version = this.getCurr() } = params
  const secrets = this.getSecrets(pov)
  let str = params.str || version?.body || ''

  const full = mode.toLowerCase() === 'full'
  const editing = !full && mode.toLowerCase() === 'editing'
  const reading = !full && !editing

  for (const secret of secrets) {
    const s = await this.renderSecret(secret.codename, params.pov)
    const txt = full || (editing && secret.known)
      ? `||::${secret.codename}:: ${secret.content}||`
      : editing && !secret.known
        ? `||::${secret.codename}::||`
        : reading && secret.known && s
          ? `<span class="secret" data-codename="${secret.codename}">${s.render} <a href="/${this.path}/reveal/${secret.codename}">[Reveal]</a></span>`
          : ''

    const regex = new RegExp(`\\|\\|::${secret.codename}::[.\\s\\S]*?\\|\\|`, 'gm')
    const replace = str.match(regex)
    if (replace) {
      str = str.replace(replace, txt)
    } else if ((full || editing) && !secret.known) {
      str += `\n\n${txt}`
    }
  }

  return str.trim()
}

/**
 * Add a content update to the page's versions and then save the page.
 * @param {object} content - An object containing the content to be added as
 *   the new version.
 * @param {string} content.title - The title of the new page document version.
 * @param {string} content.body - The body of the new page document version.
 * @param {string} [content.msg] - (Optional) If provided, adds a commit
 *   message to the version created for this update.
 * @param {User|Schema.Types.ObjectID|string} editor - Either a User document,
 *   or the ID of a user. This is the person making the update.
 * @returns {Promise<Page>} - A Promise that resolves with the updated page
 *   once the update has been made and the Page document saved to the database.
 */

PageSchema.methods.update = async function (content, editor) {
  const codenamer = this.findCodename.bind(this)
  let { body } = content
  body = body && body.length > 0 ? smartquotes(content.body) : ''
  const tags = body.match(/<.*? (.*?=“.*?”)*?>/gm)
  if (tags) { for (const tag of tags) body = body.replace(tag, tag.replace(/[“|”]/g, '"')) }
  const { str, secrets } = assignCodenames(body, codenamer)
  this.processSecrets(secrets, editor)
  content.title = smartquotes(content.title)
  content.body = await this.write({ str, pov: editor.getPOV(), mode: 'full' })
  if (content.file) this.file = content.file
  this.title = content.title
  this.versions.push(Object.assign({}, content, { editor: editor._id }))
  await this.save()
  return this
}

/**
 * Roll the page back to a previous version.
 * @param {Version} version - The version that the editor would like to return
 *   the page to.
 * @param {User} editor - The user who is rolling the page back.
 * @returns {Promise<void>} - A Promise that resolves when the rollback has
 *   been completed.
 */

PageSchema.methods.rollback = async function (version, editor) {
  const d = dayjs(version.timestamp)
  await this.update({
    title: version.title,
    body: version.body,
    editor,
    timestamp: Date.now(),
    msg: `Rolling back to version made on ${d.format('D MMM YYYY [at] h:mm A')}`
  }, editor)
}

/**
 * Render a version of the page to HTML.
 * @param {User} renderer - The user that we're rendering the page for.
 * @param {Version} [version = this.getCurr()] - The version of the page that
 *   we're rendering. This defaults to the most recent version.
 * @param {string} str - If provided, the method renders this string instead of
 *   the body of the version provided.
 * @returns {Promise<string>} - A Promise that resolves with the string of
 *   rendered HTML for the version of the page specified, as the renderer would
 *   see it.
 */

PageSchema.methods.render = async function (renderer, version = this.getCurr(), str) {
  const pov = renderer?.getPOV ? renderer.getPOV() : renderer
  str = str || await this.write({ pov, version })
  const pre = saveBlocks(str, /(```|<pre><code>)(\r|\n|.)*?(```|<\/code><\/pre>)/, 'PREBLOCK')
  str = pre.str
  str = renderTags(str, '<includeonly>')
  str = renderTags(str, '<noinclude>', true)
  str = await Template.render(str, renderer)
  str = str.replace(/\[\[Category:.*?(\|.*?)?\]\]/gm, '')
  const links = await renderLinks(str, this.getSecrets(pov), renderer)
  str = await renderFiles(links.str)
  str = restoreBlocks(str, pre.blocks)
  str = await renderMarkup(str)
  return str
}

/**
 * Render the page's file in an HTML image tag.
 * @param {string} [alt = this.title] - The alternative text to provide in the
 *   image tag. (Default: the page's title).
 * @returns {string} - An HTML image tag for the page's file if it has one, or
 *   an empty string if it does not.
 */

PageSchema.methods.renderImage = function (alt = this.title) {
  if (!this.file?.url) return ''
  return `<img src="${this.file.url}" alt="${alt}" />`
}

/**
 * Render the page's file as an HTML SVG tag.
 * @returns {Promise<string>} - An HTML SVG tag for page's file if it has one
 *   and the file it points to exists, can be loaded, and is an SVG file, or an
 *   empty string if any of those conditions are not met.
 */

PageSchema.methods.renderSVG = async function () {
  if (!this.file?.url) return ''
  try {
    const res = await axios.get(this.file.url)
    if (res.status !== 200 || res.headers['content-type'] !== 'image/svg+xml') return ''
    return res.data.substr(0, 6) === '<?xml '
      ? res.data.substr(res.data.indexOf('<', 1))
      : res.data
  } catch (err) {
    console.error(err)
    return ''
  }
}

/**
 * Renders the page's file as an HTML audio tag.
 * @param {string} [caption = this.title] - The caption to provide for the
 *   audio. (Default: The page's title).
 * @returns {string} - An HTML audio tag for playing the page's file.
 */

PageSchema.methods.renderAudio = function (caption = this.title) {
  if (!this.file?.url) return ''
  const notSupported = '<p>Your browser does not support the HTML <code>audio</code> element.</p>'
  const audio = `<audio controls src="${this.file.url}">\n${notSupported}\n</audio>`
  const figcaption = `<figcaption>${caption}</figcaption>`
  const inside = [figcaption, audio].join('\n')
  return `<figure class="audio">\n${inside}\n</figure>`
}

/**
 * Renders the page's file as an HTML video tag.
 * @returns {string} - An HTML video tag for playing the page's file.
 */

PageSchema.methods.renderVideo = function () {
  if (!this.file?.url || !this.file?.mimetype) return ''
  const { url, mimetype } = this.file
  const notSupported = '<p>Your browser does not support the HTML <code>video</code> element.</p>'
  const src = `<source src="${url} type="${mimetype}" />`
  const inside = [src, notSupported].join('\n')
  return `<video controls>\n${inside}\n</video>`
}

/**
 * Renders the page's file as a download link.
 * @param {string} [title = this.title] - The title to use on the download
 *   link. (Default: The page's title)
 * @returns {string} - A link to download the page's file.
 */

PageSchema.methods.renderDownload = function (title = this.title) {
  if (!this.file?.url || !this.file?.mimetype || !this.file?.size) return ''
  const { url, mimetype, size } = this.file
  const heading = `<span class="name">${title}</span>`
  const details = `<small>${mimetype}; ${getReadableFileSize(size)}</small>`
  const inside = [heading, details].join('\n')
  return `<a href="${url}" class="download">\n${inside}\n</a>`
}

/**
 * Sort which rendering method should be used for the page's file based on its
 * MIME type.
 * @param {string} text - Override text to be used as alt text, a caption, or a
 *   title, depending on how the file is to be rendered.
 * @returns {Promise<string>} - A Promise that resolves with a string of HTML
 *   rendering the page's file appropriately for its MIME type.
 */

PageSchema.methods.renderFile = async function (text) {
  if (!this.file?.mimetype) return ''
  const display = Object.keys(config.fileDisplay).includes(this.file.mimetype)
    ? config.fileDisplay[this.file.mimetype]
    : 'Download'
  switch (display) {
    case 'Image': return this.renderImage(text)
    case 'SVG': return this.renderSVG()
    case 'Audio': return this.renderAudio(text)
    case 'Video': return this.renderVideo()
    default: return this.renderDownload(text)
  }
}

/**
 * Returns the secret identified by the `codename` (or `null` if the `user`
 * doesn't know it) with an added `render` property which strips out any game
 * tags that may occur in the secret's content.
 * @param {string} codename - The codename of the secret to render.
 * @param {Character|string} [pov = 'Anonymous'] - The point of view from which
 *   the secret should be rendered. If this is the string `Loremaster,` then
 *   all secrets are shown. If this is the string `Anonymous` (which it is by
 *   default), then no secrets are shown. If given a Character, only those
 *   secrets which are known to that character are shown.
 * @returns {Promise<Secret|null>} - The secret requested, with an additional
 *   `render` property, or `null` if the user doesn't know it.
 */

PageSchema.methods.renderSecret = async function (codename, pov = 'Anonymous') {
  const secret = this.findSecret(codename)
  if (!secret || !this.knows(pov, codename)) return null
  secret.render = secret.content
  for (const game of config.games) {
    const { info } = await import(`../games/${game}/${game}.js`)
    for (const stat of info.sheet) {
      const matches = match(secret.render, stat.regex)
      for (const m of matches) secret.render = secret.render.replace(m.str, '').trim()
    }
  }
  return secret
}

/**
 * Delete the file associated with the page.
 * @returns {Promise<void>} - A Promise that resolves once the page's file has
 *   been deleted from the CDN. If the page has no file, nothing happens.
 */

PageSchema.methods.deleteFile = async function () {
  const { bucket, domain } = config.aws
  if (!this.file?.url) return
  const s3 = getS3()
  await s3.deleteObject({ Bucket: bucket, Key: this.file.url.substr(domain.length + 1) }).promise()
}

/**
 * Looks up a Page by its ID, with all the necessary safeguards to keep secret
 * pages away from those who don't know about them.
 * @param {Schema.Types.ObjectId|string} id - The ID of the page that you would
 *   like to find, or a string representation of it.
 * @param {User|string} user - The User who's asking for the Page, or the
 *   string `Loremaster` for a loremaster, or the string `Anonymous` for an
 *   anonymous user.
 * @returns {Promise<Page|null>} - A Promise that resolves with the Page if a
 *   Page document with that ID exists, and it is either not a secret, or if it
 *   is, it's a secret that the user's point of view has access to, or `null`
 *   if not.
 */

PageSchema.statics.findByIdDiscreetly = async function (id, user) {
  const Page = this.model('Page')
  return Page.findOne(makeDiscreetQuery({ _id: id }, user))
}

/**
 * Find a page by its path.
 * @param {string} path - The path of the page that the searcher would like
 *   to find.
 * @param {User|string} searcher - The user conducting the search, or the
 *   string `Loremaster` for a loremaster, or the string `Anonymous` for an
 *   anonymous user.
 * @returns {Promise<Page|null>} - A Promise that resolves with the page with
 *   the given path, if it exists and the user knows about it, or `null` if one
 *   of those conditions is not met.
 */

PageSchema.statics.findByPath = async function (path, searcher) {
  const Page = this.model('Page')
  const elems = path.startsWith('/') ? path.substring(1).split('/') : path.split('/')
  return Page.findOne(makeDiscreetQuery({ path: elems[0] }, searcher))
}

/**
 * Returns an array of pages that have the given title.
 * @param {string} title - The title of the page that the searcher is
 *   looking for.
 * @param {User|string} searcher - The user conducting the search, or the
 *   string `Loremaster` for a loremaster, or the string `Anonymous` for an
 *   anonymous user.
 * @returns {Promise<Page[]>} - A Promise that resolves with an array of pages
 *   that have the title requested.
 */

PageSchema.statics.findByTitle = async function (title, searcher) {
  const Page = this.model('Page')
  const pages = await Page.find(makeDiscreetQuery({ title }, searcher))
  return pages && pages.length > 0 ? [...pages] : []
}

/**
 * Returns the first page that has the given title.
 * @param {string} title - The title of the page that the searcher is
 *   looking for.
 * @param {User|string} searcher - The user conducting the search, or the
 *   string `Loremaster` for a loremaster, or the string `Anonymous` for an
 *   anonymous user.
 * @returns {Promise<Page|null>} - The first page that has the given title and
 *   that the searcher has access to, or `null` if no page meets both of those
 *   criteria.
 */

PageSchema.statics.findOneByTitle = async function (title, searcher) {
  const Page = this.model('Page')
  const pages = await Page.findByTitle(title, searcher)
  return pages.length > 0 ? pages[0] : null
}

/**
 * Find all of the members of a category (that the searcher knows about).
 * @param {string} category - The name of the category that the searcher would
 *   like to find the members to.
 * @param {User|string} searcher - The user who would like to find all of the
 *   members of the category, or the string `Loremaster` (for a loremaster) or
 *   `Anonymous` (for an anonymous user.
 * @returns {Promise<{pages: *[], subcategories: *[]}>} - A Promise that
 *   resolves with an object with the following properties:
 *     `subcategories`   The members of the category that are categories
 *                       themselves.
 *     `pages`           The other pages that are members of the category, that
 *                       are not categories themselves.
 */

PageSchema.statics.findMembers = async function (category, searcher) {
  const Page = this.model('Page')
  const pages = await Page.find(makeDiscreetQuery({ 'categories.name': category }, searcher))
  const members = { subcategories: [], pages: [] }
  for (const page of pages) {
    const cat = page.getCategorization(category, searcher)
    if (!cat) continue
    const { sort } = cat
    const arr = page.title.startsWith('Category:') ? members.subcategories : members.pages
    arr.push({ page, sort })
  }
  members.subcategories = alphabetize(members.subcategories, el => el.sort)
  members.page = alphabetize(members.pages, el => el.sort)
  return members
}

/**
 * Create a new page.
 * @param {object} content - An object containing the content to be added as
 *   the new version.
 * @param {string} content.title - The title of the new page.
 * @param {string} content.body - The initial body of the new page.
 * @param {string} [content.msg] - (Optional) If provided, adds a commit
 *   message to the version created for this update. (Default: `Initial text`)
 * @param {User|Schema.Types.ObjectID|string} editor - Either a User document,
 *   or the ID of a user. This is the person creating the page.
 * @returns {Promise<Page>} - A Promise that resolves once the update has been
 *   made and the Page document saved to the database.
 */

PageSchema.statics.create = async function (content, editor) {
  const Page = this.model('Page')
  const page = new Page()
  if (!content.msg) content.msg = 'Initial text'
  await page.update(content, editor)
  return page
}

export default model('Page', PageSchema)
