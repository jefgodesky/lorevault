const { Schema, model } = require('mongoose')

const UserSchema = new Schema({
  googleID: String,
  discordID: String
})

module.exports = model('User', UserSchema)
