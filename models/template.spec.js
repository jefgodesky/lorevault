import { expect } from 'chai'
import { createTestDocs } from '../test-utils.js'
import Page from './page.js'
import Template from './template.js'

import mongoose from 'mongoose'
const { model } = mongoose

describe('Template', () => {
  describe('Constructor', () => {
    it('takes a name', () => {
      const { name } = new Template({ name: 'Test' })
      expect(name).to.be.equal('Test')
    })

    it('can parse a string into a Template instance', () => {
      const { name } = new Template('{{Test}}')
      expect(name).to.be.equal('Test')
    })
  })

  describe('recurse', () => {
    it('runs the function on the template', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({ title: 'Template:Test', body: 'This is my template.' }, user)
      const template = new Template('{{Test}}')
      const arr = []
      await template.recurse(user, (tpl, page, body) => { arr.push(tpl.name, page.title, body) })
      expect(arr).to.be.eql(['Test', 'Template:Test', 'This is my template.'])
    })

    it('recurses through other templates', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({ title: 'Template:Inner', body: 'Inner template' }, user)
      await Page.create({ title: 'Template:Outer', body: '{{Inner}}' }, user)
      const template = new Template('{{Outer}}')
      const arr = []
      await template.recurse(user, (tpl, page, body) => { arr.push(tpl.name, page.title, body) })
      expect(arr).to.be.eql(['Outer', 'Template:Outer', '{{Inner}}', 'Inner', 'Template:Inner', 'Inner template'])
    })
  })

  describe('list', () => {
    it('lists the template', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({ title: 'Template:Test', body: 'This is my template.' }, user)
      const template = new Template('{{Test}}')
      const actual = await template.list(user)
      expect(actual).to.have.lengthOf(1)
    })

    it('provides the template\'s ID', async () => {
      const { user } = await createTestDocs(model)
      const page = await Page.create({ title: 'Template:Test', body: 'This is my template.' }, user)
      const template = new Template('{{Test}}')
      const actual = await template.list(user)
      expect(actual[0].page).to.be.eql(page._id)
    })

    it('provides the template\'s name', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({ title: 'Template:Test', body: 'This is my template.' }, user)
      const template = new Template('{{Test}}')
      const actual = await template.list(user)
      expect(actual[0].name).to.be.equal('Test')
    })

    it('provides the template\'s path', async () => {
      const { user } = await createTestDocs(model)
      const page = await Page.create({ title: 'Template:Test', body: 'This is my template.' }, user)
      const template = new Template('{{Test}}')
      const actual = await template.list(user)
      expect(actual[0].path).to.be.equal(page.path)
    })

    it('lists deeper templates recursively', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({ title: 'Template:Inner', body: 'Inner template' }, user)
      await Page.create({ title: 'Template:Outer', body: '{{Inner}}' }, user)
      const template = new Template('{{Outer}}')
      const actual = await template.list(user)
      expect(actual).to.have.lengthOf(2)
    })
  })

  describe('render', () => {
    it('renders the template', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({title: 'Template:Test', body: 'This is my template.'}, user)
      const template = new Template('{{Test}}')
      const actual = await template.render(user)
      expect(actual).to.be.equal('This is my template.')
    })

    it('renders ordered parameters', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({title: 'Template:Test', body: 'This is my {{{1}}}.'}, user)
      const template = new Template('{{Test|template}}')
      const actual = await template.render(user)
      expect(actual).to.be.equal('This is my template.')
    })

    it('renders explicitly ordered parameters', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({title: 'Template:Test', body: 'This is my {{{2}}}.'}, user)
      const template = new Template('{{Test|2=template}}')
      const actual = await template.render(user)
      expect(actual).to.be.equal('This is my template.')
    })

    it('renders named parameters', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({title: 'Template:Test', body: 'This is my {{{thing}}}.'}, user)
      const template = new Template('{{Test|thing=template}}')
      const actual = await template.render(user)
      expect(actual).to.be.equal('This is my template.')
    })

    it('renders nested templates', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({ title: 'Template:Inner', body: 'Inner template' }, user)
      await Page.create({ title: 'Template:Outer', body: '{{Inner}}' }, user)
      const template = new Template('{{Outer}}')
      const actual = await template.render(user)
      expect(actual).to.be.equal('Inner template')
    })

    it('renders nested templates with parameters', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({ title: 'Template:Inner', body: '{{{1}}}' }, user)
      await Page.create({ title: 'Template:Outer', body: '{{Inner|Hello, world!}}' }, user)
      const template = new Template('{{Outer}}')
      const actual = await template.render(user)
      expect(actual).to.be.equal('Hello, world!')
    })

    it('renders #IF statements', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({title: 'Template:Test', body: '{{#IF|param}}{{{param}}}{{#ELSIF}}This is my template.{{#ENDIF}}'}, user)
      const t1 = new Template('{{Test}}')
      const t2 = new Template('{{Test|param=Hello, world!}}')
      const r1 = await t1.render(user)
      const r2 = await t2.render(user)
      expect(`${r1}\n${r2}`).to.be.equal('This is my template.\nHello, world!')
    })
  })

  describe('parseParams', () => {
    it('can parse ordered parameters', () => {
      const actual = Template.parseParams('hello|world')
      expect(actual.ordered).to.be.eql(['hello', 'world'])
    })

    it('can parse explicitly ordered parameters', () => {
      const actual = Template.parseParams('  2=world\n  |1=hello')
      expect(actual.ordered).to.be.eql(['hello', 'world'])
    })

    it('can parse named parameters', () => {
      const actual = Template.parseParams('  greeting=hello\n  |subject=world')
      expect(actual.named).to.be.eql({ greeting: 'hello', subject: 'world' })
    })

    it('can handle links', () => {
      const actual = Template.parseParams('link=[[Test Page | Alias]]')
      expect(actual.named).to.be.eql({ link: '[[Test Page | Alias]]' })
    })
  })

  describe('parseInstance', () => {
    it('gets the name of the template', () => {
      const { name } = Template.parseInstance('{{TestTemplate}}')
      expect(name).to.be.equal('TestTemplate')
    })

    it('gets the original string', () => {
      const { str } = Template.parseInstance('{{TestTemplate}}')
      expect(str).to.be.equal('{{TestTemplate}}')
    })

    it('gets ordered parameters', () => {
      const { params } = Template.parseInstance('{{TestTemplate|hello|world}}')
      expect(params.ordered).to.be.eql(['hello', 'world'])
    })

    it('gets explicitly ordered parameters', () => {
      const { params } = Template.parseInstance('{{TestTemplate|2=world|1=hello}}')
      expect(params.ordered).to.be.eql(['hello', 'world'])
    })

    it('gets named parameters', () => {
      const { params } = Template.parseInstance('{{TestTemplate\n  |greeting=hello\n  |subject=world\n}}')
      expect(params.named).to.be.eql({ greeting: 'hello', subject: 'world' })
    })
  })

  describe('parse', () => {
    it('returns an array', () => {
      const templates = Template.parse(' {{Test}} {{Test}} {{Test}}')
      expect(templates).to.have.lengthOf(3)
    })

    it('returns an array of Templates', () => {
      const templates = Template.parse(' {{Test}}')
      expect(templates[0]).to.be.an.instanceof(Template)
    })

    it('returns the name of each template', () => {
      const templates = Template.parse(' {{Test}}')
      expect(templates[0].name).to.equal('Test')
    })

    it('captures parameters', () => {
      const templates = Template.parse(' {{Test\n  |greeting=Hello\n  |subject=World\n}}')
      expect(templates[0].params).to.eql({ ordered: [], named: { greeting: 'Hello', subject: 'World' } })
    })

    it('captures content', () => {
      const templates = Template.parse(' {{Test}}\n\nHello, world!\n\n{{/Test}}')
      expect(templates[0].params).to.eql({ ordered: [], named: { content: '\n\nHello, world!\n\n' } })
    })
  })

  describe('render', () => {
    it('renders all templates in a string', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({ title: 'Template:First', body: 'First template' }, user)
      await Page.create({ title: 'Template:Second', body: 'Second template' }, user)
      const actual = await Template.render('{{First}}\n\n{{Second}}')
      expect(actual).to.be.equal('First template\n\nSecond template')
    })
  })

  describe('renderIfs', () => {
    it('can handle an #IF testing if a parameter exists', async () => {
      const actual = await Template.renderIfs('Hello, {{#IF|subject}}{{{subject}}}{{#ELSIF}}world{{#ENDIF}}!', { ordered: [], named: { subject: 'Tester' } })
      expect(actual).to.be.equal('Hello, {{{subject}}}!')
    })

    it('can supply an else when an #IF testing if a parameter doesn\'t exist', async () => {
      const actual = await Template.renderIfs('Hello, {{#IF|subject}}{{{subject}}}{{#ELSIF}}world{{#ENDIF}}!', { ordered: [], named: {} })
      expect(actual).to.be.equal('Hello, world!')
    })

    it('can handle an #IF testing if a parameter equals a particular value', async () => {
      const actual = await Template.renderIfs('Hello, {{#IF|subject=Tester}}{{{subject}}}{{#ELSIF}}world{{#ENDIF}}!', { ordered: [], named: { subject: 'Tester' } })
      expect(actual).to.be.equal('Hello, {{{subject}}}!')
    })

    it('can supply an else when an #IF testing if a parameter doesn\'t equal a particular value', async () => {
      const actual = await Template.renderIfs('Hello, {{#IF|subject=Tester}}{{{subject}}}{{#ELSIF}}world{{#ENDIF}}!', { ordered: [], named: { subject: 'Someone Else' } })
      expect(actual).to.be.equal('Hello, world!')
    })
  })

  describe('findPagesThatUse', () => {
    it('returns the pages that use a template', async () => {
      const { page, user } = await createTestDocs(model)
      await Page.create({ title: 'Template:Test', body: 'Hello, world!' }, user)
      await page.update({ title: 'Test Page', body: '{{Test}}' }, user)
      await Page.create({ title: 'Second Page', body: '{{Test}}' }, user)
      const actual = await Template.findPagesThatUse('Test', user)
      expect(actual).to.have.lengthOf(2)
    })

    it('returns pages', async () => {
      const { page, user } = await createTestDocs(model)
      await Page.create({ title: 'Template:Test', body: 'Hello, world!' }, user)
      await page.update({ title: 'Test Page', body: '{{Test}}' }, user)
      await Page.create({ title: 'Second Page', body: '{{Test}}' }, user)
      const actual = await Template.findPagesThatUse('Test', user)
      expect(actual.map(p => p.constructor.modelName)).to.be.eql(['Page', 'Page'])
    })
  })
})