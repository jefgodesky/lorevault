/* global describe, it, expect, afterAll */

const Page = require('../models/page')
const { TestDB, testPageData } = require('../test-utils')
const {
  removeBlocks,
  detag,
  respectIncludeOnly,
  parseLinks,
  parseTemplates,
  markdown,
  wrapLinks,
  unwrapTags,
  trimEmptySections,
  restoreBlocks
} = require('./index')

const db = new TestDB()

beforeAll(async () => await db.connect())
afterEach(async () => await db.clear())
afterAll(async () => await db.close())

describe('removeBlocks', () => {
  it('removes code blocks marked with Markdown', () => {
    const actual = removeBlocks('```\nThis should be removed.\n```\n\nHello world!')
    expect(actual.blockedStr).toEqual('<!-- BLOCK0 -->\n\nHello world!')
    expect(actual.blocks).toEqual(['```\nThis should be removed.\n```'])
  })

  it('removes code blocks marked with HTML', () => {
    const actual = removeBlocks('<pre><code>\nThis should be removed.\n</code></pre>\n\nHello world!')
    expect(actual.blockedStr).toEqual('<!-- BLOCK0 -->\n\nHello world!')
    expect(actual.blocks).toEqual(['<pre><code>\nThis should be removed.\n</code></pre>'])
  })
})

describe('detag', () => {
  it('removes types', () => {
    const actual = detag('[[Type:Test]]')
    expect(actual).toEqual('')
  })

  it('removes categories', () => {
    const actual = detag('[[Category:Test]]')
    expect(actual).toEqual('')
  })
})

describe('respectIncludeOnly', () => {
  it('removes <includeonly> tags and their contents', () => {
    const actual = respectIncludeOnly('Before\n\n<includeonly>This should be removed.</includeonly>\n\nAfter')
    expect(actual).toEqual('Before\n\n\n\nAfter')
  })
})

describe('parseLinks', () => {
  it('parses links', async () => {
    expect.assertions(1)
    await Page.create(testPageData)
    const actual = await parseLinks('[[Test]]', Page)
    expect(actual).toEqual('<a href="/test" title="Test">Test</a>')
  })

  it('uses aliases', async () => {
    expect.assertions(1)
    await Page.create(testPageData)
    const actual = await parseLinks('[[Test|Alias]]', Page)
    expect(actual).toEqual('<a href="/test" title="Test">Alias</a>')
  })

  it('creates links to new pages', async () => {
    expect.assertions(1)
    const actual = await parseLinks('[[Test]]', Page)
    expect(actual).toEqual('<a href="/create?title=Test" class="new">Test</a>')
  })
})

describe('parseTemplates', () => {
  it('parses templates', async () => {
    expect.assertions(1)
    const tplData = JSON.parse(JSON.stringify(testPageData))
    tplData.title = 'Template:HelloWorld'
    tplData.body = 'Hello, world!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
    await Page.create(tplData)
    const actual = await parseTemplates('{{Template:HelloWorld}}\n\nThis is a test.', null, null, Page)
    expect(actual).toEqual('Hello, world!\n\n\n\nThis is a test.')
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
    const actual = await parseTemplates('{{Template:Wrapper}}\n\nThis is a test.', null, null, Page)
    expect(actual).toEqual('Hello, world!\n\n\n\nThis is a test.')
  })

  it('parses multiple templates', async () => {
    expect.assertions(1)
    const tplData = JSON.parse(JSON.stringify(testPageData))
    tplData.title = 'Template:HelloWorld'
    tplData.body = 'Hello, world!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
    await Page.create(tplData)
    const actual = await parseTemplates('{{Template:HelloWorld}}\n\n{{Template:HelloWorld}}\n\nThis is a test.', null, null, Page)
    expect(actual).toEqual('Hello, world!\n\n\n\nHello, world!\n\n\n\nThis is a test.')
  })

  it('passes along ordered parameters', async () => {
    expect.assertions(1)
    const tplData = JSON.parse(JSON.stringify(testPageData))
    tplData.title = 'Template:HelloWorld'
    tplData.body = '{{{1}}}, {{{2}}}!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
    await Page.create(tplData)
    const actual = await parseTemplates('{{Template:HelloWorld|Hello|world}}\n\nThis is a test.', null, null, Page)
    expect(actual).toEqual('Hello, world!\n\n\n\nThis is a test.')
  })

  it('lets you specify ordered parameters', async () => {
    expect.assertions(1)
    const tplData = JSON.parse(JSON.stringify(testPageData))
    tplData.title = 'Template:HelloWorld'
    tplData.body = '{{{1}}}, {{{2}}}!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
    await Page.create(tplData)
    const actual = await parseTemplates('{{Template:HelloWorld|2=world|1=Hello}}\n\nThis is a test.', null, null, Page)
    expect(actual).toEqual('Hello, world!\n\n\n\nThis is a test.')
  })

  it('lets you specify named parameters', async () => {
    expect.assertions(1)
    const tplData = JSON.parse(JSON.stringify(testPageData))
    tplData.title = 'Template:HelloWorld'
    tplData.body = '{{{greeting}}}, {{{subject}}}!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
    await Page.create(tplData)
    const actual = await parseTemplates('{{Template:HelloWorld|greeting=Hello|subject=world}}\n\nThis is a test.', null, null, Page)
    expect(actual).toEqual('Hello, world!\n\n\n\nThis is a test.')
  })

  it('handles parameters on new lines', async () => {
    expect.assertions(1)
    const tplData = JSON.parse(JSON.stringify(testPageData))
    tplData.title = 'Template:HelloWorld'
    tplData.body = '{{{greeting}}}, {{{subject}}}!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
    await Page.create(tplData)
    const actual = await parseTemplates('{{Template:HelloWorld\n  |greeting=Hello\n  |subject=world\n}}\n\nThis is a test.', null, null, Page)
    expect(actual).toEqual('Hello, world!\n\n\n\nThis is a test.')
  })

  it('ignores templates that don\'t exist', async () => {
    expect.assertions(1)
    const actual = await parseTemplates('{{Template:HelloWorld\n  |greeting=Hello\n  |subject=world\n}}\n\nThis is a test.', null, null, Page)
    expect(actual).toEqual('\n\nThis is a test.')
  })

  it('handles links in parameters', async () => {
    expect.assertions(1)
    const tplData = JSON.parse(JSON.stringify(testPageData))
    tplData.title = 'Template:HelloWorld'
    tplData.body = '{{{greeting}}}, {{{subject}}}!\n\n<noinclude>\n  This should not be included.\n</noinclude>'
    await Page.create(tplData)
    const actual = await parseTemplates('{{Template:HelloWorld|greeting=Hello|subject=[[Unit Test|Tester]]}}\n\nThis is a test.', null, null, Page)
    expect(actual).toEqual('Hello, [[Unit Test!\n\n\n\nThis is a test.')
  })
})

