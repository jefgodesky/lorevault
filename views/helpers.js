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

export {
  formatDate
}
