import Page from '../models/page.js'
import { loadGames } from '../utils.js'

/**
 * Fetch categories for rendering the page.
 * @param {Page} page - The page being rendered.
 * @param {User} user - The user we're rendering the page for.
 * @returns {Promise<{title: string, path: string, render: string}[]>} - A
 *   Promise that resolves with an array of objects represneting the categories
 *   that the page belongs to, which the user is privy to. Each object includes
 *   the following properties:
 *     `title`    The name of the category. This does not include the
 *                "Category:" prefix.
 *     `path`     The path to the category page. This is only included if the
 *                category has a page.
 *     `render`   A rendered HTML link to the category.
 */

const getCategories = async (page, user) => {
  const categories = await page.getCategories(user)
  return categories.map(category => Object.assign({}, category, {
    render: Boolean(category.path)
      ? `<a href="/${category.path}">${category.title.startsWith('Category:') ? category.title.substring(9) : category.title}</a>`
      : `<a href="/create?title=${encodeURIComponent(`Category:${category.title}`)}" class="new">${category.title}</a>`
  }))
}

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

  const pov = user?.getPOV()
  if (pov && typeof pov !== 'string') {
    const games = await loadGames()
    for (const game of Object.keys(games)) {
      const { onPageView } = games[game]
      if (onPageView && typeof onPageView === 'function') onPageView(viewOpts.page, pov)
    }
  }

  const version = params?.version ? viewOpts.page.getVersion(params.version) : null
  viewOpts.title = viewOpts.page.title
  viewOpts.page.markup = await viewOpts.page.render(user, version || viewOpts.page.getCurr())
  viewOpts.categories = await getCategories(viewOpts.page, user)
  viewOpts.file = await viewOpts.page.renderFile()
  return next()
}

export default getPage
