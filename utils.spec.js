import { expect } from 'chai'
import { pickRandomNum } from './utils.js'

describe('pickRandomNum', () => {
  it('returns a number less than or equal to the maximum provided', () => {
    const rnd = pickRandomNum(1, 6)
    expect(rnd).to.be.most(6)
  })

  it('returns a number greater than or equal to the minimum provided', () => {
    const rnd = pickRandomNum(1, 6)
    expect(rnd).to.be.most(1)
  })
})
