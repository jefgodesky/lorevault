/* global describe, it, expect */

const parse = require('./parse')

describe('dnd5e parse', () => {
  it('removes intelligence checks', () => {
    const dc = Math.floor(Math.random() * 20) + 10
    const actual = parse(`Something before. [Intelligence DC ${dc}] Something after.`)
    expect(actual).toEqual('Something before.  Something after.')
  })

  it('removes arcana checks', () => {
    const dc = Math.floor(Math.random() * 20) + 10
    const actual = parse(`Something before. [Arcana DC ${dc}] Something after.`)
    expect(actual).toEqual('Something before.  Something after.')
  })

  it('removes history checks', () => {
    const dc = Math.floor(Math.random() * 20) + 10
    const actual = parse(`Something before. [History DC ${dc}] Something after.`)
    expect(actual).toEqual('Something before.  Something after.')
  })

  it('removes nature checks', () => {
    const dc = Math.floor(Math.random() * 20) + 10
    const actual = parse(`Something before. [Nature DC ${dc}] Something after.`)
    expect(actual).toEqual('Something before.  Something after.')
  })

  it('removes religion checks', () => {
    const dc = Math.floor(Math.random() * 20) + 10
    const actual = parse(`Something before. [Religion DC ${dc}] Something after.`)
    expect(actual).toEqual('Something before.  Something after.')
  })
})
