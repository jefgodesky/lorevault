import { expect } from 'chai'
import Secret from './secret.js'

describe('Secret', () => {
  describe('Constructor', () => {
    let num = 0
    const codenamer = () => {
      num++
      return `secret${num.toString().padStart(3, '0')}`
    }

    it('takes a codename', () => {
      const { codename } = new Secret({ codename: 'Wombat' })
      expect(codename).to.be.equal('Wombat')
    })

    it('takes a default codenaming function', () => {
      num = 0
      const { codename } = new Secret({}, codenamer)
      expect(codename).to.be.equal('secret001')
    })

    it('takes content', () => {
      num = 0
      const { content } = new Secret({ content: 'Hello world!' }, codenamer)
      expect(content).to.be.equal('Hello world!')
    })

    it('defaults content to a blank string', () => {
      num = 0
      const { content } = new Secret({}, codenamer)
      expect(content).to.be.equal('')
    })

    it('takes conditions', () => {
      num = 0
      const { conditions } = new Secret({ conditions: 'this and that' }, codenamer)
      expect(conditions).to.be.equal('this and that')
    })

    it('defaults conditions to a blank string', () => {
      num = 0
      const { conditions } = new Secret({}, codenamer)
      expect(conditions).to.be.equal('')
    })

    it('takes knowers', () => {
      num = 0
      const { knowers } = new Secret({ knowers: [1, 2, 3] }, codenamer)
      expect(knowers).to.be.eql([1, 2, 3])
    })

    it('defaults knowers to an empty array', () => {
      num = 0
      const { knowers } = new Secret({}, codenamer)
      expect(knowers).to.be.eql([])
    })

    it('takes checked', () => {
      num = 0
      const { checked } = new Secret({ checked: [1, 2, 3] }, codenamer)
      expect(checked).to.be.eql([1, 2, 3])
    })

    it('defaults checked to an empty array', () => {
      num = 0
      const { checked } = new Secret({}, codenamer)
      expect(checked).to.be.eql([])
    })
  })
})