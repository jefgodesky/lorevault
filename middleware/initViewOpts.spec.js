import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import { createTestDocs } from '../test-utils.js'
import initViewOpts from './initViewOpts.js'
import config from '../config/index.js'
const { name, skin, footer } = config

describe('initViewOpts', () => {
  it('sets the wiki name', () => {
    const req = {}
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.wiki).to.be.equal(name)
  })

  it('sets a title from query parameters', () => {
    const req = { query: { title: 'Test' } }
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.title).to.be.equal('Test')
  })

  it('sets a default title', () => {
    const req = {}
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.title).to.be.equal(name)
  })

  it('pulls the skin from the configuration', () => {
    const req = {}
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.skin).to.be.equal(skin)
  })

  it('pulls the footer from the configuration', () => {
    const req = {}
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.footer).to.be.equal(footer)
  })

  it('gets the point of view from an anonymous user', () => {
    const req = {}
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.pov).to.be.equal('Anonymous')
  })

  it('gets the point of view from a loremaster', async () => {
    const { loremaster } = await createTestDocs(model)
    const req = { user: loremaster }
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.pov).to.be.equal('Loremaster')
  })

  it('gets a user\'s point of view character name', async () => {
    const { user } = await createTestDocs(model)
    const req = { user }
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.pov).to.be.equal('Character 1')
  })

  it('passes query parameters along', () => {
    const req = { query: { x: 1, y: 2 } }
    initViewOpts(req, {}, () => {})
    expect(req.viewOpts.get).to.be.eql({ x: 1, y: 2 })
  })
})