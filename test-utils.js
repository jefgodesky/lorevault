/**
 * Set up standard test documents in the database.
 * @param {function} model - The Mongoose model function.
 * @param {string} [body='This is the original text.'] - The content that the
 *   page will be created with.
 * @returns {Promise<{user: User, other: User, loremaster: User page: Page}>} -
 *   A Promise that resolves with test documents that have been created in
 *   the database.
 */

const createTestDocs = async (model, body = 'This is the original text.') => {
  const Page = model('Page')
  const User = model('User')
  const user = await User.create({ name: 'Tester 1' })
  const other = await User.create({ name: 'Tester 2' })
  const loremaster = await User.create({ name: 'Loremaster', pov: 'Loremaster' })
  const char1 = await Page.create({ title: 'Character 1', body: 'This is about Character 1.' }, user)
  const char2 = await Page.create({ title: 'Character 2', body: 'This is about Character 2.' }, user)
  await user.claim(char1)
  await user.claim(char2)
  const page = await Page.create({ title: 'Test Page', body }, user)
  return { user, other, loremaster, page }
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
