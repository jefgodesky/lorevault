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

/**
 * Create a new character.
 * @param {Page|Schema.Types.ObjectId|string} page - The character's page
 *   document (or its ID, or the string representation of its ID).
 * @param {User|Schema.Types.ObjectId|string} player - The user who plays this
 *   character (or the user's ID, or the string representing hens ID).
 * @param {{}} stats - An object with properties defining the values for the
 *   character's statistics in the games defined in the configuration. For
 *   example, `dnd5e-int` should provide the character's `int` statistic as
 *   defined by the game `dnd5e`.
 * @returns {Promise<Character>} - The Character once it has been created and
 *   saved to the database.
 */

CharacterSchema.statics.create = async (page, player, stats) => {
  const Character = model('Character')
  const char = new Character()
  char.page = page?._id || page
  char.player = player?._id || player

  for (const game of config.games) {
    const { info } = await import(`../games/${game}/${game}.js`)
    for (const stat of info.sheet) {
      const s = stats ? stats[`${game}-${stat.id}`] : null
      const isNum = stat.type === Number
      const isValid = !s ? false : isNum ? !isNaN(parseInt(s)) : true
      if (isValid) char[game][stat.id] = isNum ? parseInt(s) : s
    }
  }

  await char.save()
  return char
}

export default model('Character', CharacterSchema)
