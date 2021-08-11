const Page = require('../models/page')
const parse = require('../parser')

/**
 * Given an array of elements, each with a `title` property, this method
 * returns an object with properties named for each of the letters of the
 * alphabet that any of the titles in the original array begin with. Each
 * property is an array of the elements with titles that begin with that
 * letter. This is used to break a category's pages and subcategories into
 * a series of lists, used to display those members that begin with each
 * letter.
 * @param {{title: string}[]} arr - An array of elements, each with a `title`
 *   property to be sorted by.
 * @returns {{}} - An object with properties named for each of the letters of
 *   the alphabet that any of the titles in the original array begin with. Each
 *   property is an array of the elements from the original array with titles
 *   that begin with that letter.
 */

const sortAlphabetically = arr => {
  const obj = {}
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
  for (const letter of alphabet) {
    const members = arr.filter(el => el.title.substr(0, 1).toLowerCase() === letter)
    if (members.length > 0) obj[letter] = members
  }
  return obj
}

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
    req.viewOpts.subcategories = subcategories.length > 25 ? sortAlphabetically(subcategories) : subcategories
    req.viewOpts.pages = pages.length > 25 ? sortAlphabetically(pages) : pages
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
