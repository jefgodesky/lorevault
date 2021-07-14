const { Schema, model } = require('mongoose')

const CorePageSchemaDefinition = {
  title: String,
  body: String
}

const VersionSchema = new Schema(Object.assign({}, CorePageSchemaDefinition, {
  msg: String,
  timestamp: Date,
  editor: Schema.Types.ObjectId
}))

const PageSchema = new Schema(Object.assign({}, CorePageSchemaDefinition, {
  created: Date,
  modified: Date,
  versions: [VersionSchema]
}))

module.exports = model('Page', PageSchema)
