import mongoose from 'mongoose'
const { Schema, model } = mongoose

const UserSchema = new Schema({
  name: String,
  login: {
    google: String,
    discord: String
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

export default model('User', UserSchema)
