import smartquotes from 'smartquotes'

import assignCodenames from '../transformers/assignCodenames.js'
import { pickRandom, union, findOne } from '../utils.js'

import config from '../config/index.js'

import mongoose from 'mongoose'
import slugger from 'mongoose-slug-generator'
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
    ref: 'User'
  }]
})

const PageSchema = new Schema({
  title: String,
  path: {
    type: String,
    slug: 'title',
    unique: true
  },
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
      ref: 'User'
    }],
    list: [SecretSchema]
  },
  versions: [VersionSchema]
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
  return findOne(this.versions, v => v._id === id)
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
    const editorKnows = (existing && existing.knowers.includes(editor._id)) || !existing
    if (existing && inUpdate && editorKnows) {
      existing.content = secrets[codename].content
    } else if (existing && !inUpdate && editorKnows) {
      list.pull({ _id: existing._id })
    } else if (!existing) {
      list.addToSet({ codename, content: secrets[codename].content, knowers: [editor._id] })
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
 * Reports on whether the character `char` knows the secret identified by the
 * given `codename`.
 * @param {Character|Schema.Types.ObjectId|string} char - The character who
 *   might (or might not) know the secret (or hens ID, or the string
 *   representation of hens ID).
 * @param {string} codename - The codename identifying the secret. If you
 *   provide a falsy value (e.g., `false` or `null`) and the page itself is a
 *   secret, then the secret the method reports on is the existence of the page
 *   itself.
 * @returns {boolean} - `true` if the character `char` knows the secret
 *   identified by the given `codename`, or `false` if hen does not.
 */

PageSchema.methods.knows = function (char, codename) {
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

PageSchema.methods.write = function (params = {}) {
  const { pov = 'Anonymous', mode = 'reading', version = this.getCurr() } = params
  const secrets = this.getSecrets(pov)
  let str = params.str || version.body

  const full = mode.toLowerCase() === 'full'
  const editing = !full && mode.toLowerCase() === 'editing'
  const reading = !full && !editing

  for (const secret of secrets) {
    const txt = full || (editing && secret.known)
      ? `||::${secret.codename}:: ${secret.content}||`
      : editing && !secret.known
        ? `||::${secret.codename}::||`
        : reading && secret.known
          ? secret.content
          : ''

    const regex = new RegExp(`\\|\\|::${secret.codename}::\\s*?.*?\\|\\|`, 'gm')
    const match = str.match(regex)
    if (match) {
      str = str.replace(match, txt)
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
  const { str, secrets } = assignCodenames(smartquotes(content.body), codenamer)
  this.processSecrets(secrets, editor)
  content.title = smartquotes(content.title)
  content.body = this.write({ str, pov: editor.getPOV(), mode: 'full' })
  this.title = content.title
  this.versions.push(Object.assign({}, content, { editor: editor._id }))
  await this.save()
  return this
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
