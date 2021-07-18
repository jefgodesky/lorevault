const { TestDB } = require('../test-utils')
const User = require('./user')

const db = new TestDB()

beforeAll(async () => await db.connect())
afterEach(async () => await db.clear())
afterAll(async () => await db.close())

describe('User', () => {
  describe('UserSchema.methods.isLastConnection', () => {
    it('returns false if you have at least one other connection', async () => {
      const user = await User.create({ googleID: 'google', discordID: 'discord' })
      expect(user.isLastConnection('google')).toEqual(false)
    })

    it('returns true if this is your only connection', async () => {
      const user = await User.create({ googleID: 'google' })
      expect(user.isLastConnection('google')).toEqual(true)
    })
  })
})