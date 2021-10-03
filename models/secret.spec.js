import { expect } from 'chai'
import mongoose from 'mongoose'
const { model } = mongoose

import Secret from './secret.js'
import { match } from '../utils.js'
import { createTestDocs } from '../test-utils.js'

describe('Secret', () => {
  let num = 0
  const codenamer = () => {
    num++
    return `secret${num.toString().padStart(3, '0')}`
  }

  beforeEach(() => { num = 0 })

  describe('Constructor', () => {
    it('takes a codename', () => {
      const { codename } = new Secret({ codename: 'Wombat' })
      expect(codename).to.be.equal('Wombat')
    })

    it('takes a default codenaming function', () => {
      const { codename } = new Secret({}, codenamer)
      expect(codename).to.be.equal('secret001')
    })

    it('takes content', () => {
      const { content } = new Secret({ content: 'Hello world!' }, codenamer)
      expect(content).to.be.equal('Hello world!')
    })

    it('defaults content to a blank string', () => {
      const { content } = new Secret({}, codenamer)
      expect(content).to.be.equal('')
    })

    it('takes conditions', () => {
      const { conditions } = new Secret({ conditions: 'this and that' }, codenamer)
      expect(conditions).to.be.equal('this and that')
    })

    it('defaults conditions to a blank string', () => {
      const { conditions } = new Secret({}, codenamer)
      expect(conditions).to.be.equal('')
    })

    it('takes knowers', () => {
      const { knowers } = new Secret({ knowers: [1, 2, 3] }, codenamer)
      expect(knowers).to.be.eql([1, 2, 3])
    })

    it('defaults knowers to an empty array', () => {
      const { knowers } = new Secret({}, codenamer)
      expect(knowers).to.be.eql([])
    })
  })

  describe('Methods', () => {
    describe('reveal', () => {
      it('reveals a secret to a character', async () => {
        const { user } = await createTestDocs(model)
        const { active } = user.characters
        const secret = new Secret({ knowers: [] }, codenamer)
        secret.reveal(active)
        expect(secret.knowers).to.include(active._id.toString())
      })

      it('doesn\'t add duplicates', async () => {
        const { user } = await createTestDocs(model)
        const { active } = user.characters
        const secret = new Secret({ knowers: [] }, codenamer)
        secret.reveal(active)
        secret.reveal(active)
        expect(secret.knowers).to.have.lengthOf(1)
      })
    })

    describe('revealToPage', async () => {
      it('reveals to the page\'s character', async () => {
        const Character = model('Character')
        const { user } = await createTestDocs(model)
        const { active } = user.characters
        const secret = new Secret({ knowers: [] }, codenamer)
        await secret.revealToPage(active.page, { Character })
        expect(secret.knowers).to.include(active._id.toString())
      })

      it('does nothing if the page doesn\'t have a character', async () => {
        const Character = model('Character')
        const { page } = await createTestDocs(model)
        const secret = new Secret({ knowers: [] }, codenamer)
        await secret.revealToPage(page, { Character })
        expect(secret.knowers).to.have.lengthOf(0)
      })
    })

    describe('revealToCategory', () => {
      it('reveals the secret to every character in a category', async () => {
        const Page = model('Page')
        const Character = model('Character')
        const { user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const c1 = await Page.findById(user.characters.list[0].page)
        const c2 = await Page.findById(user.characters.list[1].page)
        await c1.update({ title: 'Character 1', body: '[[Category:Adventuring Party]]' }, user)
        await c2.update({ title: 'Character 2', body: '[[Category:Adventuring Party]]' }, user)
        const secret = new Secret({ knowers: [] }, codenamer)
        await secret.revealToCategory('Adventuring Party', { Page, Character })
        const actual = user.characters.list.map(c => secret.knows(c))
        expect(actual).to.be.eql([true, true])
      })

      it('is recursive', async () => {
        const Page = model('Page')
        const Character = model('Character')
        const { user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        await Page.create({ title: 'Category:Adventurers', body: 'These are adventurers.' }, user)
        await Page.create({ title: 'Category:Fighting Men', body: '[[Category:Adventurers]]' }, user)
        await Page.create({ title: 'Category:Magic Users', body: '[[Category:Adventurers]]' }, user)
        await Page.create({ title: 'Category:Sneaky Guys', body: '[[Category:Adventurers]]' }, user)
        const fighter = await Page.create({ title: 'Fighting Man', body: '[[Category:Fighting Men]]' }, user)
        const mage = await Page.create({ title: 'Magus Magickman', body: '[[Category:Magic Users]]' }, user)
        const thief = await Page.create({ title: 'Sneak Sneakersson', body: '[[Category:Sneaky Guys]]' }, user)
        user.claim(fighter)
        user.claim(mage)
        user.claim(thief)
        const secret = new Secret({ knowers: [] }, codenamer)
        await secret.revealToCategory('Adventurers', { Page, Character })
        const actual = user.characters.list.map(c => secret.knows(c))
        expect(actual).to.be.eql([false, false, true, true, true])
      })
    })

    describe('revealToName', () => {
      it('reveals a secret to a character', async () => {
        const Page = model('Page')
        const Character = model('Character')
        const { user } = await createTestDocs(model)
        const page = await Page.findById(user.characters.active.page)
        const secret = new Secret({ knowers: [] }, codenamer)
        await secret.revealToNames(page.title, { Page, Character })
        expect(secret.knowers).to.include(user.characters.active._id.toString())
      })

      it('reveals the secret to every character in a category', async () => {
        const Page = model('Page')
        const Character = model('Character')
        const { user } = await createTestDocs(model)
        const c1 = await Page.findById(user.characters.list[0].page)
        const c2 = await Page.findById(user.characters.list[1].page)
        await c1.update({ title: 'Character 1', body: '[[Category:Adventuring Party]]' }, user)
        await c2.update({ title: 'Character 2', body: '[[Category:Adventuring Party]]' }, user)
        const secret = new Secret({ knowers: [] }, codenamer)
        await secret.revealToNames('Adventuring Party', { Page, Character })
        const actual = user.characters.list.map(c => secret.knows(c))
        expect(actual).to.be.eql([true, true])
      })

      it('is recursive', async () => {
        const Page = model('Page')
        const Character = model('Character')
        const { user } = await createTestDocs(model)
        await Page.create({ title: 'Category:Adventurers', body: 'These are adventurers.' }, user)
        await Page.create({ title: 'Category:Fighting Men', body: '[[Category:Adventurers]]' }, user)
        await Page.create({ title: 'Category:Magic Users', body: '[[Category:Adventurers]]' }, user)
        await Page.create({ title: 'Category:Sneaky Guys', body: '[[Category:Adventurers]]' }, user)
        const fighter = await Page.create({ title: 'Fighting Man', body: '[[Category:Fighting Men]]' }, user)
        const mage = await Page.create({ title: 'Magus Magickman', body: '[[Category:Magic Users]]' }, user)
        const thief = await Page.create({ title: 'Sneak Sneakersson', body: '[[Category:Sneaky Guys]]' }, user)
        user.claim(fighter)
        user.claim(mage)
        user.claim(thief)
        const secret = new Secret({ knowers: [] }, codenamer)
        await secret.revealToNames('Adventurers', { Page, Character })
        const actual = user.characters.list.map(c => secret.knows(c))
        expect(actual).to.be.eql([false, false, true, true, true])
      })

      it('reveals to several names', async () => {
        const Page = model('Page')
        const Character = model('Character')
        const { user } = await createTestDocs(model)
        await Page.create({ title: 'Category:Adventurers', body: 'These are adventurers.' }, user)
        await Page.create({ title: 'Category:Fighting Men', body: '[[Category:Adventurers]]' }, user)
        await Page.create({ title: 'Category:Magic Users', body: '[[Category:Adventurers]]' }, user)
        await Page.create({ title: 'Category:Sneaky Guys', body: '[[Category:Adventurers]]' }, user)
        const larry = await Page.create({ title: 'Larry', body: 'This is about Larry.' }, user)
        const fighter = await Page.create({ title: 'Fighting Man', body: '[[Category:Fighting Men]]' }, user)
        const mage = await Page.create({ title: 'Magus Magickman', body: '[[Category:Magic Users]]' }, user)
        const thief = await Page.create({ title: 'Sneak Sneakersson', body: '[[Category:Sneaky Guys]]' }, user)
        user.claim(larry)
        user.claim(fighter)
        user.claim(mage)
        user.claim(thief)
        const secret = new Secret({ knowers: [] }, codenamer)
        await secret.revealToNames('Adventurers, Larry', { Page, Character })
        const actual = user.characters.list.map(c => secret.knows(c))
        expect(actual).to.be.eql([false, false, true, true, true, true])
      })

      it('can also take a semicolon-separated list', async () => {
        const Page = model('Page')
        const Character = model('Character')
        const { user } = await createTestDocs(model)
        const { list } = user.characters
        const secret = new Secret({ knowers: [] }, codenamer)
        await secret.revealToNames(list.map(c => c.name).join(';'), { Page, Character })
        expect(secret.knowers).to.be.eql(list.map(c => c._id.toString()))
      })
    })

    describe('knows', () => {
      it('tells you that a character knows', async () => {
        const { user } = await createTestDocs(model)
        const { active } = user.characters
        const secret = new Secret({ knowers: [active._id.toString()] }, codenamer)
        expect(secret.knows(active)).to.be.true
      })

      it('tells you that a character doesn\'t know', async () => {
        const { user } = await createTestDocs(model)
        const { active } = user.characters
        const secret = new Secret({}, codenamer)
        expect(secret.knows(active)).to.be.false
      })

      it('tells you that loremaster always knows', () => {
        const secret = new Secret({}, codenamer)
        expect(secret.knows('Loremaster')).to.be.true
      })

      it('tells you that anonymous never knows', () => {
        const secret = new Secret({}, codenamer)
        expect(secret.knows('Anonymous')).to.be.false
      })
    })

    describe('render', () => {
      it('renders the full secret', () => {
        const secret = new Secret({ codename: 'Wombat', conditions: 'this and that', content: 'Hello world!' })
        expect(secret.render()).to.be.equal('<secret codename="Wombat" conditions="this and that">Hello world!</secret>')
      })

      it('drops conditions if there are none', () => {
        const secret = new Secret({ codename: 'Wombat', content: 'Hello world!' })
        expect(secret.render()).to.be.equal('<secret codename="Wombat">Hello world!</secret>')
      })

      it('drops conditions if they\'re an empty string', () => {
        const secret = new Secret({ codename: 'Wombat', conditions: '', content: 'Hello world!' })
        expect(secret.render()).to.be.equal('<secret codename="Wombat">Hello world!</secret>')
      })

      it('can render a placeholder', () => {
        const secret = new Secret({ codename: 'Wombat', content: 'Hello world!' })
        expect(secret.render('placeholder')).to.be.equal('<secret codename="Wombat"></secret>')
      })

      it('can render the content', () => {
        const secret = new Secret({ codename: 'Wombat', content: 'Hello world!' })
        expect(secret.render('reading')).to.be.equal('Hello world!')
      })
    })
  })

  describe('Statics', () => {
    describe('getCharID', () => {
      it('returns a character\'s ID', async () => {
        const { user } = await createTestDocs(model)
        const { active } = user.characters
        expect(Secret.getCharID(active)).to.be.equal(active._id.toString())
      })

      it('returns a user\'s active character\'s ID', async () => {
        const { user } = await createTestDocs(model)
        const { active } = user.characters
        expect(Secret.getCharID(user)).to.be.equal(active._id.toString())
      })

      it('returns the string form of a character\'s ID', async () => {
        const { user } = await createTestDocs(model)
        const { active } = user.characters
        expect(Secret.getCharID(active._id)).to.be.equal(active._id.toString())
      })

      it('returns the string form of a character\'s ID when given that', async () => {
        const { user } = await createTestDocs(model)
        const { active } = user.characters
        expect(Secret.getCharID(active._id.toString())).to.be.equal(active._id.toString())
      })

      it('returns the string of anything else', async () => {
        expect(Secret.getCharID({ test: 42 })).to.be.equal('[object Object]')
      })
    })

    describe('isInSecret', () => {
      it('returns false if the match is not in any secret', () => {
        const str = 'This is a test.'
        const actual = Secret.isInSecret(match(str, /test/)[0], str)
        expect(actual).to.be.false
      })

      it('returns the codename of the secret that the match is in', () => {
        const str = '<secret codename="Wombat">This is a test.</secret>'
        const actual = Secret.isInSecret(match(str, /test/)[0], str)
        expect(actual).to.be.equal('Wombat')
      })

      it('returns true if the match is in a secret with no codename', () => {
        const str = '<secret>This is a test.</secret>'
        const actual = Secret.isInSecret(match(str, /test/)[0], str)
        expect(actual).to.be.true
      })
    })

    describe('parse', () => {
      it('parses a secret', () => {
        const str = 'A paragraph before.\n\nSome text before <secret>the terrible secret</secret>. Then some more text.\n\nAnd a paragraph below.'
        const actual = Secret.parse(str, codenamer)
        expect(actual).to.have.lengthOf(1)
        expect(actual[0].codename).to.be.equal('secret001')
        expect(actual[0].content).to.be.equal('the terrible secret')
        expect(actual[0].conditions).to.be.equal('')
        expect(actual[0].knowers).to.be.eql([])
      })

      it('parses many secrets', () => {
        const str = '<secret>1</secret> <secret>2</secret> <secret>3</secret>'
        const actual = Secret.parse(str, codenamer)
        expect(actual).to.have.lengthOf(3)
      })

      it('parses codenames', () => {
        const str = '<secret codename="Wombat">This is a secret</secret>'
        const actual = Secret.parse(str, codenamer)
        expect(actual[0].codename).to.be.equal('Wombat')
      })

      it('parses conditions', () => {
        const str = '<secret conditions="[Volaarun-speaker]">This is a secret</secret>'
        const actual = Secret.parse(str, codenamer)
        expect(actual[0].conditions).to.be.equal('[Volaarun-speaker]')
      })
    })
  })
})