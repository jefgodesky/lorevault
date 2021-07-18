const { Schema, model } = require('mongoose')
const slugger = require('mongoose-slug-generator')
const uniqueValidation = require('mongoose-unique-validator')

const CorePageSchemaDefinition = {
  title: String,
  body: String
}

const VersionSchema = new Schema(Object.assign({}, CorePageSchemaDefinition, {
  msg: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  editor: Schema.Types.ObjectId
}))

const PageSchema = new Schema(Object.assign({}, CorePageSchemaDefinition, {
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
  versions: [VersionSchema]
}))

PageSchema.plugin(slugger)
PageSchema.plugin(uniqueValidation)

/**
 * Makes an update to a Page document.
 * @param {object} update - The update to make. This object should conform to
 *   the `VersionSchema` outline.
 * @returns {Promise<PageSchema>} - A Promise that resolves with the new
 *   document once it has been updated and saved.
 */

PageSchema.methods.makeUpdate = async function (update) {
  if (update.title) this.title = update.title
  if (update.body) this.body = update.body
  this.versions.push(update)
  await this.save()
  return this
}

/**
 * Return a particular version of the Page document, identified by its ID.
 * @param {string} id - The ID of the version to return.
 * @returns {Version|undefined} - The Version that matches the ID provided, or
 *   `undefined` if no such version could be found.
 */

PageSchema.methods.findVersion = function (id) {
  const versions = this.versions.filter(v => v._id.toString() === id)
  if (versions.length <= 0) return undefined
  return versions[0]
}

/**
 * Return a Page document that has a given path.
 * @param {string} url - The requesting URL.
 * @returns {*} - A Promise that returns with the result of the query.
 */

PageSchema.statics.findByPath = function (url) {
  const parts = url.split('/')
  const path = parts[0] === '' ? parts[1] : parts[0]
  return this.findOne({ path })
}

/**
 * A static method which combines looking up the page by the URL provided and
 * then applying the update to the page if it was found.
 * @param {string} url - The requesting URL.
 * @param {object} update - The update to make. This object should conform to
 *   the `VersionSchema` outline.
 * @returns {Promise<PageSchema|Boolean>} - A Promise that resolves with the
 *   new document after it has been updated or saved, or `false` if it could
 *   not be found.
 */

PageSchema.statics.makeUpdate = async function (url, update) {
  const doc = await this.findByPath(url)
  return doc && doc.makeUpdate ? doc.makeUpdate(update) : false
}

module.exports = model('Page', PageSchema)
