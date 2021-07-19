/* global describe, it, expect, afterAll */

const parse = require('./index')

describe('parse', () => {
  it('renders Markdown to HTML', () => {
    const actual = parse('## Title\n\n_Hello, world!_')
    expect(actual).toEqual('<h2>Title</h2>\n<p><em>Hello, world!</em></p>\n')
  })
})
