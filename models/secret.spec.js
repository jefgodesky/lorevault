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

    it('takes checked', () => {
      const { checked } = new Secret({ checked: [1, 2, 3] }, codenamer)
      expect(checked).to.be.eql([1, 2, 3])
    })

    it('defaults checked to an empty array', () => {
      const { checked } = new Secret({}, codenamer)
      expect(checked).to.be.eql([])
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
        expect(actual[0].checked).to.be.eql([])
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