/* global describe, it, expect, afterAll */

const initViewOpts = require('./initViewOpts')
const { skin } = require('../config')

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

  it('passes skin from configuration', () => {
    const req = {}
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.skin).toEqual(skin)
  })
})
