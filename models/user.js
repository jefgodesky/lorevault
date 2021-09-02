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

export default model('User', UserSchema)
