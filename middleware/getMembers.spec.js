import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import Page from '../models/page.js'
import { createTestDocs } from '../test-utils.js'
import getMembers from './getMembers.js'

describe('getMembers', () => {
  it('does nothing if the title doesn\'t begin with "Category:"', async () => {
    await createTestDocs(model)
    const req = { viewOpts: {} }
    await getMembers(req, {}, () => {})
    expect(req.viewOpts).to.be.eql({})
  })

  it('does nothing if the title doesn\'t have any members', async () => {
    const { user } = await createTestDocs(model)
    await Page.create({ title: 'Category:Tests', body: 'Hello, world! '}, user)
    const req = { viewOpts: {} }
    await getMembers(req, {}, () => {})
    expect(req.viewOpts).to.be.eql({})
  })

  it('adds member pages', async () => {
    const { page, user } = await createTestDocs(model)
    await page.update({ title: 'Test Page', body: '[[Category:Tests]]' }, user)
    const req = { viewOpts: { title: 'Category:Tests' } }
    await getMembers(req, {}, () => {})
    expect(req.viewOpts.category.pages[0]._id).to.be.eql(page._id)
  })

  it('adds member categories', async () => {
    const { page, user } = await createTestDocs(model)
    await page.update({ title: 'Category:Unit Tests', body: '[[Category:Tests]]' }, user)
    const req = { viewOpts: { title: 'Category:Tests' } }
    await getMembers(req, {}, () => {})
    expect(req.viewOpts.category.subcategories[0]._id).to.be.eql(page._id)
  })

  const makeAnimals = async (user, category = false) => {
    const animals = ['Aardvark', 'Akita', 'Albatross', 'Anteater', 'Antelope', 'Ape', 'Armadillo', 'Awk', 'Axolotl', 'Baboon', 'Badger']
    if (category) {
      for (const animal of animals) await Page.create({title: `Category:${animal}`, body: '[[Category:Animals]]'}, user)
    } else {
      for (const animal of animals) await Page.create({title: animal, body: '[[Category:Animals]]'}, user)
    }
  }

  it('sorts pages by letter', async () => {
    const { user } = await createTestDocs(model)
    await makeAnimals(user)
    const req = { viewOpts: { title: 'Category:Animals' } }
    await getMembers(req, {}, () => {})
    expect(req.viewOpts.category.pages.a).to.have.lengthOf(9)
  })

  it('sorts categories by letter', async () => {
    const { user } = await createTestDocs(model)
    await makeAnimals(user, true)
    const req = { viewOpts: { title: 'Category:Animals' } }
    await getMembers(req, {}, () => {})
    expect(req.viewOpts.category.subcategories.a).to.have.lengthOf(9)
  })

  it('sorts pages that start with special characters', async () => {
    const { user } = await createTestDocs(model)
    await Page.create({ title: 'Animal', body: '[[Category:Animals|!Animal]]' }, user)
    await makeAnimals(user)
    const req = { viewOpts: { title: 'Category:Animals' } }
    await getMembers(req, {}, () => {})
    expect(req.viewOpts.category.pages.other).to.have.lengthOf(1)
  })

  it('sorts pages that start with numbers', async () => {
    const { user } = await createTestDocs(model)
    await Page.create({ title: 'Animal', body: '[[Category:Animals|100]]' }, user)
    await makeAnimals(user)
    const req = { viewOpts: { title: 'Category:Animals' } }
    await getMembers(req, {}, () => {})
    expect(req.viewOpts.category.pages.numbers).to.have.lengthOf(1)
  })
})