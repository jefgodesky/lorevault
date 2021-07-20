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
      expect(actual).toEqual('<h2 id="heading-title"><a class="header-anchor" id="title" href="#title">#</a>Title</h2>\n<p><em>Hello, world!</em></p>\n')
    })

    it('provides IDs for headers', async () => {
      expect.assertions(1)
      const actual = await parse('## Section 1\n\n## Section 2')
      expect(actual).toEqual('<h2 id="heading-section-1"><a class="header-anchor" id="section-1" href="#section-1">#</a>Section 1</h2>\n<h2 id="heading-section-2"><a class="header-anchor" id="section-2" href="#section-2">#</a>Section 2</h2>\n')
    })
  })

  describe('Code Blocks', () => {
    it('skips code blocks', async () => {
      expect.assertions(1)
      const actual = await parse('A _paragraph_ **before**.\n\n```\n[[Link]]\nA _paragraph_ **within**.\n```\n\nA _paragraph_ **between**.\n\nThis is another paragraph.\n\n```\n\nThis is a second block.\n\n```\n\nA _paragraph_ **after**.')
      expect(actual).toEqual('<p>A <em>paragraph</em> <strong>before</strong>.</p>\n<pre><code>\n[[Link]]\nA _paragraph_ **within**.\n</code></pre>\n<p>A <em>paragraph</em> <strong>between</strong>.</p>\n<p>This is another paragraph.</p>\n<pre><code>\n\nThis is a second block.\n\n</code></pre>\n<p>A <em>paragraph</em> <strong>after</strong>.</p>\n')
    })
  })

  describe('Parsing links', () => {
    it('parses links', async () => {
      expect.assertions(1)
      await Page.create(testPageData)
      const actual = await parse('This text links to [[Test]].')
      expect(actual).toEqual('<p>This text links to <a href="/test" title="Test">Test</a>.</p>\n')
    })

    it('respects aliases', async () => {
      expect.assertions(1)
      await Page.create(testPageData)
      const actual = await parse('This text links to the [[Test | Test Page]].')
      expect(actual).toEqual('<p>This text links to the <a href="/test" title="Test">Test Page</a>.</p>\n')
    })

    it('wraps stems', async () => {
      expect.assertions(1)
      await Page.create(testPageData)
      const actual = await parse('This text links to [[test]]s.')
      expect(actual).toEqual('<p>This text links to <a href="/test" title="Test">tests</a>.</p>\n')
    })

    it('parses links to pages that don\'t exist yet', async () => {
      expect.assertions(1)
      const actual = await parse('This text links to a [[new page]].')
      expect(actual).toEqual('<p>This text links to a <a href="/new-page" class="new">new page</a>.</p>\n')
    })
  })
})
