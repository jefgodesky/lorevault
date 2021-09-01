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
  }
  versions: [VersionSchema]
})

export default model('Page', PageSchema)
