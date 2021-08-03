const Page = require('../models/page')
const parse = require('../parser')

/**
 * Express.js middleware that adds the secrets from a page that the user should
 * see, given hens current perspective.
 * @param {object} req - The Express.js request object.
 * @param {object} res - The Express.js response object.
 * @param {function} next - The next function to call.
 */

const addKnownSecrets = async (req, res, next) => {
  if (!req.viewOpts.page) req.viewOpts.page = await Page.findByPath(req.originalUrl)
  const { page } = req.viewOpts
  if (!page) return next()

  // Get secrets
  const pov = req.viewOpts.perspective === 'character' ? req.viewOpts.char : req.viewOpts.perspective
  req.viewOpts.secrets = await page.getKnownSecrets(pov)
  for (const secret of req.viewOpts.secrets) {
    secret.markup = await parse(secret.text)
  }

  // Carry on to next middleware
  next()
}

module.exports = addKnownSecrets
