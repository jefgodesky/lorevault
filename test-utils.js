/**
 * Set up standard test documents in the database.
 * @param {function} model - The Mongoose model function.
 * @returns {Promise<{user: User, other: User, page: Page}>} - A Promise that
 *   resolves with test documents that have been created in the database.
 */

const createTestDocs = async model => {
  const Page = model('Page')
  const User = model('User')
  const user = await User.create({ name: 'Tester 1' })
  const other = await User.create({ name: 'Tester 2' })
  const page = await Page.create({ title: 'Test Page', body: 'This is the original text.' }, user)
  return { user, other, page }
}

/**
 * Find a string not yet in use by the given object as a property name.
 * @param {object} obj - The object we're examining.
 * @returns {string} - A string that the object is not yet using as the name of
 *   one of its properties.
 */

const codenamer = obj => {
  let num = 1
  while (true) {
    let key = `Secret${num.toString().padStart(4, '0')}`
    if (!obj.hasOwnProperty(key)) return key
    num++
  }
}

export {
  createTestDocs,
  codenamer
}
