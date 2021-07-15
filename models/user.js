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

/**
 * Add a character to a user document.
 * @param {CharacterSchemaDefinition} char - The character object to add to the
 *   user document. This object should conform to CharacterSchema.
 * @returns {Promise<void>} - A Promise that resolves when the character has
 *   been added to the user's array, and the user's document has been saved to
 *   the database.
 */

UserSchema.methods.addCharacter = async function (char) {
  if (this.characters.length === 0) this.active = char
  this.characters.push(char)
  await this.save()
}

/**
 * Delete a character from a user document.
 * @param {{ _id: ObjectId|string}|string} char - Either an object which has an
 *   `_id` property that can be cast into a string, or a string itself. This is
 *   used to identify the character to delete by ID.
 * @returns {Promise<void>} - A Promise that resolves when the character has
 *   been removed from the user document, and the user document has been saved
 *   to the database.
 */

UserSchema.methods.deleteCharacter = async function (char) {
  const id = char._id?.toString() || char.toString()
  this.characters = this.characters.filter(c => c._id.toString() !== id)
  await this.save()
}

module.exports = model('User', UserSchema)
