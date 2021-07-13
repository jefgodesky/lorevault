const { Schema, model } = require('mongoose')

const UserSchema = new Schema({
  googleID: String
})

module.exports = model('User', UserSchema)
