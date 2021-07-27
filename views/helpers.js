/**
 * Give na Date object, return a formatted string like `17 Jul 2021 5:33 PM`.
 * @param {Date} date - A Date object to format.
 * @returns {string} - A string presenting a more human-readable form of the
 *   Date object given.
 */

const formatDate = date => {
  const months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ]
  const month = months[date.getMonth()]
  const day = `${date.getDate()} ${month} ${date.getFullYear()}`

  const hour = date.getHours()
  const ampm = hour === 0 ? 'PM' : hour > 12 ? 'PM' : 'AM'
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const minute = date.getMinutes()
  const m = minute.toString().padStart(2, '0')
  const time = `${h}:${m} ${ampm}`

  return `${day} ${time}`
}

/**
 * Format the file size as a number of bytes into a human-readable format.
 * @param {number} size - The number of bytes.
 * @returns {string} - A string describing the number of bytes in a human-
 *   readable format (e.g., kilobytes, megabytes, or gigabytes).
 */

const formatSize = size => {
  k = size / 1000
  m = k / 1000
  g = m / 1000

  if (g > 1) {
    const rounded = Math.round(g * 10) / 10
    return `${rounded} GB`
  } else if (m > 1) {
    const rounded = Math.round(m * 10) / 10
    return `${rounded} MB`
  } else {
    const rounded = Math.round(k * 10) / 10
    return `${rounded} kB`
  }
}

module.exports = {
  formatDate,
  formatSize
}
