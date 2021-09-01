import smartquotes from 'smartquotes'
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
 * Add a content update to the page's versions and then save the page.
 * @param {object} content - An object containing the content to be added as
 *   the new version.
 * @param {string} content.title - The title of the new page document version.
 * @param {string} content.body - The body of the new page document version.
 * @param {User|Schema.Types.ObjectID|string} editor - Either a User document,
 *   or the ID of a user. This is the person making the update.
 * @returns {Promise<void>} - A Promise that resolves once the update has been
 *   made and the Page document saved to the database.
 */

PageSchema.methods.update = async function (content, editor) {
  content.title = smartquotes(content.title)
  content.body = smartquotes(content.body)
  this.title = content.title
  this.versions.push(Object.assign({}, content, { editor: editor._id }))
  await this.save()
}

export default model('Page', PageSchema)
