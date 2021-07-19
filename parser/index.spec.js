/* global describe, it, expect, afterAll */

const Page = require('../models/page')
const { TestDB, testPageData } = require('../test-utils')
const parse = require('./index')

const db = new TestDB()

beforeAll(async () => await db.connect())
afterEach(async () => await db.clear())
afterAll(async () => await db.close())

describe('parse', () => {
  describe('Markdown', () => {
    it('renders Markdown to HTML', async () => {
      expect.assertions(1)
      const actual = await parse('## Title\n\n_Hello, world!_')
      expect(actual).toEqual('<h2>Title</h2>\n<p><em>Hello, world!</em></p>\n')
    })
  })

  describe('Parsing links', () => {
    it('parses links', async () => {
      expect.assertions(1)
      await Page.create(testPageData)
      const actual = await parse('This text links to [[Test]].')
      expect(actual).toEqual('<p>This text links to <a href="/test">Test</a>.</p>\n')
    })

    it('respects aliases', async () => {
      expect.assertions(1)
      await Page.create(testPageData)
      const actual = await parse('This text links to the [[Test | Test Page]].')
      expect(actual).toEqual('<p>This text links to the <a href="/test">Test Page</a>.</p>\n')
    })

    it('wraps stems', async () => {
      expect.assertions(1)
      await Page.create(testPageData)
      const actual = await parse('This text links to [[test]]s.')
      expect(actual).toEqual('<p>This text links to <a href="/test">tests</a>.</p>\n')
    })

    it('parses links to pages that don\'t exist yet', async () => {
      expect.assertions(1)
      const actual = await parse('This text links to a [[new page]].')
      expect(actual).toEqual('<p>This text links to a <a href="/new-page" class="new">new page</a>.</p>\n')
    })
  })
})
