import { expect } from 'chai'
import {
  info,
  transformPageSchema,
  transformCharacterSchema,
  updateCharacter,
  characterForm,
  onPageView,
  evaluate
} from './dnd5e.js'

describe('dnd5e', () => {
  describe('info', () => {
    it('exports basic game info', () => {
      const {id, name, edition} = info
      expect([id, name, edition]).to.be.eql(['dnd5e', 'Dungeons & Dragons', '5th edition'])
    })
  })

  describe('transformPageSchema', () => {
    it('adds an array to the schema for tracking character rolls', () => {
      const actual = transformPageSchema({})
      expect(actual.dnd5e).to.have.lengthOf(1)
      expect(actual.dnd5e[0].character.type.schemaName).to.be.equal('ObjectId')
      expect(actual.dnd5e[0].character.ref).to.be.equal('Character')
      expect(actual.dnd5e[0].int).to.be.eql(Number)
      expect(actual.dnd5e[0].arcana).to.be.eql(Number)
      expect(actual.dnd5e[0].history).to.be.eql(Number)
      expect(actual.dnd5e[0].nature).to.be.eql(Number)
      expect(actual.dnd5e[0].religion).to.be.eql(Number)
    })
  })

  describe('transformCharacterSchema', () => {
    it('adds your intelligence modifier to the character schema', () => {
      const actual = transformCharacterSchema({})
      expect(actual.dnd5e.int.type).to.be.eql(Number)
      expect(actual.dnd5e.int.default).to.be.equal(0)
    })

    it('adds your arcana modifier to the character schema', () => {
      const actual = transformCharacterSchema({})
      expect(actual.dnd5e.arcana.type).to.be.eql(Number)
      expect(actual.dnd5e.arcana.default).to.be.equal(0)
    })

    it('adds your history modifier to the character schema', () => {
      const actual = transformCharacterSchema({})
      expect(actual.dnd5e.history.type).to.be.eql(Number)
      expect(actual.dnd5e.history.default).to.be.equal(0)
    })

    it('adds your nature modifier to the character schema', () => {
      const actual = transformCharacterSchema({})
      expect(actual.dnd5e.nature.type).to.be.eql(Number)
      expect(actual.dnd5e.nature.default).to.be.equal(0)
    })

    it('adds your religion modifier to the character schema', () => {
      const actual = transformCharacterSchema({})
      expect(actual.dnd5e.religion.type).to.be.eql(Number)
      expect(actual.dnd5e.religion.default).to.be.equal(0)
    })
  })

  describe('updateCharacter', () => {
    it('changes the character\'s stats', () => {
      const char = { dnd5e: { int: 0, arcana: 0, history: 0, nature: 0, religion: 0 } }
      const updates = { 'dnd5e-int': '1', 'dnd5e-arcana': '2', 'dnd5e-history': '3', 'dnd5e-nature': '4', 'dnd5e-religion': '5' }
      updateCharacter(char, updates)
      const { int, arcana, history, nature, religion } = char.dnd5e
      expect([int, arcana, history, nature, religion]).to.be.eql([1, 2, 3, 4, 5])
    })
  })

  describe('characterForm', () => {
    it('returns information to create the form', () => {
      const actual = characterForm()
      expect(actual).to.have.lengthOf(5)
      expect(actual[0]).to.be.eql({ id: 'dnd5e-int', label: 'Intelligence', detail: 'Intelligence Ability Modifier', type: 'number', val: 0 })
      expect(actual[1]).to.be.eql({ id: 'dnd5e-arcana', label: 'Arcana', detail: 'Intelligence (Arcana) Modifier', type: 'number', val: 0 })
      expect(actual[2]).to.be.eql({ id: 'dnd5e-history', label: 'History', detail: 'Intelligence (History) Modifier', type: 'number', val: 0 })
      expect(actual[3]).to.be.eql({ id: 'dnd5e-nature', label: 'Nature', detail: 'Intelligence (Nature) Modifier', type: 'number', val: 0 })
      expect(actual[4]).to.be.eql({ id: 'dnd5e-religion', label: 'Religion', detail: 'Intelligence (Religion) Modifier', type: 'number', val: 0 })
    })

    it('populates the character\'s stats', () => {
      const actual = characterForm({ dnd5e: { int: 1, arcana: 2, history: 3, nature: 4, religion: 5 } })
      expect(actual).to.have.lengthOf(5)
      expect(actual[0]).to.be.eql({ id: 'dnd5e-int', label: 'Intelligence', detail: 'Intelligence Ability Modifier', type: 'number', val: 1 })
      expect(actual[1]).to.be.eql({ id: 'dnd5e-arcana', label: 'Arcana', detail: 'Intelligence (Arcana) Modifier', type: 'number', val: 2 })
      expect(actual[2]).to.be.eql({ id: 'dnd5e-history', label: 'History', detail: 'Intelligence (History) Modifier', type: 'number', val: 3 })
      expect(actual[3]).to.be.eql({ id: 'dnd5e-nature', label: 'Nature', detail: 'Intelligence (Nature) Modifier', type: 'number', val: 4 })
      expect(actual[4]).to.be.eql({ id: 'dnd5e-religion', label: 'Religion', detail: 'Intelligence (Religion) Modifier', type: 'number', val: 5 })
    })
  })

  describe('onPageView', () => {
    it('rolls dice and records the results', async () => {
      const page = { dnd5e: [] }
      page.dnd5e.addToSet = row => page.dnd5e = [...page.dnd5e, row]
      page.getSecrets = () => []
      const char = { _id: '12345', dnd5e: { int: 0, arcana: 0, history: 0, nature: 0, religion: 0 } }
      await onPageView(page, char)
      expect(page.dnd5e).to.have.lengthOf(1)
      expect(page.dnd5e[0].character).to.be.eql(char._id)
    })

    it('doesn\'t roll twice', async () => {
      const page = { dnd5e: [] }
      page.dnd5e.addToSet = row => page.dnd5e = [...page.dnd5e, row]
      page.getSecrets = () => []
      const char = { _id: '12345', dnd5e: { int: 0, arcana: 0, history: 0, nature: 0, religion: 0 } }
      await onPageView(page, char)
      const { int, arcana, history, nature, religion } = page.dnd5e[0]
      await onPageView(page, char)
      expect(page.dnd5e).to.have.lengthOf(1)
      expect(page.dnd5e[0].int).to.be.equal(int)
      expect(page.dnd5e[0].arcana).to.be.equal(arcana)
      expect(page.dnd5e[0].history).to.be.equal(history)
      expect(page.dnd5e[0].nature).to.be.equal(nature)
      expect(page.dnd5e[0].religion).to.be.equal(religion)
    })
  })

  describe('evaluate', () => {
    it('evaluates intelligence ability checks', () => {
      const page = { dnd5e: [{ character: '12345', int: 10, arcana: 10, history: 10, nature: 10, religion: 10 }] }
      const character = { _id: '12345', dnd5e: { int: 0, arcana: 0, history: 0, nature: 0, religion: 0 } }
      const actual = [
        evaluate('Intelligence DC 8', { page, character }),
        evaluate('Intelligence DC 12', { page, character }),
        evaluate('Intelligence (Arcana) DC 8', { page, character }),
        evaluate('Intelligence (Arcana) DC 12', { page, character }),
        evaluate('Intelligence (History) DC 8', { page, character }),
        evaluate('Intelligence (History) DC 12', { page, character }),
        evaluate('Intelligence (Nature) DC 8', { page, character }),
        evaluate('Intelligence (Nature) DC 12', { page, character }),
        evaluate('Intelligence (Religion) DC 8', { page, character }),
        evaluate('Intelligence (Religion) DC 12', { page, character })
      ]
      expect(actual).to.be.eql([ true, false, true, false, true, false, true, false, true, false ])
    })
  })
})