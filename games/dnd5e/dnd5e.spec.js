import { expect } from 'chai'
import { info, roll, check } from './dnd5e.js'

describe('dnd5e', () => {
  describe('info', () => {
    it('exports basic game info', () => {
      const { id, name, edition } = info
      expect([id, name, edition]).to.be.eql(['dnd5e', 'Dungeons & Dragons',  '5th edition'])
    })

    it('exports stat ID\'s', () => {
      const { sheet } = info
      expect(sheet.map(s => s.id)).to.be.eql(['int', 'arcana', 'history', 'nature', 'religion'])
    })

    it('exports stat labels', () => {
      const { sheet } = info
      expect(sheet.map(s => s.label)).to.be.eql(['Intelligence', 'Arcana', 'History', 'Nature', 'Religion'])
    })

    it('exports detailed stat labels', () => {
      const { sheet } = info
      const expected = [
        'Intelligence Ability Modifier',
        'Intelligence (Arcana) Modifier',
        'Intelligence (History) Modifier',
        'Intelligence (Nature) Modifier',
        'Intelligence (Religion) Modifier'
      ]
      expect(sheet.map(s => s.detail)).to.eql(expected)
    })

    it('exports stat types', () => {
      const { sheet } = info
      expect(sheet.map(s => s.type)).to.be.eql([Number, Number, Number, Number, Number])
    })

    it('exports default values', () => {
      const { sheet } = info
      expect(sheet.map(s => s.default)).to.be.eql([0, 0, 0, 0, 0])
    })
  })

  describe('roll', () => {
    it('rolls 1d20', () => {
      const res = roll()
      expect(res).to.be.least(1)
      expect(res).to.be.most(20)
    })

    it('adds a modifier', () => {
      const res = roll({ modifier: 3 })
      expect(res).to.be.least(4)
      expect(res).to.be.most(23)
    })

    it('can set a floor', () => {
      const res = roll({ floor: 10 })
      expect(res).to.be.least(10)
      expect(res).to.be.most(20)
    })
  })

  describe('check', () => {
    it('returns true if you roll higher than or equal to the DC', () => {
      expect(check(1)).to.be.true
    })

    it('returns false if you roll lower than the DC', () => {
      expect(check(21)).to.be.false
    })
  })
})