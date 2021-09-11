import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import { createTestDocs } from '../test-utils.js'
import populateCharacterForm from './populateCharacterForm.js'

describe('populateCharacterForm', () => {
  it('populates sections for each game in the configuration', async () => {
    const req = { viewOpts: {} }
    await populateCharacterForm(req, {}, () => {})
    expect(Object.keys(req.viewOpts.games)).to.be.eql(['dnd5e'])
  })

  it('populates the name of each game', async () => {
    const req = { viewOpts: {} }
    await populateCharacterForm(req, {}, () => {})
    expect(req.viewOpts.games.dnd5e.name).to.be.eql('<em>Dungeons & Dragons</em> (5th edition)')
  })

  it('populates the game\'s stats', async () => {
    const req = { viewOpts: {} }
    await populateCharacterForm(req, {}, () => {})
    expect(req.viewOpts.games.dnd5e.stats.map(s => s.id)).to.be.eql(['dnd5e-int', 'dnd5e-arcana', 'dnd5e-history', 'dnd5e-nature', 'dnd5e-religion'])
  })

  it('populates the game\'s labels', async () => {
    const req = { viewOpts: {} }
    await populateCharacterForm(req, {}, () => {})
    expect(req.viewOpts.games.dnd5e.stats.map(s => s.label)).to.be.eql(['Intelligence', 'Arcana', 'History', 'Nature', 'Religion'])
  })

  it('populates the game\'s detailed labels', async () => {
    const req = { viewOpts: {} }
    await populateCharacterForm(req, {}, () => {})
    expect(req.viewOpts.games.dnd5e.stats.map(s => s.detail)).to.be.eql(['Intelligence Ability Modifier', 'Intelligence (Arcana) Modifier', 'Intelligence (History) Modifier', 'Intelligence (Nature) Modifier', 'Intelligence (Religion) Modifier'])
  })

  it('populates the game\'s stat types', async () => {
    const req = { viewOpts: {} }
    await populateCharacterForm(req, {}, () => {})
    expect(req.viewOpts.games.dnd5e.stats.map(s => s.type)).to.be.eql(['number', 'number', 'number', 'number', 'number'])
  })

  it('populates the game\'s stats with default values', async () => {
    const req = { viewOpts: {} }
    await populateCharacterForm(req, {}, () => {})
    expect(req.viewOpts.games.dnd5e.stats.map(s => s.val)).to.be.eql([0, 0, 0, 0, 0])
  })

  it('populates the character\'s values', async () => {
    const { user } = await createTestDocs(model)
    const { active } = user.characters
    active.dnd5e.int = 1
    active.dnd5e.arcana = 2
    active.dnd5e.history = 3
    active.dnd5e.nature = 4
    active.dnd5e.religion = 5
    await active.save()

    const req = { params: { id: active._id }, viewOpts: {} }
    await populateCharacterForm(req, {}, () => {})
    expect(req.viewOpts.games.dnd5e.stats.map(s => s.val)).to.be.eql([1, 2, 3, 4, 5])
  })
})
