const { Schema, model } = require('mongoose')

const UserSchema = new Schema({
  auth: {
    google: String
  }
})

module.exports = model('User', UserSchema)
