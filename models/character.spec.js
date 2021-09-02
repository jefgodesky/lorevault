import { expect } from 'chai'
import Character from './character.js'

describe('Character', () => {
  describe('Schema', () => {
    it('sets options from games specified by configuation', () => {
      const char = new Character()
      const { int, arcana, history, nature, religion } = char.dnd5e
      expect([int, arcana, history, nature, religion]).to.be.eql([0, 0, 0, 0, 0])
    })
  })
})