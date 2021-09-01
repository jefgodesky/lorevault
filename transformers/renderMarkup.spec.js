import { expect } from 'chai'
import renderMarkup from './renderMarkup.js'

describe('renderMarkup', () => {
  it('renders Markdown', async () => {
    const actual = await renderMarkup('**Hello, world!**')
    expect(actual).to.be.equal('\n<p><strong>Hello, world!</strong></p>\n')
  })

  it('allows HTML', async () => {
    const actual = await renderMarkup('<strong>Hello, world!</strong>')
    expect(actual).to.be.equal('\n<p><strong>Hello, world!</strong></p>\n')
  })

  it('doesn\'t allow *all* HTML', async () => {
    const actual = await renderMarkup('<strong>Hello, world!</strong> <script>Inside a script tag</script>')
    expect(actual).to.be.equal('\n<p><strong>Hello, world!</strong></p>\n')
  })

  it('handles tables', async () => {
    const actual = await renderMarkup('A | B | C\n--- | --- | ---\n1|2|3')
    expect(actual).to.be.equal('\n<table>\n  <thead>\n    <tr>\n      <th>A</th>\n      <th>B</th>\n      <th>C</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>1</td>\n      <td>2</td>\n      <td>3</td>\n    </tr>\n  </tbody>\n</table>\n')
  })

  it('creates sections and links to headings', async () => {
    const actual = await renderMarkup('## Test\n\nHello, world!')
    expect(actual).to.be.equal('\n<section>\n  <h2 id="test"><a aria-hidden="true" tabindex="-1" href="#test"><span class="icon icon-link"></span></a>Test</h2>\n  <p>Hello, world!</p>\n</section>\n')
  })
})