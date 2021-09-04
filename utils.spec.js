import { expect } from 'chai'
import mongoose from 'mongoose'
const { model } = mongoose
import { createTestDocs } from './test-utils.js'
import {
  pickRandomNum,
  pickRandom,
  union,
  intersection,
  findOne,
  makeDiscreteQuery,
  match,
  isInSecret
} from './utils.js'

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

describe('findOne', () => {
  it('returns the first element that matches', () => {
    const arr = [{ code: 'blue', num: 1 }, { code: 'red', num: 2 }, { code: 'red', num: 3 }]
    expect(findOne(arr, el => el.code === 'red').num).to.be.equal(2)
  })

  it('returns null if nothing matches', () => {
    const arr = [{ code: 'blue', num: 1 }, { code: 'red', num: 2 }, { code: 'red', num: 3 }]
    expect(findOne(arr, el => el.code === 'yellow')).to.be.null
  })
})

describe('makeDiscreteQuery', () => {
  it('returns the search object for a loremaster', async () => {
    const { loremaster } = await createTestDocs(model)
    expect(makeDiscreteQuery({ test: 42 }, loremaster)).to.be.eql({ test: 42 })
  })

  it('adds that the page can\'t be a secret if you\'re anonymous', async () => {
    const { other } = await createTestDocs(model)
    expect(JSON.stringify(makeDiscreteQuery({ test: 42 }, other))).to.be.eql('{"$and":[{"test":42},{"secrets.existence":false}]}')
  })

  it('adds conditions if your character is your POV', async () => {
    const { user } = await createTestDocs(model)
    const { _id } = user.characters.active
    expect(JSON.stringify(makeDiscreteQuery({ test: 42 }, user))).to.be.eql(`{"$and":[{"test":42},{"$or":[{"secrets.existence":false},{"secrets.knowers":"${_id}"}]}]}`)
  })
})

describe('match', () => {
  it('returns an empty array if there are no matches', () => {
    const str = 'This is a Test. We are Testing. Test'
    expect(match(str, /^lol/m)).to.be.eql([])
  })

  it('returns an array of matches', () => {
    const str = 'This is a Test. We are Testing. Test'
    expect(match(str, /Test/m)).to.have.lengthOf(3)
  })

  it('reports the text for each match', () => {
    const str = 'This is a Test. We are Testing. Test'
    const actual = match(str, /Test/m)
    expect(actual.map(m => m.str)).to.be.eql(['Test', 'Test', 'Test'])
  })

  it('reports the index for each match', () => {
    const str = 'This is a Test. We are Testing. Test'
    const actual = match(str, /Test/m)
    expect(actual.map(m => m.index)).to.be.eql([10, 23, 32])
  })
})

describe('isInSecret', () => {
  it('returns false if the match is not in any secret', () => {
    const str = 'This is a test.'
    const actual = isInSecret(match(str, /test/)[0], str)
    expect(actual).to.be.false
  })

  it('returns the codename of the secret that the match is in', () => {
    const str = '||::Wombat:: This is a test.||'
    const actual = isInSecret(match(str, /test/)[0], str)
    expect(actual).to.be.equal('Wombat')
  })
})
