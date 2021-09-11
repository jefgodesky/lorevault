import axios from 'axios'
import Page from '../models/page.js'
import { getReadableFileSize } from '../utils.js'
import config from '../config/index.js'

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
 * Render the page's image.
 * @param {Page} page - The page being rendered.
 * @returns {string} - The rendered <img> tag for the page's image.
 */

const getImage = page => `<img src="${page.file.url}" alt="${page.title} />`

/**
 * Return an HTML string for an <svg> tag filled with the contents of the
 * page's SVG file.
 * @param {Page} page - The page being rendered.
 * @returns {Promise<string|any>} - The rendered SVG file, or `null` if
 *   something went wrong.
 */

const getSVG = async page => {
  try {
    const res = await axios.get(page.file.url)
    if (res.status !== 200 || res.headers['content-type'] !== 'image/svg+xml') return ''
    return res.data.substr(0, 6) === '<?xml '
      ? res.data.substr(res.data.indexOf('<', 1))
      : res.data
  } catch {
    return null
  }
}

/**
 * Render the page's audio file.
 * @param {Page} page - The page being rendered.
 * @returns {string} - The rendered markup for the page's audio file.
 */

const getAudio = page => {
  const notSupported = '<p>Your browser does not support the HTML <code>audio</code> element.</p>'
  const audio = `<audio controls src="${page.file.url}" />`
  const caption = `<figcaption>${page.title}</figcaption>`
  const inside = [caption, audio, notSupported].join('\n')
  return `<figure class="audio">\n${inside}\n</figure>`
}

/**
 * Render the page's video file.
 * @param {Page} page - The page being rendered.
 * @returns {string} - The rendered markup for the page's video file.
 */

const getVideo = page => {
  const notSupported = '<p>Your browser does not support the HTML <code>video</code> element.</p>'
  const src = `<source src="${page.file.url} type="${page.file.mimetype}" />`
  const inside = [src, notSupported].join('\n')
  return `<video controls>\n${inside}\n</video>`
}

/**
 * Render the page's generic download.
 * @param {Page} page - The page being rendered.
 * @returns {string} - The rendered markup for the page's file download link.
 */

const getDownload = page => {
  const heading = `<span class="name">${page.title}</span>`
  const details = `<small>${page.file.url}; ${getReadableFileSize(page.file.size)}</small>`
  const inside = [heading, details].join('\n')
  return `<a href="${page.file.url}" class="download">\n${inside}\n</a>`
}

/**
 * Render the page's file.
 * @param {Page} page - The page being rendered.
 * @returns {Promise<string|null>} - The rendered HTML string for the page's
 *   file, or `null` if the page does not have a file.
 */

const getFile = async (page) => {
  if (!page.file) return null
  const display = Object.keys(config.fileDisplay).includes(page.file.mimetype)
    ? config.fileDisplay[page.file.mimetype]
    : 'Download'
  switch (display) {
    case 'Image': return getImage(page)
    case 'SVG': return getSVG(page)
    case 'Audio': return getAudio(page)
    case 'Video': return getVideo(page)
    default: return getDownload(page)
  }
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
  const version = params?.version ? viewOpts.page.getVersion(params.version) : null
  viewOpts.title = viewOpts.page.title
  viewOpts.page.markup = await viewOpts.page.render(user, version || viewOpts.page.getCurr())
  viewOpts.categories = await getCategories(viewOpts.page, user)
  viewOpts.file = await getFile(viewOpts.page)
  return next()
}

export default getPage
