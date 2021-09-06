import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import { createTestDocs } from '../test-utils.js'
import Character from './character.js'
import Page from './page.js'

describe('Character', () => {
  describe('Schema', () => {
    it('sets options from games specified by configuation', () => {
      const char = new Character()
      const { int, arcana, history, nature, religion } = char.dnd5e
      expect([int, arcana, history, nature, religion]).to.be.eql([0, 0, 0, 0, 0])
    })
  })

  describe('methods', () => {
    describe('update', () => {
      it('can change the character\'s page', async () => {
        const { page, user } = await createTestDocs(model)
        const char = await Character.create(page, user)
        const newPage = await Page.create({ title: 'Character Name', body: 'This is about the character.' }, user)
        await char.update(newPage)
        expect(char.page).to.be.equal(newPage._id)
      })

      it('can change the character\'s player', async () => {
        const { page, user, other } = await createTestDocs(model)
        const char = await Character.create(page, user)
        await char.update(page, other)
        expect(char.player).to.be.equal(other._id)
      })

      it('can change the character\'s statistics', async () => {
        const { page, user } = await createTestDocs(model)
        const char = await Character.create(page, user)
        await char.update(page, user, { 'dnd5e-int': '3' })
        expect(char.dnd5e.int).to.be.equal(3)
      })
    })
  })

  describe('statics', () => {
    describe('isClaimed', () => {
      it('returns the character\'s player if there is a character', async () => {
        const { page, user } = await createTestDocs(model)
        await Character.create(page, user)
        const check = await Character.isClaimed(page)
        expect(check._id).to.be.eql(user._id)
      })

      it('returns false if the page is not connected to a character', async () => {
        const { page, user } = await createTestDocs(model)
        const check = await Character.isClaimed(page)
        expect(check).to.be.false
      })
    })

    describe('create', () => {
      it('it creates a new character', async () => {
        const char = await Character.create()
        expect(char.constructor.modelName).to.be.equal('Character')
      })

      it('sets the character\'s name', async () => {
        const { page } = await createTestDocs(model)
        const char = await Character.create(page)
        expect(char.name).to.be.equal('Test Page')
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