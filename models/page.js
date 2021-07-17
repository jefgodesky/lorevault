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
 * Return a Page document that has a given path.
 * @param {string} url - The requesting URL.
 * @returns {*} - A Promise that returns with the result of the query.
 */

PageSchema.statics.findByPath = function (url) {
  const parts = url.split('/')
  const path = parts[0] === '' ? parts[1] : parts[0]
  return this.findOne({ path })
}

module.exports = model('Page', PageSchema)
