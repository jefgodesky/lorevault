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

  describe('Parsing templates', () => {
    it('parses templates', async () => {
      expect.assertions(1)
      const tplData = JSON.parse(JSON.stringify(testPageData))
      tplData.title = 'Template:HelloWorld'
      tplData.body = 'Hello, world!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
      await Page.create(tplData)
      const actual = await parse('{{Template:HelloWorld}}\n\nThis is a test.')
      expect(actual).toEqual('<p>Hello, world!</p>\n<p>This is a test.</p>\n')
    })

    it('parses nested templates', async () => {
      expect.assertions(1)
      const innerData = JSON.parse(JSON.stringify(testPageData))
      innerData.title = 'Template:HelloWorld'
      innerData.body = 'Hello, world!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
      await Page.create(innerData)
      const outerData = JSON.parse(JSON.stringify(testPageData))
      outerData.title = 'Template:Wrapper'
      outerData.body = '{{Template:HelloWorld}}'
      await Page.create(outerData)
      const actual = await parse('{{Template:Wrapper}}\n\nThis is a test.')
      expect(actual).toEqual('<p>Hello, world!</p>\n<p>This is a test.</p>\n')
    })

    it('parses multiple templates', async () => {
      expect.assertions(1)
      const tplData = JSON.parse(JSON.stringify(testPageData))
      tplData.title = 'Template:HelloWorld'
      tplData.body = 'Hello, world!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
      await Page.create(tplData)
      const actual = await parse('{{Template:HelloWorld}}\n\n{{Template:HelloWorld}}\n\nThis is a test.')
      expect(actual).toEqual('<p>Hello, world!</p>\n<p>Hello, world!</p>\n<p>This is a test.</p>\n')
    })

    it('passes along ordered parameters', async () => {
      expect.assertions(1)
      const tplData = JSON.parse(JSON.stringify(testPageData))
      tplData.title = 'Template:HelloWorld'
      tplData.body = '{{{1}}}, {{{2}}}!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
      await Page.create(tplData)
      const actual = await parse('{{Template:HelloWorld|Hello|world}}\n\nThis is a test.')
      expect(actual).toEqual('<p>Hello, world!</p>\n<p>This is a test.</p>\n')
    })

    it('lets you specify ordered parameters', async () => {
      expect.assertions(1)
      const tplData = JSON.parse(JSON.stringify(testPageData))
      tplData.title = 'Template:HelloWorld'
      tplData.body = '{{{1}}}, {{{2}}}!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
      await Page.create(tplData)
      const actual = await parse('{{Template:HelloWorld|2=world|1=Hello}}\n\nThis is a test.')
      expect(actual).toEqual('<p>Hello, world!</p>\n<p>This is a test.</p>\n')
    })

    it('lets you specify named parameters', async () => {
      expect.assertions(1)
      const tplData = JSON.parse(JSON.stringify(testPageData))
      tplData.title = 'Template:HelloWorld'
      tplData.body = '{{{greeting}}}, {{{subject}}}!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
      await Page.create(tplData)
      const actual = await parse('{{Template:HelloWorld|greeting=Hello|subject=world}}\n\nThis is a test.')
      expect(actual).toEqual('<p>Hello, world!</p>\n<p>This is a test.</p>\n')
    })

    it('handles parameters on new lines', async () => {
      expect.assertions(1)
      const tplData = JSON.parse(JSON.stringify(testPageData))
      tplData.title = 'Template:HelloWorld'
      tplData.body = '{{{greeting}}}, {{{subject}}}!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
      await Page.create(tplData)
      const actual = await parse('{{Template:HelloWorld\n  |greeting=Hello\n  |subject=world\n}}\n\nThis is a test.')
      expect(actual).toEqual('<p>Hello, world!</p>\n<p>This is a test.</p>\n')
    })
  })

  describe('Parsing images', () => {
    it('adds an empty img tag if there is no such image', async () => {
      expect.assertions(1)
      const actual = await parse('[[Image:Test]]')
      expect(actual).toEqual('<img src="" alt="Image:Test" />\n')
    })

    it('adds the requested image', async () => {
      expect.assertions(1)
      const data = JSON.parse(JSON.stringify(testPageData))
      data.title = 'Image:Test'
      data.file = { url: 'test.gif', size: 64, mimetype: 'image/gif' }
      await Page.create(data)
      const actual = await parse('[[Image:Test]]')
      expect(actual).toEqual('<img src="test.gif" alt="Image:Test" />\n')
    })

    it('can supply alt text', async () => {
      expect.assertions(1)
      const data = JSON.parse(JSON.stringify(testPageData))
      data.title = 'Image:Test'
      data.file = { url: 'test.gif', size: 64, mimetype: 'image/gif' }
      await Page.create(data)
      const actual = await parse('[[Image:Test|Test GIF]]')
      expect(actual).toEqual('<img src="test.gif" alt="Test GIF" />\n')
    })
  })

  describe('Removing tags', () => {
    it('removes tags from parsed output', async () => {
      expect.assertions(1)
      const actual = await parse('This text has a [[Link]].\n\n[[Type:Test]]\n[[Type:Unit Test]]\n[[Category:Test Category]]\n\nHere\'s a paragraph _after_ the tags. Ah-ha!')
      expect(actual).toEqual('<p>This text has a <a href="/link" class="new">Link</a>.</p>\n<p>Here’s a paragraph <em>after</em> the tags. Ah-ha!</p>\n')
    })
  })
})
