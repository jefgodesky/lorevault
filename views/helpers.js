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

module.exports = {
  formatDate
}
