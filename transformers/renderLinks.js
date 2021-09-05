import mongoose from 'mongoose'
const { model } = mongoose
import { match, isInSecret } from '../utils.js'

/**
 * Parse links from string.
 * @param {string} str - The string to parse.
 * @param {{}} secrets - The secrets parsed from the string. Generally, this
 *   object should be produced by running `parseSecrets` on `str`.
 * @param {User} renderer - The person we're parsing for.
 * @returns {Promise<{str: string, links: object}>} - A Promise that resolves
 *   with an object with two properties: `str`, which provides the updated
 *   version of the original string with all links within it parsed out, and
 *   `links`, which is an array of objects providing information about the
 *   links that were rendered. Each of the objects in this array has the
 *   following properties:
 *     `page`    Either the Page document that was being linked to, or `null`
 *               if no Page could be found that matched the link.
 *     `title`   The title of the Page document being linked to, or the text
 *               of the link if no Page could be found. This is an appropriate
 *               value for a link's `title` property.
 *     `text`    The text of the link, which could be the same as the title, or
 *               an alias parsed from the link.
 *     `secret`  If the link appears inside of a secret, this property provides
 *               the codename of that secret. If not, this is `null`.
 */

const renderLinks = async (str, secrets, renderer) => {
  const Page = model('Page')
  const matches = match(str, /\[\[(?!Category:|File:|Image:)((\n|\r|.)*?)\]\]/m)
  const links = await Promise.all(matches.map(async m => {
    const inside = m.str.substring(2, m.str.length - 2)
    const index = inside.indexOf('|')
    const rawTitle = index < 0 ? inside : inside.substring(0, index)
    const title = rawTitle.startsWith(':') ? rawTitle.substring(1) : rawTitle
    const text = index < 0 ? title : inside.substring(index + 1)
    const page = await Page.findOneByTitle(title, renderer)
    const secret = isInSecret(m, str)
    const markup = page
      ? `<a href="/${page.path}" title="${page.title}">${text}</a>`
      : `<a href="/create?title=${encodeURIComponent(rawTitle.trim())}" class="new">${text}</a>`
    str = str.replace(m.str, markup)
    return { page, title, text, secret }
  }))
  return { str, links }
}

export default renderLinks
