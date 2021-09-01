import { expect } from 'chai'
import { pickRandomNum } from './utils.js'
import { codenamer } from './test-utils.js'

describe('codenamer', () => {
  it('returns a new valid key each time', () => {
    const rnd = pickRandomNum(10, 100)
    const obj = {}
    for (let i = 0; i < rnd; i++) {
      const key = codenamer(obj)
      obj[key] = true
    }
    expect(Object.keys(obj)).to.have.lengthOf(rnd)
  })
})