const { Schema, model } = require('mongoose')
const { rules } = require('../config')

const UserSchema = new Schema({
  googleID: String,
  discordID: String
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

module.exports = model('User', UserSchema)
