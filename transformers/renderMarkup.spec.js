import { expect } from 'chai'
import renderMarkup from './renderMarkup.js'

describe('renderMarkup', () => {
  it('renders Markdown', async () => {
    const actual = await renderMarkup('**Hello, world!**')
    expect(actual).to.be.equal('\n<p><strong>Hello, world!</strong></p>\n')
  })

  it('handles tables', async () => {
    const actual = await renderMarkup('A | B | C\n--- | --- | ---\n1|2|3')
    expect(actual).to.be.equal('\n<table>\n  <thead>\n    <tr>\n      <th>A</th>\n      <th>B</th>\n      <th>C</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>1</td>\n      <td>2</td>\n      <td>3</td>\n    </tr>\n  </tbody>\n</table>\n')
  })

  it('creates sections', async () => {
    const actual = await renderMarkup('## Test\n\nHello, world!')
    expect(actual).to.be.equal('\n<section>\n  <h2>Test</h2>\n  <p>Hello, world!</p>\n</section>\n')
  })
})