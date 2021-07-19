const { Remarkable } = require('remarkable')
const slugify = require('slugify')
const Page = require('../models/page')

/**
 * Parses a Markdown string to HTML.
 * @param {string} str - The string to be parsed.
 * @returns {string} - The parsed string.
 */

const markdown = str => {
  const md = new Remarkable({
    html: true,
    xhtmlOut: true,
    typographer: true
  })
  return md.render(str)
}

/**
 * Parses wiki links into HTML links going to the appropriate URLs.
 * @param {string} str - The string to be parsed.
 * @returns {Promise<string>} - A Promise that resolves once all of the links
 *   in the string have been rendered, and the string parsed.
 */

const parseLinks = async str => {
  const matches = str.match(/\[\[(.*?)\]\]/gm)
  for (const match of matches) {
    const inside = match.substr(2, match.length - 4)
    const parts = inside.split('|')
    const res = parts[0].trim().startsWith('/')
      ? await Page.findByPath(parts[0].trim().substr(1))
      : await Page.findByTitle(parts[0].trim())
    const page = res._id ? res : res.length > 0 ? res[0] : null
    const others = parts.length > 1 ? parts.slice(1) : parts
    const text = others.join('|').trim()
    if (page) {
      str = str.replace(match, `<a href="/${page.path}">${text}</a>`)
    } else {
      str = str.replace(match, `<a href="/${slugify(parts[0]).toLowerCase()}" class="new">${text}</a>`)
    }
  }
  return str
}

/**
 * If any HTML links appear in the given string in the middle of a word, this
 * function returns a new version of the string with all such links extended to
 * wrap around the word. For example, `<a href="/">save</a>d` becomes
 * `<a href="/">saved</a>`.
 * @param {string} str - The string to parse.
 * @returns {string} - The original string with any links that appear in the
 *   middle of words extended to wrap around the word.
 */

const wrapLinks = str => {
  const matches = str.match(/<a (.*?)>(.*?)<\/a>([a-zA-Z]+)?/gm)
  for (const match of matches) {
    str = str.replace(match, `${match.replace('</a>', '')}</a>`)
  }
  return str
}

/**
 * Parse a string to HTML.
 * @param {string} str - The string to parse.
 * @returns {Promise<string>} - A Promise that resolves with the parsed HTML.
 */

const parse = async str => {
  str = await parseLinks(str)
  str = wrapLinks(str)
  return markdown(str)
}

module.exports = parse