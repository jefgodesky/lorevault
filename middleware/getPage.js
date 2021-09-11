import Page from '../models/page.js'

/**
 * Express.js middleware that finds the page identified by the request path,
 * loads it from the database, and renders it.
 * @param {object} req - The Express.js request object.
 * @param {object} res - The Express.js response object.
 * @param {function} next - The next function to call.
 * @returns {Promise<*>} - A Promise that resolves once any page indicated by
 *   the original URL has been loaded and parsed.
 */

const getPage = async (req, res, next) => {
  const { params, originalUrl, user, viewOpts } = req
  if (!viewOpts.page) viewOpts.page = await Page.findByIdDiscreetly(req.body?.pageID, user)
  if (!viewOpts.page) viewOpts.page = await Page.findByPath(originalUrl, user)
  if (!viewOpts.page) return next()
  const version = params?.version ? viewOpts.page.getVersion(params.version) : null
  viewOpts.title = viewOpts.page.title
  viewOpts.page.markup = await viewOpts.page.render(user, version || viewOpts.page.getCurr())
  viewOpts.categories = await viewOpts.page.getCategories(user)
  viewOpts.categories.forEach(cat => {
    cat.render = Boolean(cat.path)
      ? `<a href="/${cat.path}">${cat.title.startsWith('Category:') ? cat.title.substring(9) : cat.title}</a>`
      : `<a href="/create?title=${encodeURIComponent(`Category:${cat.title}`)}" class="new">${cat.title}</a>`
  })
  return next()
}

export default getPage
