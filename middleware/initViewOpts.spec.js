/* global describe, it, expect, afterAll */

const initViewOpts = require('./initViewOpts')

describe('initViewOpts', () => {
  it('says you\'re not logged in if the request has no user', () => {
    const req = {}
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.isLoggedIn).toEqual(false)
  })

  it('says you\'re logged in if the request has a user', () => {
    const req = { user: 1234 }
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.isLoggedIn).toEqual(true)
  })

  it('provides the user\'s active character', () => {
    const req = { user: { active: { name: 'Tester' } } }
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.char).toEqual(req.user.active)
  })
})
