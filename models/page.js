const { Schema, model } = require('mongoose')

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

module.exports = model('Page', PageSchema)
