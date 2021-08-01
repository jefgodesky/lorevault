const { TestDB, testPageData } = require('../test-utils')
const Page = require('./page')
const User = require('./user')
const Character = require('./character')

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

    it('saves types specified by the file', async () => {
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.file = { mimetype: 'image/gif' }
      const page = await Page.create(cpy)
      expect(Array.from(page.types)).toEqual(['Image file', 'GIF image'])
    })

    it('combines types taken from the title and from the body', async () => {
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.title = 'Category:Test'
      cpy.body = '[[Type:Test]]'
      const page = await Page.create(cpy)
      expect(Array.from(page.types)).toEqual(['Category', 'Test'])
    })

    it('combines types taken from the title and the file', async () => {
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.title = 'Image file:Test'
      cpy.file = { mimetype: 'image/gif' }
      const page = await Page.create(cpy)
      expect(Array.from(page.types)).toEqual(['Image file', 'GIF image'])
    })

    it('combines types taken from the body and the file', async () => {
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.body = '[[Type:Test]]\n[[Type:GIF image]]'
      cpy.file = { mimetype: 'image/gif' }
      const page = await Page.create(cpy)
      expect(Array.from(page.types)).toEqual(['Image file', 'GIF image', 'Test'])
    })

    it('does not include duplicates', async () => {
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.title = 'Test:Hello World!'
      cpy.body = '[[Type:Test]]'
      const page = await Page.create(cpy)
      expect(Array.from(page.types)).toEqual(['Test'])
    })

    it('refers to existing categories', async () => {
      expect.assertions(1)
      const categoryData = JSON.parse(JSON.stringify(testPageData))
      categoryData.body = '[[Type:Category]]'
      const category = await Page.create(categoryData)

      const pageData = JSON.parse(JSON.stringify(testPageData))
      pageData.body = '[[Category:Test]]'
      const page = await Page.create(pageData)

      expect(page.categories[0].toString()).toEqual(category._id.toString())
    })

    it('creates new categories', async () => {
      expect.assertions(3)
      const pageData = JSON.parse(JSON.stringify(testPageData))
      pageData.body = '[[Category:Test Category]]'
      const page = await Page.create(pageData)
      const check = await Page.findByTitle('Test Category', 'Category')
      expect(page.categories).toHaveLength(1)
      expect(page.categories[0].toString()).toEqual(check._id.toString())
      expect(page._id.toString()).not.toEqual(check._id.toString())
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

    it('updates the file', async () => {
      expect.assertions(3)
      const page = await Page.create(testPageData)
      const update = JSON.parse(JSON.stringify(testPageData))
      update.file = { url: 'test.png', mimetype: 'image/png', size: 256 }
      await page.makeUpdate(update)
      const actual = await Page.findById(page._id)
      expect(actual.file.url).toEqual('test.png')
      expect(actual.file.mimetype).toEqual('image/png')
      expect(actual.file.size).toEqual(256)
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

  describe('PageSchema.methods.parseTemplate', () => {
    it('returns null if you try to parse a page that isn\'t a template', async () => {
      expect.assertions(1)
      const data = JSON.parse(JSON.stringify(testPageData))
      data.title = 'TestTemplate'
      data.body = '<strong>Hello, world!</strong>'
      const tpl = await Page.create(data)
      const actual = tpl.parseTemplate({ ordered: [], named: {} })
      expect(actual).toEqual(null)
    })

    it('parses the template', async () => {
      expect.assertions(1)
      const data = JSON.parse(JSON.stringify(testPageData))
      data.title = 'Template:Test'
      data.body = '<strong>Hello, world!</strong>'
      const tpl = await Page.create(data)
      const actual = tpl.parseTemplate({ ordered: [], named: {} })
      expect(actual).toEqual('<strong>Hello, world!</strong>')
    })

    it('parses ordered parameters', async () => {
      expect.assertions(1)
      const data = JSON.parse(JSON.stringify(testPageData))
      data.title = 'Template:Test'
      data.body = '<strong>{{{1}}}, {{{2}}}!</strong>'
      const tpl = await Page.create(data)
      const actual = tpl.parseTemplate({ ordered: [ 'Hello', 'world' ], named: {} })
      expect(actual).toEqual('<strong>Hello, world!</strong>')
    })

    it('parses named parameters', async () => {
      expect.assertions(1)
      const data = JSON.parse(JSON.stringify(testPageData))
      data.title = 'Template:Test'
      data.body = '<strong>{{{greeting}}}, {{{subject}}}!</strong>'
      const tpl = await Page.create(data)
      const actual = tpl.parseTemplate({ ordered: [], named: { greeting: 'Hello', subject: 'world' } })
      expect(actual).toEqual('<strong>Hello, world!</strong>')
    })
  })

  describe('PageSchema.methods.isClaimable', () => {
    it('returns false if the page isn\'t of type person', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const actual = await page.isClaimable()
      expect(actual).toEqual(false)
    })

    it('returns false if the page has been claimed by someone already', async () => {
      expect.assertions(1)
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.body = '[[Type:Person]]'
      const page = await Page.create(cpy)
      const player = await User.create({ googleID: 'google', discordID: 'discord' })
      await Character.create({ page, player })
      const actual = await page.isClaimable()
      expect(actual).toEqual(false)
    })

    it('returns true if the page is claimable', async () => {
      expect.assertions(1)
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.body = '[[Type:Person]]'
      const page = await Page.create(cpy)
      const actual = await page.isClaimable()
      expect(actual).toEqual(true)
    })
  })

  describe('PageSchema.methods.getKnownSecrets', () => {
    it('returns all secrets for a loremaster', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      page.secrets.push({ text: 'Test' })
      await page.save()
      const actual = await page.getKnownSecrets('loremaster')
      expect(actual).toHaveLength(1)
    })

    it('returns no secrets to the public', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      page.secrets.push({ text: 'Test' })
      await page.save()
      const actual = await page.getKnownSecrets('public')
      expect(actual).toHaveLength(0)
    })

    it('returns the secrets that a character knows', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      const player = await User.create({ googleID: 'google', discordID: 'discord' })
      const char = await Character.create({ page, player })
      page.secrets.push({ text: 'Secret 1' })
      page.secrets.push({ text: 'Secret 2', knowers: [ char._id] })
      await page.save()
      const actual = await page.getKnownSecrets(char)
      expect(actual).toHaveLength(1)
    })
  })

  describe('PageSchema.methods.delete', () => {
    it('deletes a page', async () => {
      expect.assertions(1)
      const page = await Page.create(testPageData)
      await page.delete()
      const actual = await Page.find({ path: testPageData.path })
      expect(actual).toEqual([])
    })

    it('deletes a character (if there is one)', async () => {
      expect.assertions(1)
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.body = '[[Type:Person]]'
      const page = await Page.create(testPageData)
      const player = await User.create({ googleID: 'google', discordID: 'discord' })
      await Character.create({ page, player })
      await page.delete()
      const actual = await Character.find({ page: page._id })
      expect(actual).toEqual([])
    })

    it('removes the page as a user\'s active character (if anyone has it)', async () => {
      expect.assertions(2)
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.body = '[[Type:Person]]'
      const page = await Page.create(testPageData)
      const player = await User.create({ googleID: 'google', discordID: 'discord' })
      const char = await Character.create({ page, player })
      player.activeChar = char._id
      player.perspective = 'character'
      await player.save()
      await page.delete()
      const actual = await User.findById(player._id)
      expect(actual.activeChar).toBeNull()
      expect(actual.perspective).toEqual('public')
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

    it('can be limited by type', async () => {
      expect.assertions(1)
      const cpy = JSON.parse(JSON.stringify(testPageData))
      cpy.body = '[[Type:Test Page]]'
      await Page.create(testPageData)
      const p2 = await Page.create(cpy)
      const actual = await Page.findByTitle(testPageData.title.toLowerCase(), 'Test Page')
      expect(actual._id).toEqual(p2._id)
    })
  })

  describe('PageSchema.statics.findCategoryMembers', () => {
    it('returns all of the pages in a category', async () => {
      expect.assertions(2)

      const d1 = JSON.parse(JSON.stringify(testPageData))
      d1.body = '[[Category:Test Category]]'
      const p1 = await Page.create(d1)

      const d2 = JSON.parse(JSON.stringify(testPageData))
      d2.body = '[[Category:Test Category]]'
      const p2 = await Page.create(d2)

      const d3 = JSON.parse(JSON.stringify(testPageData))
      d3.body = '[[Category:Test Category]]\n[[Type:Category]]'
      const p3 = await Page.create(d3)

      const actual = await Page.findCategoryMembers('Test Category')
      expect(actual.pages.map(p => p._id)).toEqual([ p1._id, p2._id ])
      expect(actual.subcategories.map(p => p._id)).toEqual([ p3._id ])
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

  describe('PageSchema.statics.getFile', () => {
    it('returns the URL of the Page with that title', async () => {
      expect.assertions(1)
      const data = JSON.parse(JSON.stringify(testPageData))
      data.title = 'Test File'
      data.file = { url: 'test.txt', size: 64, mimetype: 'text/plain' }
      await Page.create(data)
      const actual = await Page.getFile('Test File')
      expect(actual).toEqual('test.txt')
    })

    it('returns undefined if no such page exists', async () => {
      await Page.create(testPageData)
      const actual = await Page.getFile('Test File')
      expect(actual).toEqual(undefined)
    })

    it('returns the URL for the first one that has a file if multiple Pages match', async () => {
      expect.assertions(1)
      await Page.create(testPageData)

      const d1 = JSON.parse(JSON.stringify(testPageData))
      d1.file = { url: 'one.txt', size: 64, mimetype: 'text/plain' }
      await Page.create(d1)

      const d2 = JSON.parse(JSON.stringify(testPageData))
      d2.file = { url: 'two.txt', size: 64, mimetype: 'text/plain' }
      await Page.create(d2)

      const actual = await Page.getFile('Test')
      expect(actual).toEqual('one.txt')
    })
  })
})