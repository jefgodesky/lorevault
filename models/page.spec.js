import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import { createTestDocs } from '../test-utils.js'
import Page from './page.js'
import User from './user.js'

describe('Page', () => {
  describe('Presave', () => {
    describe('Created', () => {
      it('sets the created timestamp to the time when it is created', async () => {
        const start = new Date()
        const { page } = await createTestDocs(model)
        await page.save()
        expect(page.created).to.be.least(start)
      })
    })

    describe('Modified', () => {
      it('sets the modified timestamp to the time when it is modified', async () => {
        const start = new Date()
        const { page } = await createTestDocs(model)
        await page.save()
        expect(page.modified).to.be.least(start)
      })
    })
  })

  describe('methods', () => {
    describe('findCodename', () => {
      it('returns a random codename', async () => {
        const { page } = await createTestDocs(model)
        expect(page.findCodename()).to.be.a('string')
      })

      it('can produce 110 codenames', async () => {
        const { page } = await createTestDocs(model)
        for (let i = 0; i < 110; i++) {
          const codename = page.findCodename()
          page.secrets.list.push({ codename, content: 'Test', knowers: [] })
        }
        expect(page.secrets.list).to.have.lengthOf(110)
      })
    })

    describe('update', () => {
      it('returns a page', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.constructor.modelName).to.be.equal('Page')
      })

      it('updates the title', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.title).to.be.equal('After')
      })

      it('adds a new version', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.versions).to.have.lengthOf(2)
      })

      it('saves the body of the new version', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.versions[1].body).to.be.equal('This is the updated text.')
      })

      it('saves a commit message', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.', msg: 'This is an update.' }, user)
        expect(actual.versions[1].msg).to.be.equal('This is an update.')
      })

      it('saves who made the change', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.versions[1].editor).to.be.equal(user._id)
      })

      it('saves when the change was made', async () => {
        const start = new Date()
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.versions[1].timestamp).to.be.least(start)
      })
    })
  })

  describe('statics', () => {
    describe('create', () => {
      it('creates a new page', async () => {
        const { page } = await createTestDocs(model)
        expect(page.constructor.modelName).to.be.equal('Page')
      })

      it('sets the page\'s title', async () => {
        const { page } = await createTestDocs(model)
        expect(page.title).to.be.equal('Test Page')
      })

      it('creates an initial version', async () => {
        const { page } = await createTestDocs(model)
        expect(page.versions).to.have.lengthOf(1)
      })

      it('sets a default msg for the initial version', async () => {
        const { page } = await createTestDocs(model)
        expect(page.versions[0].msg).to.be.equal('Initial text')
      })

      it('allows a different msg if you provide one', async () => {
        const user = await User.create({ name: 'Editor' })
        const page = await Page.create({ title: 'Test Page', body: 'This is the original text.', msg: 'First!' }, user)
        expect(page.versions[0].msg).to.be.equal('First!')
      })
    })
  })
})