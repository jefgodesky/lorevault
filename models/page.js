const { Schema, model } = require('mongoose')
const slugger = require('mongoose-slug-generator')
const uniqueValidation = require('mongoose-unique-validator')
const Character = require('./character')
const { getS3 } = require('../utils')
const { formatDate } = require('../views/helpers')
const { rules, aws } = require('../config')
const { bucket, domain } = aws

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

const SecretSchemaDefinition = {
  order: Number,
  section: String,
  text: String,
  checked: [{
    type: Schema.Types.ObjectId,
    ref: 'Character'
  }],
  knowers: [{
    type: Schema.Types.ObjectId,
    ref: 'Character'
  }]
}

for (const system of rules) SecretSchemaDefinition[system] = String
const SecretSchema = new Schema(SecretSchemaDefinition)

const PageSchema = new Schema(Object.assign({}, CorePageSchemaDefinition, {
  secrets: [SecretSchema],
  types: [String],
  categories: [{
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Page'
    },
    alias: String
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
PageSchema.index({ title: 'text', body: 'text' }, { name: 'Page Index', weights: { title: 10, body: 1 } })


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
    const split = name.split('|').map(el => el.trim())
    const obj = { alias: split.length > 1 ? split[1] : this.title }
    const title = split.length > 1 ? split[0] : name
    const existing = await Page.findByTitle(title, 'Category')
    if (existing && existing._id) {
      obj.category = existing._id
      this.categories.push(obj)
      continue
    }
    const category = await Page.create({
      title,
      body: '[[Type:Category]]',
      versions: [{
        title,
        body: '[[Type:Category]]',
        msg: `Created along with ${this.title}`,
        editor: this.versions[this.versions.length - 1]._id
      }]
    })
    obj.category = category._id
    this.categories.push(obj)
  }
  next()
})

/**
 * Assign secrets to the sections indicated.
 */

PageSchema.pre('save', function (next) {
  for (const secret of this.secrets) {
    const match = secret.text.match(/^\[(.*?)\]/m)
    if (match && match.length > 1) secret.section = match[1]
  }
  next()
})

/**
 * Make sure that secrets actually are in the order they say they're in.
 */

PageSchema.pre('save', function (next) {
  this.secrets = this.secrets.sort((a, b) => a.order - b.order)
  for (let i = 0; i < this.secrets.length; i++) this.secrets[i].order = i + 1
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
  if (update.file) this.file = update.file
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

  // Render #IF statements
  const ifs = str.match(/{{#IF\s?\|(.|\n\r)*\s?\|(.|\n\r)*\s?\|(.|\n\r)*\s?}}/gm)
  if (ifs) {
    for (const i of ifs) {
      const elems = i.substr(2, i.length - 4).split('|').map(el => el.trim())
      if (elems.length > 2 && params.named[elems[1]]) {
        str = str.replace(i, elems[2])
      } else if (elems.length > 3) {
        str = str.replace(i, elems[3])
      } else {
        str = str.replace(i, '')
      }
    }
  }

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
 * Returns the pages that belong to this page as a category.
 * @returns {Promise<{pages: Page[], subcategories: Page[]}|null>} - A Promise
 *   that resolves with the category's members, broken into pages (`pages`) and
 *   subcategories (`subcategories`), or `null` if this page is not a category.
 */

PageSchema.methods.findMembers = async function () {
  if (!this.types.includes('Category')) return null
  const all = await this.constructor.find({ 'categories.category': this._id }).sort('categories.alias')
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
 * Checks if a page is claimable (e.g., it is of type "Person" and no one else
 * has claimed it as a character yet).
 * @returns {Promise<boolean>} - `true` if the page includes "Person" among its
 *   types, and it has not been claimed as a character by anyone else yet, or
 *   `false` if either of those conditions are not met.
 */

PageSchema.methods.isClaimable = async function () {
  if (!this.types.includes('Person')) return false
  const check = await Character.findOne({ page: this._id })
  return !Boolean(check)
}

/**
 * Return the Character associated with this Page.
 * @returns {Promise<Character|null>} - A Promise that resolves with the
 *   Character associated with this page if one exists, or `null` if no such
 *   Character exists.
 */

PageSchema.methods.findCharacter = async function () {
  const char = await Character.findOne({ page: this._id })
  return char
}

/**
 * Returns an array of the page's secret that the given character knows.
 * @param {Character|string} char - A Character document, or the unique ID
 *   string of a Character document, if viewing the page from a character's
 *   point of view. The string "loremaster" sees the page as a loremaster,
 *   revealing all secrets, while the string "public" sees the page as someone
 *   not signed in, meaning that no secrets are shown.
 * @param {string} section - (Optional) If provided, the method will only
 *   return secrets that belong to the specified section.
 * @returns {Promise<SecretSchema[]>} - A Promise that resolves with the array
 *   of the page's secrets that the given character knows.
 */

PageSchema.methods.getKnownSecrets = function (char, section) {
  const id = char._id ? char._id.toString() : char.id ? char.id.toString() : char.toString()
  return this.secrets.filter(secret => {
    const inSection = section === 'all' || !section && !secret.section || secret.section === section
    if (inSection && id === 'loremaster') return true
    if (id === 'public') return false
    return secret.knowers.map(id => id.toString()).includes(id) && inSection
  })
}

/**
 * Return one of a page's secrets, identified by its ID.
 * @param {SecretSchema|Schema.Types.ObjectID|string} secret - Either a Secret
 *   schema object, or the unique ID string for a Secret schema object.
 * @returns {SecretSchema|null} - The Page's matching secret, if it could be
 *   found, or `null` if it could not be.
 */

PageSchema.methods.findSecretByID = function (secret) {
  const id = secret && secret._id ? secret._id.toString() : secret.toString()
  const matching = this.secrets.filter(s => s._id.toString() === id)
  return matching.length > 0 ? matching[0] : null
}

/**
 * Update a page's secrets.
 * @param {string[]} secrets - An array of strings, providing the new values
 *   for the texts of the page's secrets, in order.
 * @param {string[]} ids - An array of strings, providing the unique ID's for
 *   the existing secrets that are to be updated. These should be in order,
 *   such that for any value `x`, `ids[x]` provides the ID for the secret whose
 *   text is in `secrets[x]`.
 * @param {number[]} orders - An array of numbers, providing the order for each
 *   secret to be placed in.
 * @returns {Promise<void>} - A Promise that resolves when the page's secrets
 *   have been updated.
 */

PageSchema.methods.updateSecrets = async function (secrets, ids, orders) {
  for (let i = 0; i < secrets.length; i++) {
    const id = ids && Array.isArray(ids) ? ids[i] : null
    const secret = id ? this.findSecretByID(id) : null
    const order = orders && Array.isArray(orders) && orders.length > i ? orders[i] : i
    if (secret) {
      secret.text = secrets[i]
      secret.order = order
    } else {
      this.secrets.push({ text: secrets[i], order })
    }
  }
  this.secrets = this.secrets.filter(s => s.text !== '')
  await this.save()
}

/**
 * Reveals a secret to a character or a group of characters.
 * @param {SecretSchema|Schema.Types.ObjectID|string} secret - Either a Secret
 *   schema object, or the unique ID string for a Secret schema object.
 * @param {Character|Schema.Types.ObjectID|string} page - A Page indicating who
 *   the secret should be revealed to. If this is a character's page, then the
 *   secret is revealed to that character. If it is a category, the secret is
 *   revealed to all characters in that category, and then recursively to any
 *   and all characters in any subcategories.
 * @returns {Promise<void>} - A Promise that resolves when the secret has been
 *   revealed to the characters indicated.
 */

PageSchema.methods.revealSecret = async function (secret, page) {
  const s = this.findSecretByID(secret)
  if (!s) return
  const character = await page.findCharacter()
  if (character) {
    s.knowers = [ ...new Set([ ...s.knowers, character._id ]) ]
    await this.save()
  } else if (page.types.includes('Category')) {
    const members = await page.findMembers()
    if (!members) return
    for (const member of [ ...members.pages, ...members.subcategories ]) await this.revealSecret(secret, member)
  }
}

/**
 * Add a character to the list of checked characters.
 * @param {SecretSchema|Schema.Types.ObjectID|string} secret - Either a Secret
 *   schema object, or the unique ID string for a Secret schema object.
 * @param {Character|{ id: string }|string} char - Ether a Character schema
 *   object, or an object with an `id` property that contains the ID of a
 *   Character schema object, or a string, which is the ID of a Character
 *   schema object. This is used to identify the character who has now checked
 *   the secret.
 * @returns {Promise<void>} - A Promise that resolves when the secret has been
 *   updated and the page has been saved.
 */

PageSchema.methods.checkSecret = async function (secret, char) {
  const s = this.findSecretByID(secret)
  if (!s) return
  const c = char?.constructor?.name === 'Character'
    ? char
    : char.id
      ? await Character.findById(char.id)
      : await Character.findById(char)
  if (!c) return

  // If the character hasn't checked this secret before, check if it should
  // be revealed according to any of our rules systems.

  if (!s.checked.includes(c._id)) {
    let reveal = false
    for (const system of rules) {
      const check = (await import(`../rules/${system}/check.js`)).default
      reveal = reveal || check(s.text, c)
    }
    if (reveal) s.knowers = [...new Set([...s.knowers, c._id])]
  }

  // In any case, we note that the character has checked this secret, so hen
  // won't keep checking every time hen visits the page, and we save the page.

  s.checked = [ ...new Set([ ...s.checked, c._id ]) ]
  await this.save()
}

/**
 * Run PageSchema.methods.checkSecret on each of the page's secrets.
 * @param {Character|{ id: string }|string} char - Ether a Character schema
 *   object, or an object with an `id` property that contains the ID of a
 *   Character schema object, or a string, which is the ID of a Character
 *   schema object. This is used to identify the character who has now checked
 *   the secret.
 * @returns {Promise<void>} - A Promise that resolves once all of the page's
 *   secrets have been checked.
 */

PageSchema.methods.checkSecrets = async function (char) {
  for (const secret of this.secrets) {
    await this.checkSecret(secret, char)
  }
}

/**
 * Delete the current page.
 * @returns {Promise<void>} - A Promise that resolves once the page has been
 *   deleted. Before it deletes itself, it checks and removes any dependencies,
 *   such as characters and active characters.
 */

PageSchema.methods.delete = async function () {
  const char = await Character.findOne({ page: this._id }).populate('player')
  if (char?.player) await char.player.releaseCharacter(char._id)
  await this.constructor.findByIdAndDelete(this._id)
}

/**
 * Return a Page document that has a given path.
 * @param {string} url - The requesting URL.
 * @returns {*} - A Promise that returns with the result of the query.
 */

PageSchema.statics.findByPath = function (url) {
  const parts = url.split('/')
  const path = parts[0] === '' ? parts[1] : parts[0]
  return this.findOne({ path }).populate('categories.category')
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
  if (!c || !c._id) return null
  return c.findMembers()
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

/**
 * Returns the URL for the first file attached to a Page with the given title.
 * @param {string} title - The Page title to find.
 * @returns {Promise<string|undefined>} - The URL of the first file attached to
 *   a Page with the given title if one could be found, or `undefined` if no
 *   such Page could be found, or if no such Page documents have a file.
 */

PageSchema.statics.getFile = async function (title) {
  const page = await this.findByTitle(title)
  if (page?.file?.url) return page.file.url
  const withFiles = page.filter(p => p.file.url)
  return withFiles.length > 0 ? withFiles[0].file.url : undefined
}

module.exports = model('Page', PageSchema)
