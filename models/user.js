const { Schema, model } = require('mongoose')

const CharacterSchema = new Schema({
  name: String
})

const UserSchema = new Schema({
  googleID: String,
  discordID: String,
  characters: [CharacterSchema]
})

module.exports = model('User', UserSchema)
