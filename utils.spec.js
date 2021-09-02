import { expect } from 'chai'
import { pickRandomNum, pickRandom, union, intersection } from './utils.js'

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

describe('union', () => {
  it('returns the union of several arrays', () => {
    const a = [1, 2, 3]
    const b = [4, 5, 6]
    const c = [7, 8, 9]
    expect(union(a, b, c).join(' ')).to.be.equal('1 2 3 4 5 6 7 8 9')
  })

  it('removes duplicates', () => {
    const a = [1, 2, 3]
    const b = [3, 4, 5]
    const c = [5, 6, 7]
    expect(union(a, b, c).join(' ')).to.be.equal('1 2 3 4 5 6 7')
  })

  it('returns an empty array when given no arguments', () => {
    expect(union()).to.be.empty
  })
})

describe('intersection', () => {
  it('returns the intersection of several arrays', () => {
    const a = [1, 2, 3]
    const b = [2, 3, 4]
    const c = [3, 4, 5]
    expect(intersection(a, b, c).join(' ')).to.be.equal('3')
  })

  it('returns an empty array when there is no intersection', () => {
    const a = [1, 2, 3]
    const b = [3, 4, 5]
    const c = [5, 6, 7]
    expect(intersection(a, b, c)).to.be.empty
  })

  it('returns an empty array when given no arguments', () => {
    expect(intersection()).to.be.empty
  })
})
