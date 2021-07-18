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

  describe('UserSchema.methods.addCharacter', () => {
    it('adds a character', async () => {
      expect.assertions(1)
      const name = 'Tester'
      const user = await User.create({ googleID: 'google' })
      await user.addCharacter({ name })
      expect(user.characters[0].name).toEqual(name)
    })

    it('makes this your active character if this is your first character', async () => {
      expect.assertions(1)
      const name = 'Tester'
      const user = await User.create({ googleID: 'google' })
      await user.addCharacter({ name })
      expect(user.active.name).toEqual(name)
    })

    it('doesn\'t makes this your active character if this isn\'t your first character', async () => {
      expect.assertions(2)
      const user = await User.create({ googleID: 'google' })
      await user.addCharacter({ name: 'Tester 1' })
      await user.addCharacter({ name: 'Tester 2' })
      expect(user.characters).toHaveLength(2)
      expect(user.active.name).toEqual('Tester 1')
    })
  })
})