import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import { createTestDocs } from '../test-utils.js'
import getPage from './getPage.js'

describe('getPage', () => {
  it('loads the page from the URL', async () => {
    const { page, user } = await createTestDocs(model)
    const req = { originalUrl: '/test-page', user, viewOpts: {} }
    await getPage(req, {}, () => {})
    expect(req.viewOpts.page._id).to.be.eql(page._id)
  })

  it('loads the page from the pageID', async () => {
    const { page, user } = await createTestDocs(model)
    const req = { originalUrl: `/${user.characters.active.page.path}`, user, viewOpts: {}, body: { pageID: page._id.toString() } }
    await getPage(req, {}, () => {})
    expect(req.viewOpts.page._id).to.be.eql(page._id)
  })

  it('loads the page for an anonymous user', async () => {
    const { page } = await createTestDocs(model)
    const req = { originalUrl: '/test-page', viewOpts: {} }
    await getPage(req, {}, () => {})
    expect(req.viewOpts.page._id).to.be.eql(page._id)
  })

  it('sets the title', async () => {
    const { page, user } = await createTestDocs(model)
    const req = { originalUrl: '/test-page', user, viewOpts: {} }
    await getPage(req, {}, () => {})
    expect(req.viewOpts.title).to.be.equal(page.title)
  })

  it('renders the page', async () => {
    await createTestDocs(model)
    const req = { originalUrl: '/test-page', viewOpts: {} }
    await getPage(req, {}, () => {})
    expect(req.viewOpts.page.markup).to.be.equal('\n<p>This is the original text.</p>\n')
  })

  it('gets the page\'s categories', async () => {
    const { page, user } = await createTestDocs(model)
    await page.update({ title: 'Test Page', body: '[[Category:Tests]] [[Category:Unit tests]]' }, user)
    const req = { originalUrl: '/test-page', user, viewOpts: {} }
    await getPage(req, {}, () => {})
    expect(req.viewOpts.categories).to.have.lengthOf(2)
  })
})