import Page from '../models/page.js'

/**
 * Return the sorting for a page's inclusion in a given category.
 * @param {{page: Page, sort: string}} categorization - A categorization
 *   object.
 * @param {string} category - The name of the category.
 * @returns {string|null} - The sorting string for the page's inclusion in the
 *   category provided, if one could be found, or `null` if it could not be.
 */

const getSort = (categorization, category) => {
  const filtered = categorization.page.categories.filter(c => `Category:${c.name}` === category)
  return filtered.length > 0 ? filtered[0].sort : null
}

/**
 * Given an array of elements, each with a `sort` property, this method
 * returns an object with properties named for each of the letters of the
 * alphabet that any of the `sort` properties in the original array began
 * with, each of wich is an array of those objects that have a `sort` property
 * that begins with that letter; as well as a `numbers` property, which is an
 * array of all those objects in which the `sort` property begins with a
 * number; and an `other` property, which is an array of all those objects in
 * which the `sort` property begins with any other character. This is used to
 * break a category's pages and subcategories into a series of lists, used to
 * display those members that begin with each letter.
 * @param {{title: string}[]} arr - An array of elements, each with a `sort`
 *   property to be sorted by.
 * @param {string} category - The name of the category.
 * @returns {{}} - An object with properties named for each of the letters of
 *   the alphabet that any of the titles in the original array begin with, plus
 *   a `numbers` array for those items that begin with numbers, and an `other`
 *   array for those items that begin with other characters.
 */

const alphabetizeMembers = (arr, category) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
  const obj = {}

  // Letters
  for (const letter of alphabet) {
    const members = arr.filter(el => getSort(el, category).substr(0, 1).toLowerCase() === letter)
    if (members.length > 0) obj[letter] = members
  }

  // Numbers
  const numbers = arr.filter(el => !isNaN(parseInt(getSort(el, category).substring(0, 1))))
  if (numbers.length > 0) obj.numbers = numbers

  // Other characters
  const other = arr.filter(el => {
    const sort = getSort(el, category)
    const first = sort?.substring(0, 1).toLowerCase()
    return sort ? !alphabet.includes(first) && isNaN(parseInt(first)) : false
  })
  if (other.length > 0) obj.other = other

  return obj
}

/**
 * Express.js middleware which first checks if the title of the page (or the
 * title given by query parameter) begins with "Category:". If so, it searches
 * for any members of that category. If it finds them, it adds them to the view
 * options object.
 * @param {object} req - The Express.js request object.
 * @param {object} res - The Express.js response object.
 * @param {function} next - The next function to call.
 * @returns {Promise<void>} - A Promise that resolves when any possible members
 *   to the category represented by the title have been found and added to the
 *   view options object.
 */

const getMembers = async (req, res, next) => {
  const alphabetizedThreshold = 10
  const { title } = req.viewOpts
  if (!title?.startsWith('Category:')) return next()
  const { pages, subcategories } = await Page.findMembers(title.substring(9), req.user)
  if (pages.length < 1 && subcategories.length < 1) return next()
  req.viewOpts.category = {
    pages: pages.length < alphabetizedThreshold ? pages : alphabetizeMembers(pages, title),
    subcategories: subcategories.length < alphabetizedThreshold ? subcategories : alphabetizeMembers(subcategories, title)
  }
  return next()
}

export default getMembers
