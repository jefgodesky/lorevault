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

describe('getSystemsDisplay', () => {
  it('provides meta information about each rule system', () => {
    const actual = utils.getSystemsDisplay([ 'dnd5e' ])
    expect(actual[0].id).toEqual('dnd5e')
    expect(actual[0].name).toEqual('Dungeons & Dragons')
    expect(actual[0].edition).toEqual('5th edition')
  })

  it('provides stats', () => {
    const actual = utils.getSystemsDisplay([ 'dnd5e' ])
    expect(actual[0].stats[0]).toEqual({ id: 'dnd5e-int', label: 'Intelligence Modifier', type: 'number', value: undefined })
    expect(actual[0].stats[1]).toEqual({ id: 'dnd5e-arcana', label: 'Arcana Bonus', type: 'number', value: undefined })
    expect(actual[0].stats[2]).toEqual({ id: 'dnd5e-history', label: 'History Bonus', type: 'number', value: undefined })
    expect(actual[0].stats[3]).toEqual({ id: 'dnd5e-nature', label: 'Nature Bonus', type: 'number', value: undefined })
    expect(actual[0].stats[4]).toEqual({ id: 'dnd5e-religion', label: 'Religion Bonus', type: 'number', value: undefined })
  })

  it('supplies the character\'s stats', () => {
    const char = { dnd5e: { int: 1, arcana: 2, history: 3, nature: 4 } }
    const actual = utils.getSystemsDisplay([ 'dnd5e' ], char)
    expect(actual[0].stats[0]).toEqual({ id: 'dnd5e-int', label: 'Intelligence Modifier', type: 'number', value: 1 })
    expect(actual[0].stats[1]).toEqual({ id: 'dnd5e-arcana', label: 'Arcana Bonus', type: 'number', value: 2 })
    expect(actual[0].stats[2]).toEqual({ id: 'dnd5e-history', label: 'History Bonus', type: 'number', value: 3 })
    expect(actual[0].stats[3]).toEqual({ id: 'dnd5e-nature', label: 'Nature Bonus', type: 'number', value: 4 })
    expect(actual[0].stats[4]).toEqual({ id: 'dnd5e-religion', label: 'Religion Bonus', type: 'number', value: undefined })
  })
})
