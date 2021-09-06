import { expect } from 'chai'
import renderTags from './renderTags.js'

describe('renderTags', () => {
  it('does nothing if the string doesn\'t have any tags', () => {
    const str = 'Hello world!'
    expect(renderTags(str, '<noinclude>')).to.be.equal(str)
  })

  it('strips out any tags', () => {
    const str = 'Hello<noinclude> you big, wide</noinclude> world<noinclude> full of unit tests, you</noinclude>!'
    expect(renderTags(str, '<noinclude>')).to.be.equal('Hello world!')
  })

  it('can also be used to unwrap any tags', () => {
    const str = 'Hello<noinclude> you big, wide</noinclude> world<noinclude> full of unit tests, you</noinclude>!'
    expect(renderTags(str, '<noinclude>', true)).to.be.equal('Hello you big, wide world full of unit tests, you!')
  })
})