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
    describe('getCurr', () => {
      it('returns the most recent version of the page', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is an updated page.' }, user)
        expect(page.getCurr().body).to.be.equal('This is an updated page.')
      })
    })

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

    describe('findSecret', () => {
      it('returns the secret with that codename', async () => {
        const { page } = await createTestDocs(model, '||::Wombat:: This is the secret.||')
        expect(page.findSecret('Wombat').content).to.be.equal('This is the secret.')
      })

      it('returns null if the page doesn\'t have any secret with that codename', async () => {
        const { page } = await createTestDocs(model)
        expect(page.findSecret('Wombat')).to.be.null
      })

      it('returns who knows about the page if it\'s a secret and you provide a falsy codename', async () => {
        const { page } = await createTestDocs(model)
        page.secrets.existence = true
        expect(page.findSecret().knowers).to.be.eql([])
      })

      it('returns null if you provide a falsy codename but the page isn\'t a secret', async () => {
        const { page } = await createTestDocs(model)
        expect(page.findSecret()).to.be.null
      })
    })

    describe('processSecrets', () => {
      it('adds new secrets', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        expect(page.secrets.list).to.have.lengthOf(1)
      })

      it('uses a new secret\'s codename', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        expect(page.secrets.list[0].codename).to.be.equal('Wombat')
      })

      it('adds a new secret\'s contents to the list', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        expect(page.secrets.list[0].content).to.be.equal('This is a new secret.')
      })

      it('starts off a new secret with the person who wrote it knowing it', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        expect(page.secrets.list[0].knowers.join(' ')).to.be.equal(user._id.toString())
      })

      it('updates the content of a secret if the editor knows the secret', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        await page.processSecrets({ Wombat: { content: 'Updated secret.' } }, user)
        expect(page.secrets.list[0].content).to.be.equal('Updated secret.')
      })

      it('can delete a secret if the editor knows about it', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        await page.processSecrets({}, user)
        expect(page.secrets.list).to.be.empty
      })

      it('doesn\'t change the secret if the editor doesn\'t know it', async () => {
        const { page, user, other } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        await page.processSecrets({ Wombat: { content: 'Updated secret.' } }, other)
        expect(page.secrets.list[0].content).to.be.equal('This is a new secret.')
      })

      it('keeps secrets that an editor might delete if she doesn\'t know it', async () => {
        const { page, user, other } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        await page.processSecrets({}, other)
        expect(page.secrets.list[0].content).to.be.equal('This is a new secret.')
      })
    })

    describe('reveal', () => {
      it('reveals a secret to a character', async () => {
        const { page, user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        await page.reveal(user.characters.active, 'Wombat')
        expect(page.secrets.list[0].knowers).to.include(user.characters.active._id)
      })

      it('returns true when the secret is revealed', async () => {
        const { page, user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const res = await page.reveal(user.characters.active, 'Wombat')
        expect(res).to.be.true
      })

      it('can reveal the page', async () => {
        const { page, user } = await createTestDocs(model)
        page.secrets.existence = true
        await page.reveal(user.characters.active)
        expect(page.secrets.knowers).to.include(user.characters.active._id)
      })

      it('returns false when there\'s no such secret to reveal', async () => {
        const { page, user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const res = await page.reveal(user.characters.active, 'Aardvark')
        expect(res).to.be.false
      })
    })

    describe('knows', () => {
      it('returns true if the character knows the secret', async () => {
        const { page, user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        expect(page.knows(user, 'Wombat')).to.be.true
      })

      it('returns true if there is no such secret secret', async () => {
        const { page, user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        expect(page.knows(user, 'Aardvark')).to.be.true
      })

      it('returns false if the character doesn\'t know the secret', async () => {
        const { page, other } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        expect(page.knows(other, 'Wombat')).to.be.false
      })

      it('returns true if the character knows about the page and the page is a secret', async () => {
        const { page, user } = await createTestDocs(model)
        page.secrets.existence = true
        page.secrets.knowers.addToSet(user._id)
        expect(page.knows(user)).to.be.true
      })

      it('returns false if the character doesn\'t know about the page and the page is a secret', async () => {
        const { page, user } = await createTestDocs(model)
        page.secrets.existence = true
        expect(page.knows(user)).to.be.false
      })

      it('returns true if the page isn\'t a secret', async () => {
        const { page, user } = await createTestDocs(model)
        expect(page.knows(user)).to.be.true
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

      it('assigns codenames to secrets', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: page.title, body: '||This is a secret.||' }, user)
        expect(actual.versions[1].body.match(/||::.*?::|| This is a secret\.||/)).not.to.be.undefined
      })

      it('records secrets', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: page.title, body: '||This is a secret.||' }, user)
        expect(actual.versions[1].body.match(/||::.*?::|| This is a secret\.||/)).not.to.be.undefined
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