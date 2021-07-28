const utils = require('./utils')

describe('getSVG', () => {
  it('returns the XML of a remote SVG', async () => {
    expect.assertions(1)
    const expected = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n  <circle cx="50" cy="50" r="50" />\n</svg>'
    const actual = await utils.getSVG('https://lorevault-test.s3.us-east-2.wasabisys.com/test.svg')
    expect(actual).toEqual(expected)
  })

  it('returns a null string if asked to fetch a non-existent URL', async () => {
    expect.assertions(1)
    const actual = await utils.getSVG('https://localhost:8420')
    expect(actual).toEqual('')
  })

  it('returns a null string if asked to fetch something that isn\'t an SVG', async () => {
    expect.assertions(1)
    const actual = await utils.getSVG('https://thefifthworld.com')
    expect(actual).toEqual('')
  })
})
