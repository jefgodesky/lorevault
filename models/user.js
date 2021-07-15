const { Schema, model } = require('mongoose')
const { rules } = require('../config')

const CharacterSchemaDefinition = {
  name: String
}

for (const system of rules) {
  const orig = require(`../rules/${system}/sheet`)
  CharacterSchemaDefinition[system] = {}
  for (const stat of Object.keys(orig)) {
    CharacterSchemaDefinition[system][stat] = orig[stat].type
  }
}

const CharacterSchema = new Schema(CharacterSchemaDefinition)

const UserSchema = new Schema({
  googleID: String,
  discordID: String,
  characters: [CharacterSchema],
  active: CharacterSchema
})

UserSchema.methods.addCharacter = async function (char) {
  if (this.characters.length === 0) this.active = char
  this.characters.push(char)
  await this.save()
}

module.exports = model('User', UserSchema)
