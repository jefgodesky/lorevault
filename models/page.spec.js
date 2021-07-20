const { TestDB, testPageData } = require('../test-utils')
const Page = require('./page')

const db = new TestDB()

beforeAll(async () => await db.connect())
afterEach(async () => await db.clear())
afterAll(async () => await db.close())

describe('Page', () => {
  describe('PageSchema.pre(save)', () => {
    it('saves the type, given a title formatted as `X:Y`', async () => {
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.title = 'Category:Test'
      const page = await Page.create(cpy)
      expect(Array.from(page.types)).toEqual(['Category'])
    })

    it('saves types specified in the body', async () => {
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.body = '[[Type:Test]]'
      const page = await Page.create(cpy)
      expect(Array.from(page.types)).toEqual(['Test'])
    })

    it('combines types taken from the title and from the body', async () => {
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.title = 'Category:Test'
      cpy.body = '[[Type:Test]]'
      const page = await Page.create(cpy)
      expect(Array.from(page.types)).toEqual(['Category', 'Test'])
    })

    it('does not include duplicates', async () => {
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.title = 'Test:Hello World!'
      cpy.body = '[[Type:Test]]'
      const page = await Page.create(cpy)
      expect(Array.from(page.types)).toEqual(['Test'])
    })
  })

  describe('PageSchema.methods.makeUpdate', () => {
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

  describe('PageSchema.methods.findVersion', () => {
    it('returns undefined if the version doesn\'t exist', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const version = page.findVersion('nope')
      expect(version).not.toBeDefined()
    })

    it('returns the version if it exists', async () => {
      expect.assertions(3)
      const page = await Page.create(testPageData)
      const version = page.findVersion(page.versions[0]._id.toString())
      expect(version.title).toEqual(testPageData.versions[0].title)
      expect(version.body).toEqual(testPageData.versions[0].body)
      expect(version.msg).toEqual(testPageData.versions[0].msg)
    })
  })

  describe('PageSchema.methods.orderVersions', () => {
    it('returns an array of versions with matching ID\'s in chronological order', async () => {
      expect.assertions(2)
      const page = await Page.create(testPageData)
      const update = JSON.parse(JSON.stringify(testPageData))
      update.body = 'This is an update.'
      await page.makeUpdate(update)
      const ids = [page.versions[1]._id.toString(), page.versions[0]._id.toString()]
      const versions = page.orderVersions(ids)
      expect(versions[0]._id.toString()).toEqual(ids[1])
      expect(versions[1]._id.toString()).toEqual(ids[0])
    })
  })

  describe('PageSchema.methods.rollback', () => {
    it('makes a new version', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const update = JSON.parse(JSON.stringify(testPageData))
      update.body = 'This is an update.'
      await page.makeUpdate(update)
      await page.rollback(page.versions[0]._id.toString())
      expect(page.versions).toHaveLength(3)
    })

    it('announces the new version as a rollback', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const update = JSON.parse(JSON.stringify(testPageData))
      update.body = 'This is an update.'
      await page.makeUpdate(update)
      await page.rollback(page.versions[0]._id.toString())
      expect(page.versions[2].msg).toMatch(/^Rolling back to the version created at/)
    })

    it('resets values to those from the previous version', async () => {
      expect.assertions(2)
      const page = await Page.create(testPageData)
      const update = JSON.parse(JSON.stringify(testPageData))
      update.body = 'This is an update.'
      await page.makeUpdate(update)
      await page.rollback(page.versions[0]._id.toString())
      expect(page.versions[2].title).toEqual(page.versions[0].title)
      expect(page.versions[2].body).toEqual(page.versions[0].body)
    })
  })

  describe('PageSchema.statics.findByPath', () => {
    it('queries a Page by its path', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const actual = await Page.findByPath(page.path)
      expect(page._id).toEqual(actual._id)
    })
  })

  describe('PageSchema.statics.findByTitle', () => {
    it('returns an empty array if no Pages have that title', async () => {
      expect.assertions(1)
      const actual = await Page.findByTitle('Other Page')
      expect(actual).toEqual([])
    })

    it('returns a single Page if it\'s the only one with that title', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const actual = await Page.findByTitle(page.title)
      expect(actual._id).toEqual(page._id)
    })

    it('returns an array of Pages that match the title if more than one does', async () => {
      expect.assertions(1)
      await Page.create(testPageData)
      await Page.create(testPageData)
      const actual = await Page.findByTitle(testPageData.title)
      expect(actual).toHaveLength(2)
    })

    it('is case insensitive', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const actual = await Page.findByTitle(page.title.toLowerCase())
      expect(actual._id).toEqual(page._id)
    })
  })

  describe('PageSchema.statics.makeUpdate', () => {
    it('returns false if it couldn\'t find any such Page document', async () => {
      expect.assertions(1)
      const update = JSON.parse(JSON.stringify(testPageData))
      update.body = 'This is an update.'
      const actual = await Page.makeUpdate('/nope', update)
      expect(actual).toEqual(false)
    })

    it('looks up the page and then makes the update', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const update = JSON.parse(JSON.stringify(testPageData))
      update.body = 'This is an update.'
      const actual = await Page.makeUpdate(page.path, update)
      expect(actual.versions).toHaveLength(2)
    })
  })
})