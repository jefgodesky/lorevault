import mongoose from 'mongoose'
const { Schema, model } = mongoose

const UserSchema = new Schema({
  name: String,
  login: {
    google: String,
    discord: String
  },
  pov: {
    type: String,
    enum: ['Anonymous', 'Character', 'Loremaster'],
    default: 'Anonymous'
  },
  characters: {
    active: {
      type: Schema.Types.ObjectId,
      ref: 'Character'
    },
    list: [{
      type: Schema.Types.ObjectId,
      ref: 'Character'
    }]
  }
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
  const { login } = this
  const services = Object.keys(login)
  const connections = services.filter(s => login[s] && typeof login[s] === 'string' && s !== service)
  return connections.length === 0
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
  this.login[service] = undefined
  await this.save()
  return true
}

/**
 * Claims a character for the user.
 * @param {Page|Schema.Types.ObjectId|string} page - The page for the character
 *   to be claimed (or its ID, or the string representation of its ID).
 * @param {{}} stats - An object with properties defining the values for the
 *   character's statistics in the games defined in the configuration. For
 *   example, `dnd5e-int` should provide the character's `int` statistic as
 *   defined by the game `dnd5e`.
 * @returns {Promise<boolean>} - A Promise that resolves with `false` if the
 *   character could not be claimed (e.g., it's already been claimed by someone
 *   else), or `true` once it's been claimed and added to your own characters
 *   (and designated as your active character if you did not yet have one).
 */

UserSchema.methods.claim = async function (page, stats) {
  const Character = model('Character')
  const claimed = await Character.isClaimed(page)
  if (claimed) return false
  const char = await Character.create(page, this, stats)
  this.characters.list.addToSet(char)
  this.characters.active = this.characters.active || char
  if (this.pov === 'Anonymous') this.pov = 'Character'
  return true
}

/**
 * Returns the user's current point of view (POV).
 * @returns {Character|string} - The string `Anonymous` if that's the user's
 *   current point of view, or the string `Loremaster` if that is, or the
 *   user's active character, if hens current point of view is "Character."
 */

UserSchema.methods.getPOV = function () {
  const selfDescriptive = [ 'Anonymous', 'Loremaster' ]
  if (selfDescriptive.includes(this.pov)) return this.pov
  return this.characters.active
}

/**
 * Release your claim on a character.
 * @param {Character|Schema.Types.ObjectId|string} char - The character that
 *   you would like to release (or its ID, or the string representation of
 *   its ID).
 * @returns {Promise<boolean>} - A Promise that resolves with your account once
 *   the character record has been deleted, removed from your account, and all
 *   changes have been saved to the database.
 */

UserSchema.methods.release = async function (char) {
  const _id = char?._id || char
  if (this.characters.active._id.toString() === _id.toString()) this.characters.active = undefined
  this.characters.list.pull({ _id })

  const inactive = this.characters.active === undefined
  const noCharacters = this.characters.list.length < 1
  const hasCharacterPOV = this.pov === 'Character'
  if (inactive && !noCharacters) this.characters.active = this.characters.list[0]
  if (inactive && noCharacters && hasCharacterPOV) this.pov = 'Anonymous'

  const Character = model('Character')
  await Character.deleteOne(_id)

  await this.save()
  return this
}

export default model('User', UserSchema)
