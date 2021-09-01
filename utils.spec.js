import { expect } from 'chai'
import { pickRandomNum, pickRandom } from './utils.js'

describe('pickRandomNum', () => {
  it('returns a number less than or equal to the maximum provided', () => {
    const rnd = pickRandomNum(1, 6)
    expect(rnd).to.be.most(6)
  })

  it('returns a number greater than or equal to the minimum provided', () => {
    const rnd = pickRandomNum(1, 6)
    expect(rnd).to.be.least(1)
  })
})

describe('pickRandom', () => {
  it('returns a random element from the array', () => {
    const len = pickRandomNum(5, 10)
    const arr = []
    for (let i = 1; i < len; i++) arr.push(i)
    expect(arr).to.include(pickRandom(arr))
  })
})
