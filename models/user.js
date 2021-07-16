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
 * Checks if removing the given service would leave the user without any OAuth
 * services with which to log in.
 * @param {string} service - The service to consider.
 * @returns {boolean} - `true` if removing the given service would leave the
 *   user without any OAuth services with which to log in, or `false` if hen
 *   will still be able to log in after removing it.
 */

UserSchema.methods.isLastConnection = function (service) {
  const keys = {
    google: 'googleID',
    discord: 'discordID'
  }
  const cpy = JSON.parse(JSON.stringify(this))
  delete cpy[keys[service]]
  const all = Object.values(keys).map(key => Boolean(cpy[key]))
  return !all.reduce((acc, curr) => acc || curr, false)
}

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
 * Select a character as the user's active character.
 * @param {{ _id: ObjectId|string}|string} char - Either an object which has an
 *   `_id` property that can be cast into a string, or a string itself. This is
 *   used to identify the character to select by ID.
 * @returns {Promise<void>} - A Promise that resolves when the user document
 *   has been updated to set the selected character as hens active character,
 *   and then saved to the database. This method does nothing if it can't find
 *   a character in the user's characters array that matches the argument
 *   provided.
 */

UserSchema.methods.selectCharacter = async function (char) {
  const id = char._id?.toString() || char.toString()
  const filtered = this.characters.filter(c => c._id.toString() === id)
  console.log(filtered)
  if (filtered.length > 0) {
    this.active = filtered[0]
    await this.save()
  }
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
