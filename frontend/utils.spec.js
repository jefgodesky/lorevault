/**
 * @jest-environment jsdom
 */
/* global describe, it, expect, jest */

import {
  ready,
  select,
  create,
  hasClass
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

describe('create', () => {
  it('creates a node', () => {
    const actual = create()
    expect(actual.outerHTML).toEqual('<div></div>')
  })

  it('creates a node of specified tag', () => {
    const actual = create('p')
    expect(actual.outerHTML).toEqual('<p></p>')
  })

  it('creates a node with the given classes', () => {
    const actual = create(undefined, ['test1', 'test2'])
    expect(actual.outerHTML).toEqual('<div class="test1 test2"></div>')
  })

  it('applies other attributes', () => {
    const actual = create(undefined, undefined, { id: 'test' })
    expect(actual.outerHTML).toEqual('<div id="test"></div>')
  })

  it('applies text', () => {
    const actual = create(undefined, undefined, undefined, 'Test')
    expect(actual.outerHTML).toEqual('<div>Test</div>')
  })

  it('applies HTML', () => {
    const actual = create(undefined, undefined, undefined, '<strong>Test&hellip;</strong>')
    expect(actual.outerHTML).toEqual('<div><strong>Test…</strong></div>')
  })

  it('does it all at once', () => {
    const actual = create('p', ['test1', 'test2'], { id: 'test' }, 'Test')
    expect(actual.outerHTML).toEqual('<p class="test1 test2" id="test">Test</p>')
  })
})

describe('hasClass', () => {
  it('returns true if the element has the class', () => {
    const el = create('div', ['test'])
    expect(hasClass(el, 'test')).toEqual(true)
  })

  it('returns true if the element has any of the classes', () => {
    const el = create('div', ['test1', 'test2'])
    expect(hasClass(el, 'test1', 'test2', 'test3')).toEqual(true)
  })

  it('returns false if the element does not have the class', () => {
    const el = create('div', ['somethingelse'])
    expect(hasClass(el, 'test')).toEqual(false)
  })
})
