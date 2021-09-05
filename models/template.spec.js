import { expect } from 'chai'
import Template from './template.js'

describe('Template', () => {
  describe('Constructor', () => {
    it('takes a name', () => {
      const actual = new Template({ name: 'Test' })
      expect(actual.name).to.be.equal('Test')
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
})