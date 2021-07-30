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

  describe('UserSchema.methods.enterCharClaimMode', () => {
    it('sets the user\'s character claim mode flag to true', async () => {
      expect.assertions(1)
      const user = await User.create({ googleID: 'google', discordID: 'discord' })
      await user.enterCharClaimMode()
      expect(user.charClaimMode).toEqual(true)
    })

    it('sets the user\'s character claim mode flag to true no matter how many times you call it', async () => {
      expect.assertions(1)
      const times = Math.floor(Math.random() * 3) + 2
      const user = await User.create({ googleID: 'google', discordID: 'discord' })
      for (let i = 0; i < times; i++) await user.enterCharClaimMode()
      expect(user.charClaimMode).toEqual(true)
    })
  })

  describe('UserSchema.methods.leaveCharClaimMode', () => {
    it('sets the user\'s character claim mode flag to false', async () => {
      expect.assertions(1)
      const user = await User.create({ googleID: 'google', discordID: 'discord' })
      await user.enterCharClaimMode()
      await user.leaveCharClaimMode()
      expect(user.charClaimMode).toEqual(false)
    })

    it('sets the user\'s character claim mode flag to true no matter how many times you call it', async () => {
      expect.assertions(1)
      const times = Math.floor(Math.random() * 3) + 2
      const user = await User.create({ googleID: 'google', discordID: 'discord' })
      await user.enterCharClaimMode()
      for (let i = 0; i < times; i++) await user.leaveCharClaimMode()
      expect(user.charClaimMode).toEqual(false)
    })
  })

  describe('UserSchema.methods.toggleCharClaimMode', () => {
    it('sets the user\'s character claim mode flag to the opposite of what it was', async () => {
      expect.assertions(1)
      const user = await User.create({ googleID: 'google', discordID: 'discord' })
      const before = user.charClaimMode
      await user.toggleCharClaimMode()
      expect(user.charClaimMode).toEqual(!before)
    })

    it('flips the value back and forth', async () => {
      expect.assertions(1)
      const times = Math.floor(Math.random() * 3) + 2
      const user = await User.create({ googleID: 'google', discordID: 'discord' })
      const before = user.charClaimMode
      for (let i = 0; i < times; i++) await user.leaveCharClaimMode()
      const expected = times % 2 === 0 ? before : !before
      expect(user.charClaimMode).toEqual(expected)
    })
  })
})