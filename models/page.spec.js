const { TestDB } = require('../test-utils')
const Page = require('./page')

const db = new TestDB()

beforeAll(async () => await db.connect())
afterEach(async () => await db.clear())
afterAll(async () => await db.close())

const testPageData = {
  title: 'Test',
  body: 'This is a test.',
  versions: [
    {
      title: 'Test',
      body: 'This is a test.',
      msg: 'Initial text'
    }
  ]
}

describe('Page', () => {
  describe('makeUpdate', () => {
    it('updates the body', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const update = JSON.parse(JSON.stringify(testPageData))
      update.body = 'This is an update.'
      await page.makeUpdate(update)
      const actual = await Page.findById(page._id)
      expect(actual.body).toEqual(update.body)
    })

    it('updates the title', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const update = JSON.parse(JSON.stringify(testPageData))
      update.title = 'New Title'
      await page.makeUpdate(update)
      const actual = await Page.findById(page._id)
      expect(actual.title).toEqual(update.title)
    })

    it('adds a new version', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const update = JSON.parse(JSON.stringify(testPageData))
      update.body = 'This is an update.'
      await page.makeUpdate(update)
      const actual = await Page.findById(page._id)
      expect(actual.versions).toHaveLength(2)
    })

    it('keeps versions in chronological order', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const update = JSON.parse(JSON.stringify(testPageData))
      update.body = 'This is an update.'
      await page.makeUpdate(update)
      const actual = await Page.findById(page._id)
      expect(actual.versions[1].body).toEqual(update.body)
    })
  })
})