const { Schema, model } = require('mongoose')
const { rules } = require('../config')

const CharacterSchemaDefinition = {
  name: String
}

for (const system of rules) {
  CharacterSchemaDefinition[system] = require(`../rules/${system}/sheet`)
}

const CharacterSchema = new Schema(CharacterSchemaDefinition)

const UserSchema = new Schema({
  googleID: String,
  discordID: String,
  characters: [CharacterSchema]
})

module.exports = model('User', UserSchema)
