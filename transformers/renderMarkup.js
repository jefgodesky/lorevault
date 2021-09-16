import deepmerge from 'deepmerge'
import { unified } from 'unified'
import markdown from 'remark-parse'
import gfm from 'remark-gfm'
import sectionize from 'remark-sectionize'
import remark2rehype from 'remark-rehype'
import raw from 'rehype-raw'
import sanitize, { defaultSchema } from 'rehype-sanitize'
import slugger from 'rehype-slug'
import linkHeadings from 'rehype-autolink-headings'
import prettify from 'rehype-format'
import rehypeStringify from 'rehype-stringify'

/**
 * If a link is immediately followed by text that would form a continuous word
 * (including an apostrophe), that text is pulled into the link.
 * @param {string} str - The string in which we want to stem our links.
 * @returns {string} - The original string, but with any links stemmed.
 */

const stemLinks = str => {
  const matches = str.match(/<a(.*?)>(.*?)<\/a>[A-Za-z'’]+/gim)
  if (matches) {
    for (const match of matches) {
      const elems = match.match(/<a(.*?)>(.*?)<\/a>([A-Za-z'’]+)/im)
      if (elems.length < 4) continue
      str = str.replace(match, `<a${elems[1]}>${elems[2]}${elems[3]}</a>`)
    }
  }
  return str
}

/**
 * Clean up a string by removing any substring that matches a regular
 * expression, and running it recursively until no matches are found.
 * @param {string} str - The string to clean up.
 * @param {RegExp} regex - The regular expression used to find substrings to
 *   be removed.
 * @returns {string} - The string with all substrings that match the regular
 *   expression `regex` removed.
 */

const recursiveCleanup = (str, regex) => {
  const matches = str.match(regex)
  if (matches) { for (const match of matches) str = str.replace(match, '') }
  return matches && matches.length > 0 ? recursiveCleanup(str, regex) : str
}

/**
 * Render Markdown to HTML.
 * @param {string} str - A string of Markdown text.
 * @returns {Promise<string>} - The original string `str` rendered to HTML.
 */

const renderMarkup = async str => {
  const schema = deepmerge(defaultSchema, {
    attributes: {
      '*': ['className', 'data*'],
    },
    tagNames: ['section', 'aside', 'figure', 'figcaption']
  })
  const render = await unified()
    .use(markdown)
    .use(gfm)
    .use(sectionize)
    .use(remark2rehype, { allowDangerousHtml: true })
    .use(raw)
    .use(sanitize, schema)
    .use(slugger)
    .use(linkHeadings)
    .use(prettify)
    .use(rehypeStringify)
    .process(str)
  let markup = String(render)
  markup = stemLinks(markup)
  markup = recursiveCleanup(markup, /<(.*?)>\s*?<\/\1>/gm) // Remove empty HTML tags
  markup = recursiveCleanup(markup, /<section.*?>\s*?<h(\d).*?>.*?<\/h\1>\s*?<\/section>/gim) // Remove empty sections
  return markup
}

export default renderMarkup
