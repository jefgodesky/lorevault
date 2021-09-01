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
 * Render Markdown to HTML.
 * @param {string} str - A string of Markdown text.
 * @returns {Promise<string>} - The original string `str` rendered to HTML.
 */

const renderMarkup = async str => {
  const schema = deepmerge(defaultSchema, {
    attributes: {
      '*': ['class']
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
  return String(render)
}

export default renderMarkup
