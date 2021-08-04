/**
 * @jest-environment jsdom
 */
/* global describe, it, expect, jest */

import {
  ready,
  select
} from './utils'

describe('ready', () => {
  it('runs if the document is ready', () => {
    const fn = jest.fn()
    ready(fn)
    expect(fn).toHaveBeenCalled()
  })
})

describe('select', () => {
  it('returns elements that match the selector', () => {
    document.body.innerHTML = '<div class="test">Test</div>'
    const actual = select('.test')
    expect(actual).toHaveLength(1)
    expect(actual[0].outerHTML).toEqual('<div class="test">Test</div>')
  })

  it('returns all matching elements by default', () => {
    document.body.innerHTML = '<div class="test">Test #1</div><div class="test">Test #2</div>'
    const actual = select('.test')
    expect(actual).toHaveLength(2)
  })

  it('returns only the first matching element when told to', () => {
    document.body.innerHTML = '<div class="test">Test #1</div><div class="test">Test #2</div>'
    const actual = select('.test', false)
    expect(actual).toHaveLength(1)
    expect(actual[0].innerHTML).toEqual('Test #1')
  })
})
