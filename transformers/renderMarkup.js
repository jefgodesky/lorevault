import { unified } from 'unified'
import markdown from 'remark-parse'
import remark2rehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import prettify from 'rehype-format'

/**
 * Render Markdown to HTML.
 * @param {string} str - A string of Markdown text.
 * @returns {Promise<string>} - The original string `str` rendered to HTML.
 */

const renderMarkup = async str => {
  const render = await unified()
    .use(markdown)
    .use(remark2rehype)
    .use(prettify)
    .use(rehypeStringify)
    .process(str)
  return String(render)
}

export default renderMarkup
