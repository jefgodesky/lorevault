import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import { createTestDocs, codenamer } from '../test-utils.js'
import Secret from '../models/secret.js'
import renderLinks from './renderLinks.js'

describe('renderLinks', () => {
  it('renders links', async () => {
    const { user } = await createTestDocs(model)
    const { str } = await renderLinks('[[Test Page|Hello!]]', {}, user)
    expect(str).to.be.equal('<a href="/test-page" title="Test Page">Hello!</a>')
  })

  it('renders links for new pages', async () => {
    const { user } = await createTestDocs(model)
    const { str } = await renderLinks('[[New Page|Hello!]]', {}, user)
    expect(str).to.be.equal('<a href="/create?title=New%20Page" class="new">Hello!</a>')
  })

  it('returns the pages that are linked', async () => {
    const { page, user } = await createTestDocs(model)
    const { links } = await renderLinks('[[Test Page|Hello!]]', {}, user)
    expect(links[0].page._id.toString()).to.be.eql(page._id.toString())
  })

  it('returns null when linking to a page that doesn\'t exist yet', async () => {
    const { user } = await createTestDocs(model)
    const { links } = await renderLinks('[[New Page|Hello!]]', {}, user)
    expect(links[0].page).to.be.null
  })

  it('returns the titles of the pages that are linked', async () => {
    const { page, user } = await createTestDocs(model)
    const { links } = await renderLinks('[[Test Page|Hello!]]', {}, user)
    expect(links[0].title).to.be.eql(page.title)
  })

  it('returns titles from link when pages don\'t exist', async () => {
    const { user } = await createTestDocs(model)
    const { links } = await renderLinks('[[New Page|Hello!]]', {}, user)
    expect(links[0].title).to.be.eql('New Page')
  })

  it('returns the text used for the link', async () => {
    const { user } = await createTestDocs(model)
    const { links } = await renderLinks('[[Test Page|Hello!]]', {}, user)
    expect(links[0].text).to.be.eql('Hello!')
  })

  it('returns false if the link is not part of a secret', async () => {
    const { user } = await createTestDocs(model)
    const { links } = await renderLinks('[[Test Page|Hello!]]', {}, user)
    expect(links[0].secret).to.be.false
  })

  it('returns the codename if the link is part of a secret', async () => {
    const { user } = await createTestDocs(model)
    const str = '<secret codename="Wombat">[[Test Page|Hello!]]</secret>>'
    const secrets = Secret.parse(str, codenamer)
    const { links } = await renderLinks(str, secrets, user)
    expect(links[0].secret).to.be.equal('Wombat')
  })
})
