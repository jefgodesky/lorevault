const Page = require('../models/page')
const parse = require('../parser')

/**
 * Express.js middleware that loads a page and then prepares the variables
 * necessary to render it.
 * @param {object} req - The Express.js request object.
 * @param {object} res - The Express.js response object.
 * @param {function} next - The next function to call.
 */

const renderPage = async (req, res, next) => {
  if (!req.viewOpts.page) req.viewOpts.page = await Page.findByPath(req.originalUrl)
  const { page } = req.viewOpts
  if (!page) return next()

  const { char, perspective } = req.viewOpts
  await page.checkSecrets(char)
  req.viewOpts.markup = await parse(page.body, page, perspective === 'character' ? char : perspective)
  const pageIsClaimable = await page.isClaimable()
  req.viewOpts.claimable = req.user?.charClaimMode === true && pageIsClaimable

  // Add special category data
  if (req.viewOpts.page.types.includes('Category')) {
    const { subcategories, pages } = await Page.findCategoryMembers(req.viewOpts.page.title)
    req.viewOpts.subcategories = subcategories
    req.viewOpts.pages = pages
  }

  // Get secrets
  const pov = req.viewOpts.perspective === 'character' ? req.viewOpts.char : req.viewOpts.perspective
  req.viewOpts.secrets = await page.getKnownSecrets(pov)
  for (const secret of req.viewOpts.secrets) {
    secret.markup = await parse(secret.text)
  }

  // Carry on to next middleware
  next()
}

module.exports = renderPage
