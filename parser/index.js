const { Remarkable } = require('remarkable')
const HeaderIdsPlugin = require('remarkable-header-ids')
const slugify = require('slugify')
const Page = require('../models/page')
const { getSVG } = require('../utils')

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
    /\[\[Type:(.*?)\]\](\r|\n)*/gm,
    /\[\[Category:(.*?)\]\](\r|\n)*/gm
  ]
  for (const tag of tags) str = str.replace(tag, '')
  return str
}

/**
 * Parse an array of elements into a readable set of parameters. The simplest
 * way to pass a parameter is as a simple string. These are placed in the
 * `ordered` array in the order that they are given. You can also assign a
 * parameter to a name, in the form `key=value`. If you provide a string that
 * can be parsed into an integer as the key (e.g., `1` or `2`, but not `one` or
 * `two`), the element will be placed into the `ordered` array at that
 * position. Note that this *can* override a previously-given paramter, such
 * that `first|0=second` will return an `ordered` array of `['second']`.
 * @param {string[]} elems - An array of strings to parse into readable
 *   parameters.
 * @returns {{ordered: *[], named: {}}} - An object presenting readable
 *   parameters. The `ordered` array presents the ordered array of parameters
 *   received, while the `named` object presents a dictionary of the key/value
 *   pairs that were passed as parameters.
 */

const parseTemplateParam = elems => {
  const params = {
    ordered: [],
    named :{}
  }

  for (const elem of elems) {
    const pair = elem.split('=')
    if (pair.length === 1) {
      params.ordered.push(elem)
    } else if (pair.length > 1) {
      const num = parseInt(pair[0])
      if (isNaN(num)) {
        params.named[pair[0]] = pair[1]
      } else if (num > -1) {
        params.ordered[num - 1] = pair[1]
      } else {
        params.ordered.push(pair[1])
      }
    }
  }

  return params
}

/**
 * Parse templates.
 * @param {string} str - The string to be parsed.
 * @returns {Promise<string>} - A Promise that resolves once all of the
 *   templates invoked by the string have been parsed, with the original
 *   string with all template invocations replaced by their appropriate
 *   content.
 */

const parseTemplates = async str => {
  const matches = str.match(/{{((\n|\r|.)*?)}}/gm)
  if (!matches) return str
  for (const match of matches) {
    const elems = match.substr(2, match.length - 4).split('|').map(el => el.trim())
    const name = elems.length > 0 ? elems[0] : null
    const params = elems.length > 1 ? parseTemplateParam(elems.slice(1)) : { ordered: [], named: {} }
    if (!name) continue
    const tpl = await Page.findByTitle(name, 'Template')
    if (!tpl) continue
    str = str.replace(match, tpl.parseTemplate(params))
  }
  return parseTemplates(str)
}

/**
 * Parse out image tags and replace them with rendered HTML image tags.
 * @param {string} str - The string to parse.
 * @returns {Promise<string>} - A Promise that resolves with the original
 *   string, but with all image tags parsed and rendered to HTML image tags.
 */

const parseImages = async str => {
  const matches = str.match(/\[\[(Image|File):((\n|\r|.)*?)\]\]/gm)
  if (!matches) return str
  for (const match of matches) {
    const elems = match.substr(2, match.length - 4).split('|').map(el => el.trim())
    const name = elems.length > 0 ? elems[0] : null
    const page = await Page.findByTitle(name, 'Image file')
    if (!page) continue
    const { url } = page.file
    const alt = elems.length > 1 ? elems[1] : name
    let parsed = `<img src="${url}" alt="${alt}" />`
    if (page.types.includes('SVG image')) {
      const svg = await getSVG(url)
      if (svg !== '') parsed = svg
    }
    str = str.replace(match, parsed)
  }
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
 * For any block-level tags (e.g., `img`, `figure`, `div`, etc.) that
 * Remarkable may have wrapped inside paragraph (`p`) tags, this method
 * returns a copy of the string with those tags unwrapped from their paragraph
 * tag wrappers.
 * @param {string} str - The string to parse.
 * @returns {string} - A copy of the original string (`str`) with any
 *   block-level tags unwrapped from their paragraph (`p`) tag parents.
 */

const unwrapTags = str => {
  const tags = [
    /<p><img(\r|\n|.)*?><\/p>/gmi,
    /<p><div(\r|\n|.)*?>(\r|\n|.)*?<\/div><\/p>/gmi,
    /<p><figure(\r|\n|.)*?>(\r|\n|.)*?<\/figure><\/p>/gmi,
    /<p><section(\r|\n|.)*?>(\r|\n|.)*?<\/section><\/p>/gmi,
    /<p><aside(\r|\n|.)*?>(\r|\n|.)*?<\/aside><\/p>/gmi,
  ]

  for (const tag of tags) {
    const matches = str.match(tag)
    if (!matches) continue
    for (const match of matches) {
      str = str.replace(match, match.substr(3, match.length - 7))
    }
  }

  return str
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
  const templatedStr = await parseTemplates(detaggedStr)
  const imagedStr = await parseImages(templatedStr)
  const linkedStr = await parseLinks(imagedStr)
  const wrappedStr = wrapLinks(linkedStr)
  const markedStr = markdown(wrappedStr)
  const unwrappedStr = unwrapTags(markedStr)
  return restoreBlocks(unwrappedStr, blocks)
}

module.exports = parse