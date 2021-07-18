const { TestDB } = require('../test-utils')
const User = require('./user')

const db = new TestDB()

beforeAll(async () => await db.connect())
afterEach(async () => await db.clear())
afterAll(async () => await db.close())

describe('User', () => {
  describe('UserSchema.methods.isLastConnection', () => {
    it('returns false if you have at least one other connection', async () => {
      expect.assertions(1)
      const user = await User.create({ googleID: 'google', discordID: 'discord' })
      expect(user.isLastConnection('google')).toEqual(false)
    })

    it('returns true if this is your only connection', async () => {
      expect.assertions(1)
      const user = await User.create({ googleID: 'google' })
      expect(user.isLastConnection('google')).toEqual(true)
    })
  })

  describe('UserSchema.methods.disconnect', () => {
    it('won\'t remove your last connection', async () => {
      expect.assertions(2)
      const user = await User.create({ googleID: 'google' })
      const actual = await user.disconnect('google')
      expect(actual).toEqual(false)
      expect(user.googleID).toEqual('google')
    })

    it('will remove a connection if you have another', async () => {
      expect.assertions(3)
      const user = await User.create({ googleID: 'google', discordID: 'discord' })
      const actual = await user.disconnect('google')
      expect(actual).toEqual(true)
      expect(user.googleID).not.toBeDefined()
      expect(user.discordID).toEqual('discord')
    })
  })
})