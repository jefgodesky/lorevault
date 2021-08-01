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
  const page = await Page.findByPath(req.originalUrl)
  if (!page) return next()
  req.viewOpts.page = page
  req.viewOpts.markup = await parse(page.body)
  const pageIsClaimable = await page.isClaimable()
  req.viewOpts.claimable = req.user?.charClaimMode === true && pageIsClaimable

  // Populate categories
  req.viewOpts.categories = []
  for (const id of page.categories) {
    const category = await Page.findById(id)
    req.viewOpts.categories.push({
      title: category.title,
      path: category.path
    })
  }

  // Add special category data
  if (req.viewOpts.page.types.includes('Category')) {
    const { subcategories, pages } = await Page.findCategoryMembers(req.viewOpts.page.title)
    req.viewOpts.subcategories = subcategories
    req.viewOpts.pages = pages
  }

  // Carry on to next middleware
  next()
}

module.exports = renderPage
