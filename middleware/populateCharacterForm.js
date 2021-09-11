import Character from '../models/character.js'
import config from '../config/index.js'

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
  for (const game of config.games) {
    const { info } = await import(`../games/${game}/${game}.js`)
    req.viewOpts.games = {}

    req.viewOpts.games[game] = {
      name: info.edition ? `<em>${info.name}</em> (${info.edition})` : `<em>${info.name}</em>`,
      stats: info.sheet.map(stat => {
        const { label, detail, type } = stat
        const id = `${game}-${stat.id}`
        const isNum = type === Number
        const defaultVal = isNum ? 0 : ''
        const val = character ? character[game][stat.id] : req.query ? req.query[stat.id] || defaultVal : defaultVal
        return { id, label, detail, type: isNum ? 'number' : 'text', val }
      })
    }
  }
  next()
}

export default populateCharacterForm
