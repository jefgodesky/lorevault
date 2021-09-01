import { unified } from 'unified'
import markdown from 'remark-parse'
import gfm from 'remark-gfm'
import sectionize from 'remark-sectionize'
import remark2rehype from 'remark-rehype'
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
  const render = await unified()
    .use(markdown)
    .use(gfm)
    .use(sectionize)
    .use(remark2rehype)
    .use(slugger)
    .use(linkHeadings)
    .use(prettify)
    .use(rehypeStringify)
    .process(str)
  return String(render)
}

export default renderMarkup
