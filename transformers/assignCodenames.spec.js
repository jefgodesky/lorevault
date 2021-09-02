import { expect } from 'chai'
import assignCodenames from './assignCodenames.js'
import { codenamer } from '../test-utils.js'

describe('assignCodenames', () => {
  it('assigns a codename to any secret that doesn\'t have one', () => {
    const actual = assignCodenames('||This is a new secret.||', codenamer)
    expect(actual.str).to.be.equal('||::Secret0001:: This is a new secret.||')
  })

  it('documents all of the secrets found', () => {
    const actual = assignCodenames('||This is a new secret.||', codenamer)
    expect(actual.secrets.Secret0001).not.to.be.undefined
  })

  it('provides each secret\'s contents', () => {
    const actual = assignCodenames('||This is a new secret.||', codenamer)
    expect(actual.secrets.Secret0001.content).to.be.equal('This is a new secret.')
  })

  it('maintains a given codename in the string', () => {
    const actual = assignCodenames('||::Wombat:: This is a new secret.||', codenamer)
    expect(actual.str).to.be.equal('||::Wombat:: This is a new secret.||')
  })

  it('documents given codenames', () => {
    const actual = assignCodenames('||::Wombat:: This is a new secret.||', codenamer)
    expect(actual.secrets.Wombat).not.to.be.undefined
  })

  it('repeats just the codename if that\'s all we have', () => {
    const actual = assignCodenames('||::Wombat::||', codenamer)
    expect(actual.str).to.equal('||::Wombat::||')
  })
})