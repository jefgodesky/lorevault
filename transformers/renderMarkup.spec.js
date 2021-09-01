import { expect } from 'chai'
import renderMarkup from './renderMarkup.js'

describe('renderMarkup', () => {
  it('renders Markdown', async () => {
    const actual = await renderMarkup('**Hello, world!**')
    expect(actual).to.be.equal('<p><strong>Hello, world!</strong></p>')
  })
})