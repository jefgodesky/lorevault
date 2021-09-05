import { expect } from 'chai'
import Template from './template.js'

describe('Template', () => {
  describe('Constructor', () => {
    it('takes a name', () => {
      const actual = new Template({ name: 'Test' })
      expect(actual.name).to.be.equal('Test')
    })
  })
})