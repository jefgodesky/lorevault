const { Schema, model } = require('mongoose')
const slugger = require('mongoose-slug-generator')
const uniqueValidation = require('mongoose-unique-validator')
const { formatDate } = require('../views/helpers')

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
  types: [String],
  categories: [Schema.Types.ObjectId],
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
 * Before saving the page, figure out its types, based on its title and body.
 */

PageSchema.pre('save', function (next) {
  // If title is of form `X:Y`, save `X` as a type.
  const index = this.title.indexOf(':')
  const titleType = index > -1
    ? this.title.substr(0, index).trim()
    : null

  // Fetch any other types specified in the body.
  const matches = this.body.match(/\[\[Type:(.*?)\]\]/gm)
  const bodyTypes = matches
    ? matches.map(m => m.substr(7, m.length - 9).trim())
    : []

  this.types = titleType && !bodyTypes.includes(titleType) ? [ titleType, ...bodyTypes ] : bodyTypes
  return next()
})

/**
 * Makes an update to a Page document.
 * @param {object} update - The update to make. This object should conform to
 *   the `VersionSchema` outline.
 * @returns {Promise<Page>} - A Promise that resolves with the new document
 *   once it has been updated and saved.
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
 * Given an array of strings representing version IDs, this method returns an
 * array of versions of the Page document that have matching IDs, sorted into
 * chronological order.
 * @param {[string]} ids - An array of string representing version IDs.
 * @returns {[Version]} - An array of versions of the Page document that have
 *   matching IDs, sorted into chronological order.
 */

PageSchema.methods.orderVersions = function (ids) {
  const ordered = []
  for (const v of this.versions) {
    if (ids.includes(v._id.toString())) ordered.push(v)
  }
  return ordered
}

/**
 * Roll the Page document back to a previous version.
 * @param {string} id - The ID of the Page document's version that you want to
 *   roll back to.
 * @param {Schema.Types.ObjectId} editor - The ID of the user rolling back
 *   the Page.
 * @returns {Promise<Page>|null} - `null` if the Page document does not have a
 *   version with the specified ID, or, if it does, a Promise that resolves
 *   once the Page document has been rolled back to the specified version and
 *   saved to the database.
 */

PageSchema.methods.rollback = function (id, editor) {
  const version = this.findVersion(id)
  if (!version) return null
  return this.makeUpdate({
    title: version.title,
    body: version.body,
    msg: `Rolling back to the version created at ${formatDate(version.timestamp)}`,
    editor
  })
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
 * Return a Page document or an array of Page documents that have a
 * given title.
 * @param {string} title - The title to search for.
 * @param {string} type - (Optional.) If provided, the query will only return
 *   Pages that have the specified type.
 * @returns {Page|[Page]} - The lone Page document with the title provided if
 *   only one match was found, or an array of Page documents with the given
 *   title if more than one was found, or an empty array if no matching Page
 *   documents could be found.
 */

PageSchema.statics.findByTitle = async function (title, type) {
  const query = { title: { $regex: new RegExp(`^${title}$`, 'i') } }
  if (type && typeof type === 'string' && type.length > 0) query.types = type
  const docs = await this.find(query)
  return docs?.length === 1 ? docs[0] : docs
}

/**
 * A static method which combines looking up the page by the URL provided and
 * then applying the update to the page if it was found.
 * @param {string} url - The requesting URL.
 * @param {object} update - The update to make. This object should conform to
 *   the `VersionSchema` outline.
 * @returns {Promise<Page|Boolean>} - A Promise that resolves with the new
 *   document after it has been updated or saved, or `false` if it could
 *   not be found.
 */

PageSchema.statics.makeUpdate = async function (url, update) {
  const doc = await this.findByPath(url)
  return doc && doc.makeUpdate ? doc.makeUpdate(update) : false
}

module.exports = model('Page', PageSchema)
