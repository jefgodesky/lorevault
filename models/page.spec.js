import { expect } from 'chai'
import Page from './page.js'
import User from './user.js'

describe('Page', () => {
  describe('Presave', () => {
    describe('Created', () => {
      it('sets the created timestamp to the time when it is created', async () => {
        const start = new Date()
        const page = await Page.create({ title: 'Test' })
        await page.save()
        expect(page.created).to.be.least(start)
      })
    })

    describe('Modified', () => {
      it('sets the modified timestamp to the time when it is modified', async () => {
        const start = new Date()
        const page = await Page.create({ title: 'Test' })
        await page.save()
        expect(page.modified).to.be.least(start)
      })
    })
  })

  describe('methods', () => {
    describe('update', () => {
      it('updates the title', async () => {
        const user = await User.create({ name: 'Editor' })
        const page = await Page.create({ title: 'Before', body: 'This is the original text.' })
        await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(page.title).to.be.equal('After')
      })

      it('adds a new version', async () => {
        const user = await User.create({ name: 'Editor' })
        const page = await Page.create({ title: 'Before', body: 'This is the original text.' })
        await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(page.versions).to.have.lengthOf(1)
      })

      it('saves the body of the new version', async () => {
        const user = await User.create({ name: 'Editor' })
        const page = await Page.create({ title: 'Before', body: 'This is the original text.' })
        await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(page.versions[0].body).to.be.equal('This is the updated text.')
      })

      it('saves a commit message', async () => {
        const user = await User.create({ name: 'Editor' })
        const page = await Page.create({ title: 'Before', body: 'This is the original text.' })
        await page.update({ title: 'After', body: 'This is the updated text.', msg: 'This is an update.' }, user)
        expect(page.versions[0].msg).to.be.equal('This is an update.')
      })

      it('saves who made the change', async () => {
        const user = await User.create({ name: 'Editor' })
        const page = await Page.create({ title: 'Before', body: 'This is the original text.' })
        await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(page.versions[0].editor).to.be.equal(user._id)
      })

      it('saves when the change was made', async () => {
        const start = new Date()
        const user = await User.create({ name: 'Editor' })
        const page = await Page.create({ title: 'Before', body: 'This is the original text.' })
        await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(page.versions[0].timestamp).to.be.least(start)
      })
    })
  })
})