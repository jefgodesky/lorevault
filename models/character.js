import mongoose from 'mongoose'
const { Schema, model } = mongoose

import config from '../config/index.js'

/**
 * Adds character sheet statistics from the games specified in the
 * configuration file to the given schema definition.
 * @param {object} def - The starting schema definition.
 * @returns {Promise<object>} - The original schema definition, with properties
 *   added for the games specified in the configuration file and the character
 *   sheet statistics used by each.
 */

const addGames = async def => {
  for (const game of config.games) {
    const { info } = await import(`../games/${game}/${game}.js`)
    def[game] = {}
    for (const stat of info.sheet) {
      def[game][stat.id] = {
        type: stat.type,
        default: stat.default
      }
    }
  }
  return def
}

const CharacterSchema = new Schema(await addGames({
  page: {
    type: Schema.Types.ObjectId,
    ref: 'Page'
  },
  player: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}))

export default model('Character', CharacterSchema)
