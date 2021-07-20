const { Remarkable } = require('remarkable')
const HeaderIdsPlugin = require('remarkable-header-ids')
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
  md.use(HeaderIdsPlugin({ headerId: slug => `heading-${slug}` }))
  return md.render(str)
}

/**
 * Remove tags from the string to be parsed. They're just for internal use, not
 * for final rendering.
 * @param {string} str - The string from which tags are to be removed.
 * @returns {string} - The original string, but with all tags removed.
 */

const detag = str => {
  const tags = [
    /\[\[Type:(.*?)\]\](\r|\n)*/gm
  ]
  for (const tag of tags) str = str.replace(tag, '')
  return str
}

/**
 * Parses wiki links into HTML links going to the appropriate URLs.
 * @param {string} str - The string to be parsed.
 * @returns {Promise<string>} - A Promise that resolves once all of the links
 *   in the string have been rendered, and the string parsed.
 */

const parseLinks = async str => {
  const matches = str.match(/\[\[(.*?)\]\]/gm)
  if (!matches) return str
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
      str = str.replace(match, `<a href="/${page.path}" title="${page.title}">${text}</a>`)
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
  if (!matches) return str
  for (const match of matches) {
    str = str.replace(match, `${match.replace('</a>', '')}</a>`)
  }
  return str
}

/**
 * Remove code blocks from the string, so that we don't parse links or
 * templates contained within them.
 * @param {string} str - The string to parse.
 * @returns {{blockedStr: string, blocks: string[]}} - An object with two
 *   properties: `blockedStr`, containing the `str` with all code blocks
 *   removed, and `blocks`, an array of strings of the blocks removed.
 */

const removeBlocks = str => {
  let blockedStr = str
  const b = str.match(/```(\r|\n|.)*?```/gm)
  const blocks = b ? b.map(b => b.substr(3, b.length - 6)) : []
  blocks.forEach((block, index) => {
    const placeholder = `<!-- BLOCK${index} -->`
    blockedStr = blockedStr.replace(`\`\`\`${block}\`\`\``, placeholder)
  })
  return { blockedStr, blocks }
}

/**
 * Restores blocks removed by `removeBlocks` to the string.
 * @param str {!string} - The string being parsed. This should have been
 *   taken from the `blocked` string returned by `saveBlocks`, perhaps after
 *   further parsing.
 * @param blocks {!string[]} - An array of blocks to restore. This should come
 *   from the `blocks` array returned by `saveBlocks`.
 * @returns {string} - The string with the blocks saved by `saveBlocks`
 *   restored.
 */

const restoreBlocks = (str, blocks) => {
  blocks.forEach((block, index) => {
    const placeholder = `<!-- BLOCK${index} -->`
    str = str.replace(placeholder, `<pre><code>${block}</code></pre>`)
  })
  return str
}

/**
 * Parse a string to HTML.
 * @param {string} str - The string to parse.
 * @returns {Promise<string>} - A Promise that resolves with the parsed HTML.
 */

const parse = async str => {
  let { blockedStr, blocks } = removeBlocks(str)
  const detaggedStr = detag(blockedStr)
  const linkedStr = await parseLinks(detaggedStr)
  const wrappedStr = wrapLinks(linkedStr)
  const markedStr = markdown(wrappedStr)
  return restoreBlocks(markedStr, blocks)
}

module.exports = parse