import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import Page from '../models/page.js'
import User from '../models/user.js'
import { createTestDocs } from '../test-utils.js'
import processCharacterForm from './processCharacterForm.js'

describe('processCharacterForm', () => {
  it('redirects to the front page if there is no user', async () => {
    const req = {}
    const res = { redirect: url => res.url = url }
    await processCharacterForm(req, res, () => {})
    expect(res.url).to.be.equal('/')
  })

  it('adds an error if the page doesn\'t exist', async () => {
    const { user } = await createTestDocs(model)
    const req = { user, viewOpts: {}, body: { path: '/nothere' } }
    const res = { redirect: url => res.url = url }
    await processCharacterForm(req, res, () => {})
    expect(req.viewOpts.errors.path).to.be.equal('<code>/nothere</code> is not a path for any page on this wiki.')
  })

  it('adds an error if you try to take someone else\'s character', async () => {
    const { user, other } = await createTestDocs(model)
    const page = await Page.findById(user.characters.active.page)
    const req = { user: other, viewOpts: {}, body: { path: `/${page.path}` } }
    const res = { redirect: url => res.url = url }
    await processCharacterForm(req, res, () => {})
    expect(req.viewOpts.errors.path).to.be.equal('Character 1 has already been claimed as a character by someone else.')
  })

  it('can create a new character for you', async () => {
    const { user } = await createTestDocs(model)
    const page = await Page.create({ title: 'New Character', body: 'Hello, world!' }, user)
    const req = { user, viewOpts: {}, body: { path: `/${page.path}` } }
    const res = { redirect: url => res.url = url }
    await processCharacterForm(req, res, () => {})
    const after = await User.findById(user._id).populate('characters.list')
    const actual = after.characters.list[1]
    expect(actual.player).to.be.eql(user._id)
  })

  it('sets the new character\'s page', async () => {
    const { user } = await createTestDocs(model)
    const page = await Page.create({ title: 'New Character', body: 'Hello, world!' }, user)
    const req = { user, viewOpts: {}, body: { path: `/${page.path}` } }
    const res = { redirect: url => res.url = url }
    await processCharacterForm(req, res, () => {})
    const after = await User.findById(user._id).populate('characters.list')
    const actual = after.characters.list[1]
    expect(actual.page._id).to.be.eql(page._id)
  })

  it('sets the new character\'s game stats', async () => {
    const { user } = await createTestDocs(model)
    const page = await Page.create({ title: 'New Character', body: 'Hello, world!' }, user)
    const req = { user, viewOpts: {}, body: { path: `/${page.path}`, 'dnd5e-int': 3 } }
    const res = { redirect: url => res.url = url }
    await processCharacterForm(req, res, () => {})
    const after = await User.findById(user._id).populate('characters.list')
    const actual = after.characters.list[2]
    expect(actual.dnd5e.int).to.be.equal(3)
  })

  it('sets the new character\'s game tags', async () => {
    const { user } = await createTestDocs(model)
    const page = await Page.create({ title: 'New Character', body: 'Hello, world!' }, user)
    const req = { user, viewOpts: {}, body: { path: `/${page.path}`, tags: 'Test; Another tag, unit test' } }
    const res = { redirect: url => res.url = url }
    await processCharacterForm(req, res, () => {})
    const after = await User.findById(user._id).populate('characters.list')
    const actual = after.characters.list[2]
    expect(actual.tags).to.be.eql(['Test', 'Another tag', 'unit test'])
  })

  it('updates an existing character\'s game stats', async () => {
    const { user } = await createTestDocs(model)
    const { active } = user.characters
    const page = await Page.findById(active.page)
    const req = { user, viewOpts: {}, body: { path: `/${page.path}`, 'dnd5e-int': 3 } }
    const res = { redirect: url => res.url = url }
    await processCharacterForm(req, res, () => {})
    const after = await User.findById(user._id).populate('characters.active')
    const actual = after.characters.active
    expect(actual.dnd5e.int).to.be.equal(3)
  })

  it('updates an existing character\'s tags', async () => {
    const { user } = await createTestDocs(model)
    const { active } = user.characters
    const page = await Page.findById(active.page)
    const req = { user, viewOpts: {}, body: { path: `/${page.path}`, tags: 'Test; Another tag, unit test' } }
    const res = { redirect: url => res.url = url }
    await processCharacterForm(req, res, () => {})
    const after = await User.findById(user._id).populate('characters.active')
    const actual = after.characters.active
    expect(actual.tags).to.be.eql(['Test', 'Another tag', 'unit test'])
  })
})
