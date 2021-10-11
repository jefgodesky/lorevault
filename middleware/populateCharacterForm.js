import Character from '../models/character.js'
import { loadGames } from '../utils.js'

/**
 * Express.js middleware that reads through the games listed in the
 * configuration and adds the data necessary to render the forms for those
 * games.
 * @param {object} req - The Express.js request object.
 * @param {object} res - The Express.js response object.
 * @param {function} next - The next function to call.
 * @returns {Promise<void>} - A Promise that resolves when the viewOpts object
 *   is ready.
 */

const populateCharacterForm = async (req, res, next) => {
  const character = req.params?.id ? await Character.findById(req.params.id).populate('page') : undefined
  req.viewOpts.character = character
  req.viewOpts.games = {}
  const games = await loadGames()
  for (const game of Object.keys(games)) {
    const { info, characterForm } = games[game]
    req.viewOpts.games[game] = {
      name: info.edition ? `<em>${info.name}</em> (${info.edition})` : `<em>${info.name}</em>`,
      stats: characterForm(character)
    }
  }
  next()
}

export default populateCharacterForm
