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

const serviceKeys = {
  google: 'googleID',
  discord: 'discordID'
}

/**
 * Checks if removing the given service would leave the user without any OAuth
 * services with which to log in.
 * @param {string} service - The service to consider.
 * @returns {boolean} - `true` if removing the given service would leave the
 *   user without any OAuth services with which to log in, or `false` if hen
 *   will still be able to log in after removing it.
 */

UserSchema.methods.isLastConnection = function (service) {
  const cpy = JSON.parse(JSON.stringify(this))
  delete cpy[serviceKeys[service]]
  const all = Object.values(keys).map(key => Boolean(cpy[key]))
  return !all.reduce((acc, curr) => acc || curr, false)
}

/**
 * Removes a connection from the user record, but only if it is not the last
 * connection that the user has left.
 * @param {string} service - The service to disconnect.
 * @returns {Promise<boolean>} - A Promise that resolves with `false` if the
 *   service could not be disconnected (when it's the last remaining connection
 *   that the user has), or `true` when it's been successfully disconnected and
 *   the user document has been successfully saved.
 */

UserSchema.methods.disconnect = async function (service) {
  if (this.isLastConnection(service)) return false
  const keys = {
    google: 'googleID',
    discord: 'discordID'
  }
  delete this[serviceKeys[service]]
  await this.save()
  return true
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
