const { Schema, model } = require('mongoose')
const Character = require('./character')

const UserSchema = new Schema({
  googleID: String,
  discordID: String,
  charClaimMode: {
    type: Boolean,
    default: false
  },
  perspective: {
    type: String,
    default: 'public'
  },
  activeChar: {
    type: Schema.Types.ObjectId,
    ref: 'Character'
  }
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
  cpy[serviceKeys[service]] = undefined
  const all = Object.values(serviceKeys).map(key => Boolean(cpy[key]))
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
  this[serviceKeys[service]] = undefined
  await this.save()
  return true
}

/**
 * Sets the user's character claim mode flag to true.
 * @returns {Promise<void>} - A Promise that resolves when the user's character
 *   claim mode flag has been set to true, and the document has been saved to
 *   the database.
 */

UserSchema.methods.enterCharClaimMode = async function () {
  this.charClaimMode = true
  await this.save()
}

/**
 * Sets the user's character claim mode flag to false.
 * @returns {Promise<void>} - A Promise that resolves when the user's character
 *   claim mode flag has been set to false, and the document has been saved to
 *   the database.
 */

UserSchema.methods.leaveCharClaimMode = async function () {
  this.charClaimMode = false
  await this.save()
}

/**
 * Toggles the user's character claim mode flag. If it was `false` before, this
 * method will set it to `true`; likewise, if it was `true` before, this method
 * will set it to `false`.
 * @returns {Promise<void>} - A Promise that resolves when the user's character
 *   claim mode flag has been set to the opposite of its previous value, and
 *   the document has been saved to the database.
 */

UserSchema.methods.toggleCharClaimMode = async function () {
  this.charClaimMode = !this.charClaimMode
  await this.save()
}

/**
 * Deletes the character with the given ID. If it's the user's active
 * character, it also updates the user to remove hens active character.
 * @param {Schema.Types.ObjectID} id - The ID of the Character document to
 *   be deleted.
 * @returns {Promise<void>} - A Promise that resolves once the Character
 *   document identified by the given ID has been deleted, and the user's
 *   active character has been removed if it is that character.
 */

UserSchema.methods.releaseCharacter = async function (id) {
  const check = await Character.findOne({ _id: id, player: this._id, })
  if (!check) return false
  if (this.activeChar?.equals(id)) {
    this.activeChar = null
    await this.save()
  }
  await Character.findByIdAndDelete(id)
}

module.exports = model('User', UserSchema)
