import { expect } from 'chai'
import mongoose from 'mongoose'
const { model } = mongoose
import { pickRandomNum } from './utils.js'
import { createTestDocs, codenamer } from './test-utils.js'

describe('createTestDocs', () => {
  it('creates a user', async () => {
    const { user } = await createTestDocs(model)
    expect(user.constructor.modelName).to.be.equal('User')
  })

  it('gives the user two character', async () => {
    const { user } = await createTestDocs(model)
    expect(user.characters.list).to.have.lengthOf(2)
  })

  it('gives the user an active character', async () => {
    const { user } = await createTestDocs(model)
    const { active, list } = user.characters
    expect(active._id).to.be.eql(list[0]._id)
  })

  it('gives the user\'s POV to "Character"', async () => {
    const { user } = await createTestDocs(model)
    expect(user.pov).to.be.equal('Character')
  })

  it('creates a second user', async () => {
    const { other } = await createTestDocs(model)
    expect(other.constructor.modelName).to.be.equal('User')
  })

  it('creates two distinct users', async () => {
    const { user, other } = await createTestDocs(model)
    expect(user._id).not.to.be.equal(other._id)
  })

  it('creates a page', async () => {
    const { page } = await createTestDocs(model)
    expect(page.constructor.modelName).to.be.equal('Page')
  })

  it('sets the test page\'s title', async () => {
    const { page } = await createTestDocs(model)
    expect(page.title).to.be.equal('Test Page')
  })

  it('creates an initial version of the test page', async () => {
    const { page } = await createTestDocs(model)
    expect(page.versions).to.have.lengthOf(1)
  })

  it('sets the test page\'s initial text', async () => {
    const { page } = await createTestDocs(model, 'This is a test page.')
    expect(page.versions[0].body).to.be.equal('This is a test page.')
  })

  it('can set a default page text', async () => {
    const { page } = await createTestDocs(model)
    expect(page.versions[0].body).to.be.equal('This is the original text.')
  })
})

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