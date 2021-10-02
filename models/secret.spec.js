import { expect } from 'chai'
import Secret from './secret.js'

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

  describe('Statics', () => {
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