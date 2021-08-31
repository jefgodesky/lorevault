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
  })
})