import Page from '../models/page.js'
import Character from '../models/character.js'

/**
 * Express.js middleware for processing the character form, whether to create a
 * new character or to edit an existing one.
 * @param {object} req - The Express.js request object.
 * @param {object} res - The Express.js response object.
 * @param {function} next - The next function to call.
 * @returns {Promise<*>} - A Promise that resolves when the character form has
 *   been processed. This could mean redirecting to a new page, or adding
 *   errors to the `req.viewOpts` object and proceeding to the next function.
 */

const processCharacterForm = async (req, res, next) => {
  const { user } = req
  if (!user) return res.redirect('/')

  const page = await Page.findByPath(req.body.path)
  if (!page) {
    req.viewOpts.errors = { path: `<code>${req.body.path}</code> is not a path for any page on this wiki.` }
    return next()
  }

  const character = await Character.findOne({ page: page._id })
  if (character && character.player.toString() !== req.user._id.toString()) {
    req.viewOpts.errors = { path: `${page.title} has already been claimed as a character by someone else.` }
    return next()
  }

  const tags = req.body?.tags?.split(/[,;]/).map(el => el.trim()) || []
  if (character) {
    await character.update(character.page, character.player, req.body, tags)
  } else {
    await user.claim(page, req.body, tags)
  }

  res.redirect('/profile')
}

export default processCharacterForm
