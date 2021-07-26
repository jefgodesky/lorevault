const { Schema, model } = require('mongoose')
const slugger = require('mongoose-slug-generator')
const uniqueValidation = require('mongoose-unique-validator')
const { getS3 } = require('../utils')
const { formatDate } = require('../views/helpers')
const { bucket, domain } = require('../config').aws

const CorePageSchemaDefinition = {
  title: String,
  body: String,
  file: {
    url: String,
    mimetype: String,
    size: Number
  }
}

const VersionSchema = new Schema(Object.assign({}, CorePageSchemaDefinition, {
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

const PageSchema = new Schema(Object.assign({}, CorePageSchemaDefinition, {
  types: [String],
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Page'
  }],
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
 * Before saving the page, figure out its types, based on its title, file,
 * and body.
 */

PageSchema.pre('save', function (next) {
  // If title is of form `X:Y`, save `X` as a type.
  const index = this.title.indexOf(':')
  const titleType = index > -1
    ? this.title.substr(0, index).trim()
    : null

  // If it has a file, add types around that.
  const types = {
    'text/plain': 'Plain text file',
    'text/css': 'CSS file',
    'text/html': 'HTML file',
    'text/javascript': 'JavaScript file',
    'text/ecmascript': 'JavaScript file',
    'application/javascript': 'JavaScript file',
    'application/ecmascript': 'JavaScript file',
    'image/gif': 'GIF image',
    'image/jpeg': 'JPEG image',
    'image/png': 'PNG image',
    'image/svg+xml': 'SVG image',
    'image/webp': 'WebP image',
    'audio/wave': 'WAVE file',
    'audio/wav': 'WAVE file',
    'audio/x-wav': 'WAVE file',
    'audio/x-pn-wav': 'WAVE file',
    'audio/webm': 'WebM audio file',
    'video/webm': 'WebM video',
    'audio/ogg': 'OGG audio file',
    'video/ogg': 'OGG video'
  }

  const mime = this.file?.mimetype
  const fileTypes = []
  if (mime) fileTypes.push(mime.substr(0,1).toUpperCase() + mime.substr(1, mime.indexOf('/') - 1) + ' file')
  if (mime && types[mime]) fileTypes.push(types[mime])

  // Fetch any other types specified in the body.
  const matches = this.body.match(/\[\[Type:(.*?)\]\]/gm)
  const bodyTypes = matches
    ? matches.map(m => m.substr(7, m.length - 9).trim())
    : []

  // Set types, remove nulls, and dedupe
  this.types = [ titleType, ...fileTypes, ...bodyTypes ]
  this.types = this.types.filter(type => type !== null)
  this.types = [ ...new Set(this.types) ]
  return next()
})

/**
 * Create the array of categories that the Page belongs to. These can include
 * both categories that already exist that the page refers to, or new
 * categories that are created now because a page is being saved with them.
 */

PageSchema.pre('save', async function (next) {
  const Page = this.model('Page')
  this.categories = []
  const matches = this.body.match(/\[\[Category:(.*?)\]\]/gm)
  const categoryNames = matches
    ? matches.map(m => m.substr(11, m.length - 13).trim())
    : []
  for (const name of categoryNames) {
    const existing = await Page.findByTitle(name, 'Category')
    if (existing && existing._id) { this.categories.push(existing._id); continue }
    const category = await Page.create({
      title: name,
      body: '[[Type:Category]]',
      versions: [{
        title: name,
        body: '[[Type:Category]]',
        msg: `Created along with ${this.title}`,
        editor: this.versions[this.versions.length - 1]._id
      }]
    })
    this.categories.push(category._id)
  }
  next()
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
  if (update.file) {
    await this.deleteFile()
    this.file = update.file
  }
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
 * Parse a page's body as a template, given the parameters provided.
 * @param {{ordered: *[], named: {}}} params - An object with readable
 *   parameters. The `ordered` array presents the ordered array of parameters
 *   received, while the `named` object presents a dictionary of the key/value
 *   pairs that were passed as parameters.
 * @returns {string|null} - The body of the page parsed as a template using the
 *   parameters provided, or `null` if the page is not a template.
 */

PageSchema.methods.parseTemplate = function (params) {
  if (!this.types.includes('Template')) return null
  let str = this.body

  // Remove noincludes
  const noincludes = str.match(/<noinclude>(\r|\n|.)*?<\/noinclude>/gm)
  if (noincludes) {
    for (const noinclude of noincludes) {
      str = str.replace(noinclude, '')
    }
  }

  // Properly parse includeonlys
  const includeonlys = str.match(/<includeonly>(\r|\n|.)*?<\/includeonly>/gm)
  if (includeonlys) {
    for (const includeonly of includeonlys) {
      str = str.replace(includeonly, includeonly.substr(13, includeonly.length - 27).trim())
    }
  }

  // Substitute parameters
  for (const key of Object.keys(params.named)) str = str.replaceAll(`{{{${key}}}}`, params.named[key])
  for (const index in params.ordered) str = str.replaceAll(`{{{${parseInt(index) + 1}}}}`, params.ordered[index])

  return str
}

/**
 * This method delete the Page's file from S3.
 * @returns {Promise<void>} - A Promise that resolves once the page's file (if
 *   it has a file) has been deleted from S3.
 */

PageSchema.methods.deleteFile = async function () {
  if (!this.file?.url) return
  const s3 = getS3()
  await s3.deleteObject({ Bucket: bucket, Key: this.file.url.substr(domain.length + 1) }).promise()
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
 * Find all of the Page documents in a category.
 * @param {string} category - The name of the category that you want to find
 *   all fo the Page documents witihn.
 * @returns {Promise<{pages: Page[], subcategories: Page[]}|null>} - A Promise
 *   that resolves with an object with two properties. `subcategories` is an array
 *   of all of the Page documents that are in the category, which are
 *   themselves categories, while `pages` is an array of all of te other Page
 *   documents in the category, or `null` if no such category could be found.
 */

PageSchema.statics.findCategoryMembers = async function (category) {
  const c = await this.findByTitle(category, 'Category')
  const cat = c && c._id ? c : Array.isArray(c) && c.length > 0 ? c[0] : null
  if (!cat) return null
  const all = await this.find({ categories: cat._id })
  const subcategories = []
  const pages = []
  for (const page of all) {
    if (page.types.includes('Category')) {
      subcategories.push(page)
    } else {
      pages.push(page)
    }
  }
  return { subcategories, pages }
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
