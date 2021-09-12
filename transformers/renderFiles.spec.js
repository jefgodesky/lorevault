import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import { createTestDocs } from '../test-utils.js'
import renderFiles from './renderFiles.js'

describe('renderFiles', () => {
  it('renders "Image:" tags', async () => {
    const { user } = await createTestDocs(model)
    const Page = model('Page')
    const file = { url: 'https://example.com/test.jpg', mimetype: 'image/jpeg', size: 12345 }
    await Page.create({ title: 'Image:Test JPEG Image', file }, user)
    const actual = await renderFiles('[[Image:Test JPEG Image]]')
    expect(actual).to.be.equal('<img src="https://example.com/test.jpg" alt="Test JPEG Image" />')
  })

  it('renders "Image:" tags with alt text', async () => {
    const { user } = await createTestDocs(model)
    const Page = model('Page')
    const file = { url: 'https://example.com/test.jpg', mimetype: 'image/jpeg', size: 12345 }
    await Page.create({ title: 'Image:Test JPEG Image', file }, user)
    const actual = await renderFiles('[[Image:Test JPEG Image|This is alt text.]]')
    expect(actual).to.be.equal('<img src="https://example.com/test.jpg" alt="This is alt text." />')
  })

  it('renders "File:" tags', async () => {
    const { user } = await createTestDocs(model)
    const Page = model('Page')
    const file = { url: 'https://example.com/test.txt', mimetype: 'plain/text', size: 12345 }
    await Page.create({ title: 'File:Test Text File', file }, user)
    const actual = await renderFiles('[[File:Test Text File]]')
    expect(actual).to.be.equal('<a href="https://example.com/test.txt" class="download">\n<span class="name">Test Text File</span>\n<small>plain/text; 12.3 kB</small>\n</a>')
  })

  it('renders "File:" tags with alt text', async () => {
    const { user } = await createTestDocs(model)
    const Page = model('Page')
    const file = { url: 'https://example.com/test.txt', mimetype: 'plain/text', size: 12345 }
    await Page.create({ title: 'File:Test Text File', file }, user)
    const actual = await renderFiles('[[File:Test Text File|This is a test.]]')
    expect(actual).to.be.equal('<a href="https://example.com/test.txt" class="download">\n<span class="name">This is a test.</span>\n<small>plain/text; 12.3 kB</small>\n</a>')
  })
})