describe('markdown', () => {
  it('renders Markdown', async () => {
    expect.assertions(1)
    const actual = await markdown('**Bold** _italic_')
    expect(actual).toEqual('<p><strong>Bold</strong> <em>italic</em></p>\n')
  })

  it('adds anchor text', async () => {
    expect.assertions(1)
    const actual = await markdown('## Heading')
    expect(actual).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
  })

  it('adds heading ID\'s', async () => {
    expect.assertions(1)
    const actual = await markdown('## Heading')
    expect(actual.startsWith('<h2 id="heading-heading">')).toEqual(true)
  })
})

describe('wrapLinks', () => {
  it('wraps whole words in links', () => {
    expect(wrapLinks('<a href="#">test</a>ed')).toEqual('<a href="#">tested</a>')
  })

  it('does not wrap other words', () => {
    expect(wrapLinks('some <a href="#">test</a>ed text')).toEqual('some <a href="#">tested</a> text')
  })
})

describe('unwrapTags', () => {
  it('removes <p> tags that might be wrapping an <img> tag', () => {
    expect(unwrapTags('<p><img src="#" /></p>')).toEqual('<img src="#" />')
  })

  it('removes <p> tags that might be wrapping an <svg> tag', () => {
    expect(unwrapTags('<p><svg xmlns="http://www.w3.org/2000/svg"></svg></p>')).toEqual('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  })

  it('removes <p> tags that might be wrapping a <div> tag', () => {
    expect(unwrapTags('<p><div>Hello world!</div></p>')).toEqual('<div>Hello world!</div>')
  })

  it('removes <p> tags that might be wrapping a <figure> tag', () => {
    expect(unwrapTags('<p><figure></figure></p>')).toEqual('<figure></figure>')
  })

  it('removes <p> tags that might be wrapping a <section> tag', () => {
    expect(unwrapTags('<p><section></section></p>')).toEqual('<section></section>')
  })

  it('removes <p> tags that might be wrapping an <aside> tag', () => {
    expect(unwrapTags('<p><aside></aside></p>')).toEqual('<aside></aside>')
  })
})

describe('trimEmptySections', () => {
  it('removes sections that have no content', () => {
    const actual = trimEmptySections('<h2>First Heading</h2><h2>Second Heading</h2><p>Content</p><h2>Third Heading</h2>')
    expect(actual).toEqual('<h2>Second Heading</h2><p>Content</p>')
  })
})

describe('restoreBlocks', () => {
  it('restores code blocks removed with removeBlocks, identified with Markdown', () => {
    const removal = removeBlocks('```\nThis should be removed.\n```\n\nHello world!')
    const actual = restoreBlocks(removal.blockedStr, removal.blocks)
    expect(actual).toEqual('<pre><code>\nThis should be removed.\n</code></pre>\n\nHello world!')
  })

  it('restores code blocks removed with removeBlocks, identified with HTML', () => {
    const removal = removeBlocks('<pre><code>\nThis should be removed.\n</code></pre>\n\nHello world!')
    const actual = restoreBlocks(removal.blockedStr, removal.blocks)
    expect(actual).toEqual('<pre><code>\nThis should be removed.\n</code></pre>\n\nHello world!')
  })
})
