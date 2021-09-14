import dayjs from 'dayjs'

/**
 * Wrapper for dayjs's format() method.
 * @param {Date} date - The Date object to be formatted.
 * @param {string} format - The format to use.
 * @returns {string} - The formatted date.
 */

const formatDate = (date, format) => {
  const d = dayjs(date)
  return d.format(format)
}

/**
 * If the string beings with "Category:", return the substring that follows
 * after that. If not, return the string unchanged.
 * @param {string} str - The string to process.
 * @returns {string} - The string with the starting substring "Category:"
 *   removed (if it was present to begin with).
 */

const hideCategory = str => {
  return str.startsWith('Category:') ? str.substr(9) : str
}

export default {
  formatDate,
  hideCategory
}
