const { TestDB, testPageData } = require('../test-utils')
const Page = require('./page')
const User = require('./user')
const Character = require('./character')

const db = new TestDB()

beforeAll(async () => await db.connect())
afterEach(async () => await db.clear())
afterAll(async () => await db.close())

describe('Character', () => {
  describe('CharacterSchema.statics.getCharacters', () => {
    it('fetches a user\'s characters', async () => {
      expect.assertions(1)
      const player = await User.create({googleID: 'google', discordID: 'discord'})
      const p1 = await Page.create(testPageData)
      const p2 = await Page.create(testPageData)
      await Character.create({ page: p1, player })
      await Character.create({ page: p2, player })
      const actual = await Character.getCharacters(player)
      expect(actual).toHaveLength(2)
    })

    it('can also take the user\'s ID', async () => {
      expect.assertions(1)
      const player = await User.create({googleID: 'google', discordID: 'discord'})
      const p1 = await Page.create(testPageData)
      const p2 = await Page.create(testPageData)
      await Character.create({ page: p1, player })
      await Character.create({ page: p2, player })
      const actual = await Character.getCharacters(player._id)
      expect(actual).toHaveLength(2)
    })

    it('populates the page', async () => {
      expect.assertions(1)
      const player = await User.create({googleID: 'google', discordID: 'discord'})
      const page = await Page.create(testPageData)
      await Character.create({ page, player })
      const actual = await Character.getCharacters(player)
      expect(actual[0].page._id).toEqual(page._id)
    })
  })

  describe('CharacterSchema.statics.isYourCharacter', () => {
    it('returns false if it isn\'t your character', async () => {
      expect.assertions(1)
      const player = await User.create({googleID: 'google', discordID: 'discord'})
      const page = await Page.create(testPageData)
      const actual = await Character.isYourCharacter(page, player)
      expect(actual).toEqual(false)
    })

    it('returns true if it is your character', async () => {
      expect.assertions(1)
      const player = await User.create({googleID: 'google', discordID: 'discord'})
      const page = await Page.create(testPageData)
      await Character.create({ page, player })
      const actual = await Character.isYourCharacter(page, player)
      expect(actual).toEqual(true)
    })
  })
})
