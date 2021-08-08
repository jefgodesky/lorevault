/* global describe, it, expect */

const checkSecret = require('./check')

describe('dnd5e checkSecret', () => {
  it('returns true if a check passes', () => {
    const char = { dnd5e: { int: 0, arcana: 0, history: 0, nature: 0, religion: 0 } }
    const actual = checkSecret('[Intelligence DC 0] You would never want to actually do this, but it allows us to write a deterministic unit test.', char)
    expect(actual).toEqual(true)
  })

  it('returns false if all checks fail', () => {
    const char = { dnd5e: { int: 0, arcana: 0, history: 0, nature: 0, religion: 0 } }
    const actual = checkSecret('[Intelligence DC 21] You would never want to actually do this, but it allows us to write a deterministic unit test.', char)
    expect(actual).toEqual(false)
  })
})
