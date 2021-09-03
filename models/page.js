import smartquotes from 'smartquotes'

import assignCodenames from '../transformers/assignCodenames.js'
import { pickRandom, union, findOne } from '../utils.js'

import config from '../config/index.js'

import mongoose from 'mongoose'
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
  path: String,
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

/**
 * Update the modified date each time the page is saved.
 */

PageSchema.pre('save', function (next) {
  this.modified = Date.now()
  next()
})

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
  content.body = str
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
