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
      await template.recurse(user, (tpl, body) => { arr.push(tpl.title, body) })
      expect(arr).to.be.eql(['Template:Test', 'This is my template.'])
    })

    it('recurses through other templates', async () => {
      const { user } = await createTestDocs(model)
      await Page.create({ title: 'Template:Inner', body: 'Inner template' }, user)
      await Page.create({ title: 'Template:Outer', body: '{{Inner}}' }, user)
      const template = new Template('{{Outer}}')
      const arr = []
      await template.recurse(user, (tpl, body) => { arr.push(tpl.title, body) })
      expect(arr).to.be.eql(['Template:Outer', '{{Inner}}', 'Template:Inner', 'Inner template'])
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
})