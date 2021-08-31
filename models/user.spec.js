import { expect } from 'chai'
import User from './user.js'

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
  })
})