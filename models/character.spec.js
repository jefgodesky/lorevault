import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import { createTestDocs } from '../test-utils.js'
import Character from './character.js'

describe('Character', () => {
  describe('Schema', () => {
    it('sets options from games specified by configuation', () => {
      const char = new Character()
      const { int, arcana, history, nature, religion } = char.dnd5e
      expect([int, arcana, history, nature, religion]).to.be.eql([0, 0, 0, 0, 0])
    })
  })

  describe('statics', () => {
    describe('create', () => {
      it('it creates a new character', async () => {
        const char = await Character.create()
        expect(char.constructor.modelName).to.be.equal('Character')
      })

      it('sets the character\'s page', async () => {
        const { page } = await createTestDocs(model)
        const char = await Character.create(page)
        expect(char.page).to.be.equal(page._id)
      })

      it('sets the character\'s player', async () => {
        const { page, user } = await createTestDocs(model)
        const char = await Character.create(page, user)
        expect(char.player).to.be.equal(user._id)
      })

      it('sets the character\'s statistics', async () => {
        const { page, user } = await createTestDocs(model)
        const char = await Character.create(page, user, { 'dnd5e-int': '3' })
        expect(char.dnd5e.int).to.be.equal(3)
      })
    })
  })
})