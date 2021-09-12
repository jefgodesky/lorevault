import mongoose from 'mongoose'
const { model } = mongoose
import { match } from '../utils.js'

/**
 * Render the images and files called for in a string.
 * @param {string} str - The string being rendered.
 * @returns {Promise<string>} - A Promise that resolves with a modified version
 *   of the string provided, where each call to a file or image that maps to
 *   a real file or image page has been replaced with the properly rendered
 *   file or image.
 */

const renderFiles = async (str) => {
  const Page = model('Page')
  const matches = match(str, /\[\[(File:|Image:)((\n|\r|.)*?)\]\]/m)
  if (!matches) return str
  for (const m of matches) {
    const elems = m.str.match(/\[\[(File:|Image:)(.*?)(\|(.*?))?\]\]/)
    if (!elems || elems.length < 4) continue
    const page = await Page.findOneByTitle(`${elems[1]}${elems[2]}`)
    if (!page) continue
    const params = elems[4] ? elems[4].split('|').map(el => el.trim()) : []
    const text = params.length > 0 ? params[0] : elems[2]
    const markup = await page.renderFile(text)
    str = str.replace(m.str, markup)
  }
  return str
}

export default renderFiles
