import smartquotes from 'smartquotes'

import { pickRandom } from '../utils.js'
import { pickRandom, union } from '../utils.js'

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
    const filtered = list.filter(s => s.codename === codename)
    const existing = filtered.length > 0 ? filtered[0] : null
    const inUpdate = updatedCodenames.includes(codename)
    const editorKnows = (existing && existing.knowers.includes(editor._id)) || !existing
    if (existing && inUpdate && editorKnows) {
      existing.content = secrets[codename].content
    } else if (existing && !inUpdate && editorKnows) {
      list.pull({ _id: existing._id })
    } else if (!existing) {
      list.addToSet({
        codename,
        content: secrets[codename].content,
        knowers: [editor._id]
      })
    }
  }
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
  content.title = smartquotes(content.title)
  content.body = smartquotes(content.body)
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
