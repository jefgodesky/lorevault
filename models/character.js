import mongoose from 'mongoose'
const { Schema, model } = mongoose

import { loadGames } from '../utils.js'
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
  const games = await loadGames()
  for (const game of Object.keys(games)) {
    def[game] = {}
    for (const stat of games[game].info.sheet) {
      def[game][stat.id] = {
        type: stat.type,
        default: stat.default
      }
    }
  }
  return def
}

const CharacterSchema = new Schema(await addGames({
  name: String,
  page: {
    type: Schema.Types.ObjectId,
    ref: 'Page'
  },
  player: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [String]
}))

/**
 * Update the character and save hen to the database.
 * @param {Page|Schema.Types.ObjectId|string} page - The character's page
 *   document (or its ID, or the string representation of its ID).
 * @param {User|Schema.Types.ObjectId|string} player - The user who plays this
 *   character (or the user's ID, or the string representing hens ID).
 * @param {{}} stats - An object with properties defining the values for the
 *   character's statistics in the games defined in the configuration. For
 *   example, `dnd5e-int` should provide the character's `int` statistic as
 *   defined by the game `dnd5e`.
 * @param {string[]} [tags = []] - The tags to assign to the character. Any tag
 *   that the character had before that is not included in this array is
 *   removed, and any new tag provided in this array is added. (Default: `[]`)
 * @returns {Promise<Character>} - The Character once it has been created and
 *   saved to the database.
 */

CharacterSchema.methods.update = async function (page, player, stats, tags = []) {
  this.page = page?._id || page
  this.player = player?._id || player
  this.tags = tags

  for (const game of config.games) {
    const { info } = await import(`../games/${game}/${game}.js`)
    for (const stat of info.sheet) {
      const s = stats ? stats[`${game}-${stat.id}`] : null
      const isNum = stat.type === Number
      const isValid = !s ? false : isNum ? !isNaN(parseInt(s)) : true
      if (isValid) this[game][stat.id] = isNum ? parseInt(s) : s
    }
  }

  await this.save()
  return this
}

/**
 * Return the character associated with a given page.
 * @param {Page|Schema.Types.ObjectId|string} page - The page for which you'd
 *   like to find a character record (or its ID, or the string representation
 *   of its ID).
 * @returns {Character|null>} - The character associated with that page, or
 *   `null` if no such character exists.
 */

CharacterSchema.statics.getCharacter = function (page) {
  const Character = model('Character')
  const id = page?._id || page
  if (!id) return null
  return Character.findOne({ page: id }).populate('player')
}

/**
 * Checks to see if the given page belongs to a character. If so, the method
 * returns the user who has claimed that character. If no one has claimed any
 * character associated with this page, the method returns `false`.
 * @param {Page|Schema.Types.ObjectId|string} page - The page for which you'd
 *   like to check for any characters (or its ID, or the string representation
 *   of its ID).
 * @returns {Promise<User|boolean>} - The User who has claimed the character
 *   associated with the given page, or `false` if no such user exists.
 */

CharacterSchema.statics.isClaimed = async function (page) {
  const Character = model('Character')
  const char = await Character.getCharacter(page)
  if (char) return char.player
  return false
}

/**
 * Return an alphabetized list of all tags used by any character.
 * @returns {Promise<any[]>} - A Promise that resolves with an alphabetized,
 *   deduplicated list of all tags used by any character.
 */

CharacterSchema.statics.getAllTags = async function () {
  const Character = model('Character')
  const characters = await Character.find({})
  const all = characters.flatMap(c => c.tags)
  const deduped = [...new Set(all)]
  return deduped.sort((a, b) => a.localeCompare(b))
}

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
 * @param {string[]} [tags = []] - An array of strings with which to tag
 *   this character. (Default: `[]`)
 * @returns {Promise<Character>} - The Character once it has been created and
 *   saved to the database.
 */

CharacterSchema.statics.create = async function (page, player, stats, tags = []) {
  const Page = model('Page')
  const Character = model('Character')
  const fullpage = page?.title ? page : await Page.findById(page)
  const char = new Character()
  if (fullpage?.title) char.name = fullpage.title
  await char.update(page, player, stats, tags)
  return char
}

export default model('Character', CharacterSchema)
