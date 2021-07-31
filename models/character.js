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

/**
 * Return all of a user's characters.
 * @param {User|Schema.Types.ObjectID} user - The user (or the ID of the user)
 *   whose characters you wish to return.
 * @returns {Promise<Character[]>} - A Promise tht resolves with the user's
 *   characters.
 */

CharacterSchema.statics.getCharacters = async function (user) {
  const id = user._id ? user._id : user
  return this.find({ player: id }).populate('page')
}

module.exports = model('Character', CharacterSchema)
