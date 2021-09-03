import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import { createTestDocs } from '../test-utils.js'
import User from './user.js'
import Page from './page.js'
import Character from './character.js'

describe('User', () => {
  describe('methods', () => {
    describe('isLastConnection', () => {
      it('returns true if it\'s your last connection', async () => {
        const user = await User.create({ name: 'Tester', login: { google: 'google' } })
        expect(user.isLastConnection('google')).to.be.true
      })

      it('returns false if it isn\'t your last connection', async () => {
        const user = await User.create({ name: 'Tester', login: { google: 'google', discord: 'discord' } })
        expect(user.isLastConnection('google')).to.be.false
      })
    })

    describe('disconnect', () => {
      it('won\'t remove your last connection', async () => {
        const user = await User.create({ name: 'Tester', login: { google: 'google' } })
        const actual = await user.disconnect('google')
        expect(actual).to.be.false
        expect(user.login.google).not.to.be.undefined
      })

      it('will remove a connection if you have another', async () => {
        const user = await User.create({ name: 'Tester', login: { google: 'google', discord: 'discord' } })
        const actual = await user.disconnect('google')
        expect(actual).to.be.true
        expect(user.login.google).to.be.undefined
        expect(user.login.discord).not.to.be.undefined
      })
    })

    describe('claim', () => {
      it('claims a character', async () => {
        const { page, user } = await createTestDocs(model)
        await user.claim(page)
        expect(user.characters.list).to.have.lengthOf(1)
      })

      it('makes it the active character if you didn\'t have one before', async () => {
        const { page, user } = await createTestDocs(model)
        await user.claim(page)
        expect(user.characters.active._id).to.be.equal(user.characters.list[0]._id)
      })

      it('leaves your active character alone if you have one', async () => {
        const { page, user } = await createTestDocs(model)
        await user.claim(page)
        const charPage = await Page.create({ title: 'Character Page', body: 'Hello, world!' }, user)
        await user.claim(charPage)
        expect(user.characters.active._id).to.be.equal(user.characters.list[0]._id)
      })

      it('sets your POV if you were previously anonymous', async () => {
        const { page, user } = await createTestDocs(model)
        await user.claim(page)
        expect(user.pov).to.be.equal('Character')
      })

      it('won\'t let you claim someone else\'s character', async () => {
        const { page, user, other } = await createTestDocs(model)
        await user.claim(page)
        await other.claim(page)
        expect(other.characters.list).to.have.lengthOf(0)
      })

      it('returns false if someone else has already claimed this character', async () => {
        const { page, user, other } = await createTestDocs(model)
        await user.claim(page)
        const res = await other.claim(page)
        expect(res).to.be.false
      })

      it('leaves your active character alone if you failed to claim the character', async () => {
        const { page, user, other } = await createTestDocs(model)
        await user.claim(page)
        await other.claim(page)
        expect(other.characters.active).to.be.undefined
      })

      it('leaves your POV alone if you failed to claim the character', async () => {
        const { page, user, other } = await createTestDocs(model)
        await user.claim(page)
        await other.claim(page)
        expect(other.pov).to.be.equal('Anonymous')
      })
    })

    describe('release', () => {
      it('releases a character you claimed', async () => {
        const { page, user } = await createTestDocs(model)
        await user.claim(page)
        await user.release(user.characters.list[0])
        expect(user.characters.list).to.be.empty
      })

      it('can release your active character', async () => {
        const { page, user } = await createTestDocs(model)
        await user.claim(page)
        await user.release(user.characters.list[0])
        expect(user.characters.active).to.be.undefined
      })

      it('sets your active character to the first one remaining in your list', async () => {
        const { page, user } = await createTestDocs(model)
        await user.claim(page)
        const charPage = await Page.create({ title: 'Character Page', body: 'Hello, world!' }, user)
        await user.claim(charPage)
        await user.release(user.characters.list[0])
        expect(user.characters.active._id).to.be.equal(user.characters.list[0]._id)
      })

      it('shifts your POV to anonymous if it was "Character" and you just released your last one', async () => {
        const { page, user } = await createTestDocs(model)
        await user.claim(page)
        await user.release(user.characters.list[0])
        expect(user.pov).to.be.equal('Anonymous')
      })

      it('doesn\'t touch your POV if it\'s "Loremaster"', async () => {
        const { page, user } = await createTestDocs(model)
        await user.claim(page)
        user.pov = 'Loremaster'
        expect(user.pov).to.be.equal('Loremaster')
      })

      it('doesn\'t touch your POV if you still have characters', async () => {
        const { page, user } = await createTestDocs(model)
        await user.claim(page)
        const charPage = await Page.create({ title: 'Character Page', body: 'Hello, world!' }, user)
        await user.claim(charPage)
        await user.release(user.characters.list[0])
        expect(user.pov).to.be.equal('Character')
      })

      it('deletes the character from the database', async () => {
        const { page, user } = await createTestDocs(model)
        await user.claim(page)
        const id = user.characters.active._id
        await user.release(user.characters.list[0])
        const check = await Character.findById(id)
        expect(check).to.be.null
      })
    })
  })
})