import { expect } from 'chai'
import mongoose from 'mongoose'
const { model } = mongoose
import { createTestDocs } from './test-utils.js'
import {
  pickRandomNum,
  pickRandom,
  round,
  union,
  intersection,
  findOne,
  makeDiscreetQuery,
  match,
  saveBlocks,
  restoreBlocks,
  getReadableFileSize,
  isInSecret,
  indexOfRegExp,
  alphabetize,
  getS3,
  loadGames
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

describe('round', () => {
  it('rounds a number to a set number of decimal places', () => {
    const expected = [ 3, 3.1, 3.14, 3.142, 3.1416, 3.14159, 3.141593 ]
    const places = pickRandomNum(1, 6)
    const actual = round(3.14159265, places)
    expect(actual).to.be.equal(expected[places])
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

describe('makeDiscreetQuery', () => {
  it('returns the search object for a loremaster', async () => {
    const { loremaster } = await createTestDocs(model)
    expect(makeDiscreetQuery({ test: 42 }, loremaster)).to.be.eql({ test: 42 })
  })

  it('can take the string "Loremaster"', async () => {
    await createTestDocs(model)
    expect(makeDiscreetQuery({ test: 42 }, 'Loremaster')).to.be.eql({ test: 42 })
  })

  it('adds that the page can\'t be a secret if you\'re anonymous', async () => {
    const { other } = await createTestDocs(model)
    expect(JSON.stringify(makeDiscreetQuery({ test: 42 }, other))).to.be.eql('{"$and":[{"test":42},{"secrets.existence":false}]}')
  })

  it('can take the string "Anonymous"', async () => {
    await createTestDocs(model)
    expect(JSON.stringify(makeDiscreetQuery({ test: 42 }, 'Anonymous'))).to.be.eql('{"$and":[{"test":42},{"secrets.existence":false}]}')
  })

  it('adds conditions if your character is your POV', async () => {
    const { user } = await createTestDocs(model)
    const { _id } = user.characters.active
    expect(JSON.stringify(makeDiscreetQuery({ test: 42 }, user))).to.be.eql(`{"$and":[{"test":42},{"$or":[{"secrets.existence":false},{"secrets.knowers":"${_id}"}]}]}`)
  })

  it('treats any other searcher as anonymous', async () => {
    await createTestDocs(model)
    expect(JSON.stringify(makeDiscreetQuery({ test: 42 }, 42))).to.be.eql('{"$and":[{"test":42},{"secrets.existence":false}]}')
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

describe('saveBlocks', () => {
  it('replaces instances of the blocks', () => {
    const orig = 'The first rule of Unit Testing is you do not talk about Unit Testing.'
    const { str } = saveBlocks(orig, /Unit Testing/, 'REDACTED')
    expect(str).to.be.equal('The first rule of ####REDACTED0001#### is you do not talk about ####REDACTED0002####.')
  })

  it('saves information about each instance', () => {
    const orig = 'The first rule of Unit Testing is you do not talk about Unit Testing.'
    const { blocks } = saveBlocks(orig, /Unit Testing/, 'REDACTED')
    expect(blocks).to.have.lengthOf(2)
  })

  it('saves the original string from each instance', () => {
    const orig = 'The first rule of Unit Testing is you do not talk about Unit Testing.'
    const { blocks } = saveBlocks(orig, /Unit Testing/, 'REDACTED')
    expect(blocks.map(b => b.str)).to.be.eql(['Unit Testing', 'Unit Testing'])
  })

  it('saves the replacement used for each instance', () => {
    const orig = 'The first rule of Unit Testing is you do not talk about Unit Testing.'
    const { blocks } = saveBlocks(orig, /Unit Testing/, 'REDACTED')
    expect(blocks.map(b => b.key)).to.be.eql(['####REDACTED0001####', '####REDACTED0002####'])
  })
})

describe('restoreBlocks', () => {
  it('reverses saveBlocks', () => {
    const orig = 'The first rule of Unit Testing is you do not talk about Unit Testing.'
    const { str, blocks } = saveBlocks(orig, /Unit Testing/, 'REDACTED')
    const actual = restoreBlocks(str, blocks)
    expect(actual).to.be.equal(orig)
  })
})

describe('getReadableFileSize', () => {
  it('reports bytes', () => {
    expect(getReadableFileSize(21)).to.be.equal('21 B')
  })

  it('reports kilobytes', () => {
    expect(getReadableFileSize(4321)).to.be.equal('4.3 kB')
  })

  it('reports megabytes', () => {
    expect(getReadableFileSize(7654321)).to.be.equal('7.7 MB')
  })

  it('reports gigabytes', () => {
    expect(getReadableFileSize(9876543210)).to.be.equal('9.9 GB')
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

describe('indexOfRegExp', () => {
  it('returns first index of substring matching the regular expression', () => {
    const str = 'This is a test.'
    const actual = indexOfRegExp(str, /test/gm)
    expect(actual).to.be.equal(10)
  })

  it('returns -1 if nothing matches the regular expression', () => {
    const str = 'This is a test.'
    const actual = indexOfRegExp(str, /nope/gm)
    expect(actual).to.be.equal(-1)
  })

  it('can start from a position other than zero', () => {
    const str = 'This is a testy test.'
    const actual = indexOfRegExp(str, /test/gm, 11)
    expect(actual).to.be.equal(16)
  })
})

describe('alphabetize', () => {
  it('sorts an array into alphabetical order', () => {
    const arr = ['Boar', 'Deer', 'Coyote', 'Ape']
    expect(alphabetize(arr)).to.be.eql(['Ape', 'Boar', 'Coyote', 'Deer'])
  })

  it('can take a function to determine what to use for the strings', () => {
    const arr = [{ name: 'Boar' }, { name: 'Deer' }, { name: 'Coyote' }, { name: 'Ape' }]
    expect(alphabetize(arr, el => el.name)).to.be.eql([{ name: 'Ape' }, { name: 'Boar' }, { name: 'Coyote' }, { name: 'Deer' }])
  })
})

describe('getS3', () => {
  it('returns an S3 object', () => {
    const actual = getS3()
    expect(typeof actual.deleteObject).to.be.equal('function')
  })
})

describe('loadGames', () => {
  it('returns information about each game', async () => {
    const games = await loadGames()
    expect(games.dnd5e.info.sheet.length).to.be.equal(5)
  })
})
