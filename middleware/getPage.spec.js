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

  it('renders the page\'s file', async () => {
    const { page, user } = await createTestDocs(model)
    page.file = { url: 'https://example.com/test.txt', mimetype: 'plain/text', size: 123456 }
    await page.save()
    const req = { originalUrl: '/test-page', user, viewOpts: {} }
    await getPage(req, {}, () => {})
    expect(req.viewOpts.file).to.be.equal('<a href="https://example.com/test.txt" class="download">\n<span class="name">Test Page</span>\n<small>plain/text; 123.5 kB</small>\n</a>')
  })

  it('checks the page\'s secrets if you\'re reading the page', async () => {
    const { user } = await createTestDocs(model, '||::Wombat:: [Intelligence (Arcana) DC 10] This is a secret.||')
    const req = { originalUrl: '/test-page', user, viewOpts: {} }
    await getPage(req, {}, () => {})
    const { active } = user.characters
    const { checked } = req.viewOpts.page.secrets.list[0]
    expect(checked).to.contain(active._id.toString())
  })

  it('won\'t check a loremaster', async () => {
    const { loremaster } = await createTestDocs(model, '||::Wombat:: [Intelligence (Arcana) DC 10] This is a secret.||')
    const req = { originalUrl: '/test-page', user: loremaster, viewOpts: {} }
    await getPage(req, {}, () => {})
    const { checked } = req.viewOpts.page.secrets.list[0]
    expect(checked).to.be.empty
  })

  it('won\'t check an anonymous user', async () => {
    await createTestDocs(model, '||::Wombat:: [Intelligence (Arcana) DC 10] This is a secret.||')
    const req = { originalUrl: '/test-page', viewOpts: {} }
    await getPage(req, {}, () => {})
    const { checked } = req.viewOpts.page.secrets.list[0]
    expect(checked).to.be.empty
  })

  it('only checks the page\'s secrets if you\'re reading the page', async () => {
    const { user } = await createTestDocs(model, '||::Wombat:: [Intelligence (Arcana) DC 10] This is a secret.||')
    const req = { originalUrl: '/test-page/edit', user, viewOpts: {} }
    await getPage(req, {}, () => {})
    const { checked } = req.viewOpts.page.secrets.list[0]
    expect(checked).to.be.empty
  })
})