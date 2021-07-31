const { Schema, model } = require('mongoose')
const { rules } = require('../config')

const CharacterSchemaDefinition = {
  page: {
    type: Schema.Types.ObjectId,
    ref: 'Page'
  },
  player: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}

for (const system of rules) {
  const stats = require(`../rules/${system}/sheet`)
  CharacterSchemaDefinition[system] = {}
  for (const stat of Object.keys(stats)) {
    CharacterSchemaDefinition[system][stat] = stats[stat].type
  }
}

const CharacterSchema = new Schema(CharacterSchemaDefinition)

module.exports = model('Character', CharacterSchema)
