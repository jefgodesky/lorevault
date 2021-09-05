import { expect } from 'chai'

import mongoose from 'mongoose'
const { model } = mongoose

import config from '../config/index.js'

import { pickRandom } from '../utils.js'
import { createTestDocs } from '../test-utils.js'
import Page from './page.js'
import User from './user.js'

describe('Page', () => {
  describe('Presave', () => {
    describe('Paths', () => {
      it('creates a slug from the page\'s title', async () => {
        const { page } = await createTestDocs(model)
        expect(page.path).to.be.equal('test-page')
      })

      it('adds a random suffix to make each path unique', async () => {
        const { user } = await createTestDocs(model)
        const page = await Page.create({ title: 'Test Page', body: 'This is the second page called Test Page.' }, user)
        expect(page.path.startsWith('test-page-')).to.be.true
      })
    })

    describe('Categories', () => {
      it('saves the tagged categories', async () => {
        const { page } = await createTestDocs(model, '[[Category:Tests]]')
        expect(page.categories).to.have.lengthOf(1)
      })

      it('saves the names of the tagged categories', async () => {
        const { page } = await createTestDocs(model, '[[Category:Tests]]')
        expect(page.categories.map(c => c.name)).to.be.eql(['Tests'])
      })

      it('defaults sort to the title of the page', async () => {
        const { page } = await createTestDocs(model, '[[Category:Tests]]')
        expect(page.categories.map(c => c.sort)).to.be.eql(['Test Page'])
      })

      it('can take a sort string from the category tag', async () => {
        const { page } = await createTestDocs(model, '[[Category:Tests|Alias]]')
        expect(page.categories.map(c => c.sort)).to.be.eql(['Alias'])
      })

      it('handles weird spacing', async () => {
        const { page } = await createTestDocs(model, '[[Category:   Tests  |    Alias      ]]')
        const { name, sort } = page.categories[0]
        expect(`${name} ${sort}`).to.be.eql('Tests Alias')
      })

      it('has no secret property if it isn\'t a secret', async () => {
        const { page } = await createTestDocs(model, '[[Category:Tests]]')
        expect(page.categories[0].secret).to.be.undefined
      })

      it('records the codename if it\'s a secret.', async () => {
        const { page } = await createTestDocs(model, '||::Wombat:: [[Category:Tests]]||')
        expect(page.categories[0].secret).to.be.eql('Wombat')
      })
    })

    describe('Created', () => {
      it('sets the created timestamp to the time when it is created', async () => {
        const start = new Date()
        const { page } = await createTestDocs(model)
        await page.save()
        expect(page.created).to.be.least(start)
      })
    })

    describe('Modified', () => {
      it('sets the modified timestamp to the time when it is modified', async () => {
        const start = new Date()
        const { page } = await createTestDocs(model)
        await page.save()
        expect(page.modified).to.be.least(start)
      })
    })
  })

  describe('methods', () => {
    describe('getCurr', () => {
      it('returns the most recent version of the page', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is an updated page.' }, user)
        expect(page.getCurr().body).to.be.equal('This is an updated page.')
      })
    })

    describe('getVersion', () => {
      it('returns specified version of the page', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is an updated page.' }, user)
        expect(page.getVersion(page.versions[0]._id).body).to.be.equal(page.versions[0].body)
      })
    })

    describe('getCategorization', () => {
      it('returns false if the page isn\'t in that category', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = page.getCategorization('Test', user)
        expect(actual).to.be.false
      })

      it('returns false if the page\'s membership in that category is a secret to you', async () => {
        const { page, other } = await createTestDocs(model, '||[[Category:Test]]||')
        const actual = page.getCategorization('Test', other)
        expect(actual).to.be.false
      })

      it('returns the category object', async () => {
        const { page, user } = await createTestDocs(model, '[[Category:Test]]')
        const actual = page.getCategorization('Test', user)
        expect(actual.name).to.be.equal('Test')
      })

      it('returns the category object when it\'s a secret you know', async () => {
        const { page, user } = await createTestDocs(model, '||[[Category:Test]]||')
        const actual = page.getCategorization('Test', user)
        expect(actual.name).to.be.equal('Test')
      })
    })

    describe('getFile', () => {
      it('returns null if the page doesn\'t have a file', async () => {
        const { page } = await createTestDocs(model)
        const file = page.getFile()
        expect(file).to.be.null
      })

      it('returns null if the page\'s file doesn\'t have a URL', async () => {
        const { page } = await createTestDocs(model)
        page.file = { size: 42 }
        const file = page.getFile()
        expect(file).to.be.null
      })

      it('returns the page\'s URL', async () => {
        const { page } = await createTestDocs(model)
        page.file = { url: 'https://cdn.com/test', mimetype: 'text/plain', size: 42 }
        const file = page.getFile()
        expect(file.url).to.be.equal('https://cdn.com/test')
      })

      it('returns the page\'s MIME type', async () => {
        const { page } = await createTestDocs(model)
        page.file = { url: 'https://cdn.com/test', mimetype: 'text/plain', size: 42 }
        const file = page.getFile()
        expect(file.mimetype).to.be.equal('text/plain')
      })

      it('returns the page\'s size', async () => {
        const { page } = await createTestDocs(model)
        page.file = { url: 'https://cdn.com/test', mimetype: 'text/plain', size: 42 }
        const file = page.getFile()
        expect(file.size).to.be.equal(42)
      })

      it('indicates the display indicated in the configuration', async () => {
        const { page } = await createTestDocs(model)
        const mimetype = pickRandom(Object.keys(config.fileDisplay))
        page.file = { url: 'https://cdn.com/test', mimetype, size: 42 }
        const file = page.getFile()
        expect(file.display).to.be.equal(config.fileDisplay[mimetype])
      })

      it('indicates a download display if given a mimetype not in the configuration', async () => {
        const { page } = await createTestDocs(model)
        page.file = { url: 'https://cdn.com/test', mimetype: 'nope/lol', size: 42 }
        const file = page.getFile()
        expect(file.display).to.be.equal('Download')
      })
    })

    describe('findCodename', () => {
      it('returns a random codename', async () => {
        const { page } = await createTestDocs(model)
        expect(page.findCodename()).to.be.a('string')
      })

      it('can produce 110 codenames', async () => {
        const { page } = await createTestDocs(model)
        for (let i = 0; i < 110; i++) {
          const codename = page.findCodename()
          page.secrets.list.push({ codename, content: 'Test', knowers: [] })
        }
        expect(page.secrets.list).to.have.lengthOf(110)
      })
    })

    describe('findSecret', () => {
      it('returns the secret with that codename', async () => {
        const { page } = await createTestDocs(model, '||::Wombat:: This is the secret.||')
        expect(page.findSecret('Wombat').content).to.be.equal('This is the secret.')
      })

      it('returns null if the page doesn\'t have any secret with that codename', async () => {
        const { page } = await createTestDocs(model)
        expect(page.findSecret('Wombat')).to.be.null
      })

      it('returns who knows about the page if it\'s a secret and you provide a falsy codename', async () => {
        const { page } = await createTestDocs(model)
        page.secrets.existence = true
        expect(page.findSecret().knowers).to.be.eql([])
      })

      it('returns null if you provide a falsy codename but the page isn\'t a secret', async () => {
        const { page } = await createTestDocs(model)
        expect(page.findSecret()).to.be.null
      })
    })

    describe('processSecrets', () => {
      it('adds new secrets', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        expect(page.secrets.list).to.have.lengthOf(1)
      })

      it('uses a new secret\'s codename', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        expect(page.secrets.list[0].codename).to.be.equal('Wombat')
      })

      it('adds a new secret\'s contents to the list', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        expect(page.secrets.list[0].content).to.be.equal('This is a new secret.')
      })

      it('starts off a new secret with the POV character of the person who wrote it knowing it', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        expect(page.secrets.list[0].knowers.join(' ')).to.be.equal(user.getPOV()._id.toString())
      })

      it('updates the content of a secret if the editor knows the secret', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        await page.processSecrets({ Wombat: { content: 'Updated secret.' } }, user)
        expect(page.secrets.list[0].content).to.be.equal('Updated secret.')
      })

      it('can delete a secret if the editor knows about it', async () => {
        const { page, user } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        await page.processSecrets({}, user)
        expect(page.secrets.list).to.be.empty
      })

      it('doesn\'t change the secret if the editor doesn\'t know it', async () => {
        const { page, user, other } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        await page.processSecrets({ Wombat: { content: 'Updated secret.' } }, other)
        expect(page.secrets.list[0].content).to.be.equal('This is a new secret.')
      })

      it('keeps secrets that an editor might delete if she doesn\'t know it', async () => {
        const { page, user, other } = await createTestDocs(model)
        await page.processSecrets({ Wombat: { content: 'This is a new secret.' } }, user)
        await page.processSecrets({}, other)
        expect(page.secrets.list[0].content).to.be.equal('This is a new secret.')
      })
    })

    describe('getSecrets', () => {
      it('returns an object for each secret', async () => {
        const { page } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const actual = page.getSecrets()
        expect(actual).to.have.lengthOf(1)
      })

      it('provides the codenames for each secret', async () => {
        const { page } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const actual = page.getSecrets()
        expect(actual.map(s => s.codename)).to.be.eql(['Wombat'])
      })

      it('provides the contents of each secret', async () => {
        const { page } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const actual = page.getSecrets('Anonymous')
        expect(actual.map(s => s.content)).to.be.eql(['This is a secret.'])
      })

      it('indicates that anonymous doesn\'t know any secrets', async () => {
        const { page } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const actual = page.getSecrets('Anonymous')
        expect(actual[0].known).to.be.false
      })

      it('shows all secrets to a loremaster', async () => {
        const { page } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const actual = page.getSecrets('Loremaster')
        expect(actual[0].known).to.be.true
      })

      it('says if you don\'t know a secret', async () => {
        const { page, other } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const actual = page.getSecrets(other.getPOV())
        expect(actual[0].known).to.be.false
      })

      it('says if you know a secret', async () => {
        const { page, user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const actual = page.getSecrets(user.getPOV())
        expect(actual[0].known).to.be.true
      })
    })

    describe('checkSecrets', () => {
      it('reveals secrets to characters according to rules set by game modules', async () => {
        const { page, other } = await createTestDocs(model, '||::Wombat:: [Intelligence DC 1] This is a secret.||')
        const charPage = await Page.create({ title: 'New Character', body: 'This is about New Character.' }, other)
        await other.claim(charPage)
        const { active } = other.characters
        await page.checkSecrets(active)
        expect(page.secrets.list[0].knowers).to.include(active._id)
      })

      it('doesn\'t reveal secrets to characters according to rules set by game modules', async () => {
        const { page, other } = await createTestDocs(model, '||::Wombat:: [Intelligence DC 21] This is a secret.||')
        const charPage = await Page.create({ title: 'New Character', body: 'This is about New Character.' }, other)
        await other.claim(charPage)
        const { active } = other.characters
        await page.checkSecrets(active)
        expect(page.secrets.list[0].knowers).not.to.include(active._id)
      })

      it('adds the character to the checked list regardless', async () => {
        const { page, other } = await createTestDocs(model, '||::Wombat:: [Intelligence DC 10] This is a secret.||')
        const charPage = await Page.create({ title: 'New Character', body: 'This is about New Character.' }, other)
        await other.claim(charPage)
        const { active } = other.characters
        await page.checkSecrets(active)
        expect(page.secrets.list[0].checked).to.include(active._id)
      })
    })

    describe('reveal', () => {
      it('reveals a secret to a character', async () => {
        const { page, user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        await page.reveal(user.characters.active, 'Wombat')
        expect(page.secrets.list[0].knowers).to.include(user.characters.active._id)
      })

      it('returns true when the secret is revealed', async () => {
        const { page, user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const res = await page.reveal(user.characters.active, 'Wombat')
        expect(res).to.be.true
      })

      it('can reveal the page', async () => {
        const { page, user } = await createTestDocs(model)
        page.secrets.existence = true
        await page.reveal(user.characters.active)
        expect(page.secrets.knowers).to.include(user.characters.active._id)
      })

      it('returns false when there\'s no such secret to reveal', async () => {
        const { page, user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        const res = await page.reveal(user.characters.active, 'Aardvark')
        expect(res).to.be.false
      })
    })

    describe('knows', () => {
      it('returns true if the character knows the secret', async () => {
        const { page, user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        expect(page.knows(user.getPOV(), 'Wombat')).to.be.true
      })

      it('returns true if there is no such secret secret', async () => {
        const { page, user } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        expect(page.knows(user.getPOV(), 'Aardvark')).to.be.true
      })

      it('returns false if the character doesn\'t know the secret', async () => {
        const { page, other } = await createTestDocs(model, '||::Wombat:: This is a secret.||')
        expect(page.knows(other.getPOV(), 'Wombat')).to.be.false
      })

      it('returns true if the character knows about the page and the page is a secret', async () => {
        const { page, user } = await createTestDocs(model)
        page.secrets.existence = true
        page.secrets.knowers.addToSet(user.getPOV()._id)
        expect(page.knows(user.getPOV())).to.be.true
      })

      it('returns false if the character doesn\'t know about the page and the page is a secret', async () => {
        const { page, user } = await createTestDocs(model)
        page.secrets.existence = true
        expect(page.knows(user.getPOV())).to.be.false
      })

      it('returns true if the page isn\'t a secret', async () => {
        const { page, user } = await createTestDocs(model)
        expect(page.knows(user.getPOV())).to.be.true
      })
    })

    describe('write', () => {
      it('defaults to the most recent version', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is the updated text.' }, user)
        expect(page.write()).to.be.equal('This is the updated text.')
      })

      it('can use other versions', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is the updated text.' }, user)
        expect(page.write({ version: page.versions[0] })).to.be.equal('This is the original text.')
      })

      it('can work on an entirely new string', async () => {
        const { page } = await createTestDocs(model)
        const str = 'Now for something else entirely.'
        expect(page.write({ str })).to.be.equal(str)
      })

      it('hides all secrets from anonymous', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is the updated text. ||This is a secret.||' }, user)
        expect(page.write()).to.be.equal('This is the updated text.')
      })

      it('reveals all secrets to a loremaster', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is the updated text. ||This is a secret.||' }, user)
        expect(page.write({ pov: 'Loremaster' })).to.be.equal('This is the updated text. This is a secret.')
      })

      it('hides secrets from characters who don\'t know them', async () => {
        const { page, user, other } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is the updated text. ||This is a secret.||' }, user)
        expect(page.write({ pov: other.getPOV() })).to.be.equal('This is the updated text.')
      })

      it('reveals secrets to characters who know them', async () => {
        const { page, user } = await createTestDocs(model)
        const pov = user.getPOV()
        await page.update({ title: 'Test Page', body: 'This is the updated text. ||::Wombat:: This is a secret.||' }, user)
        await page.reveal(pov, 'Wombat')
        expect(page.write({ pov: user.getPOV() })).to.be.equal('This is the updated text. This is a secret.')
      })

      it('leaves a placeholder for secrets hidden from characters who don\'t know them in editing mode', async () => {
        const { page, user, other } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is the updated text. ||::Wombat:: This is a secret.||' }, user)
        expect(page.write({ pov: other.getPOV(), mode: 'editing' })).to.be.equal('This is the updated text. ||::Wombat::||')
      })

      it('reveals secrets to characters who know them in editing mode', async () => {
        const { page, user } = await createTestDocs(model)
        const pov = user.getPOV()
        await page.update({ title: 'Test Page', body: 'This is the updated text. ||::Wombat:: This is a secret.||' }, user)
        await page.reveal(pov, 'Wombat')
        expect(page.write({ pov: user.getPOV(), mode: 'editing' })).to.be.equal('This is the updated text. ||::Wombat:: This is a secret.||')
      })

      it('reveals all secrets to loremasters in editing mode', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is the updated text. ||::Wombat:: This is a secret.||' }, user)
        expect(page.write({ pov: 'Loremaster', mode: 'editing' })).to.be.equal('This is the updated text. ||::Wombat:: This is a secret.||')
      })

      it('writes all secrets in full mode, regardless of POV', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is the updated text. ||::Wombat:: This is a secret.||' }, user)
        expect(page.write({ mode: 'full' })).to.be.equal('This is the updated text. ||::Wombat:: This is a secret.||')
      })

      it('adds back secrets you don\'t know to the end when editing', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is the updated text. ||::Wombat:: This is a secret.||' }, user)
        expect(page.write({ mode: 'editing', str: 'This is some new text.' })).to.be.equal('This is some new text.\n\n||::Wombat::||')
      })

      it('adds back full secrets you don\'t know to the end when getting full text', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: 'Test Page', body: 'This is the updated text. ||::Wombat:: This is a secret.||' }, user)
        expect(page.write({ mode: 'full', str: 'This is some new text.' })).to.be.equal('This is some new text.\n\n||::Wombat:: This is a secret.||')
      })
    })

    describe('update', () => {
      it('returns a page', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.constructor.modelName).to.be.equal('Page')
      })

      it('updates the title', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.title).to.be.equal('After')
      })

      it('adds a new version', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.versions).to.have.lengthOf(2)
      })

      it('saves the body of the new version', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.versions[1].body).to.be.equal('This is the updated text.')
      })

      it('saves a commit message', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.', msg: 'This is an update.' }, user)
        expect(actual.versions[1].msg).to.be.equal('This is an update.')
      })

      it('saves who made the change', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.versions[1].editor).to.be.equal(user._id)
      })

      it('saves when the change was made', async () => {
        const start = new Date()
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: 'After', body: 'This is the updated text.' }, user)
        expect(actual.versions[1].timestamp).to.be.least(start)
      })

      it('assigns codenames to secrets', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: page.title, body: '||This is a secret.||' }, user)
        expect(actual.versions[1].body.match(/||::.*?::|| This is a secret\.||/)).not.to.be.undefined
      })

      it('records secrets', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await page.update({ title: page.title, body: '||This is a secret.||' }, user)
        expect(actual.versions[1].body.match(/||::.*?::|| This is a secret\.||/)).not.to.be.undefined
      })

      it('lets you delete secrets if you know them', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: page.title, body: '||This is a secret.||' }, user)
        await page.update({ title: page.title, body: 'This is some updated text.' }, user)
        expect(page.secrets.list).to.be.empty
      })

      it('lets you delete secrets from the text if you know them', async () => {
        const { page, user } = await createTestDocs(model)
        await page.update({ title: page.title, body: '||This is a secret.||' }, user)
        await page.update({ title: page.title, body: 'This is some updated text.' }, user)
        expect(page.getCurr().body).to.be.equal('This is some updated text.')
      })

      it('won\'t let you delete secrets that you don\'t know', async () => {
        const { page, user, other } = await createTestDocs(model)
        await page.update({ title: page.title, body: '||This is a secret.||' }, user)
        await page.update({ title: page.title, body: 'This is some updated text.' }, other)
        expect(page.secrets.list).to.have.lengthOf(1)
      })

      it('won\'t let you delete secrets that you don\'t know from the text', async () => {
        const { page, user, other } = await createTestDocs(model)
        await page.update({ title: page.title, body: '||::Wombat:: This is a secret.||' }, user)
        await page.update({ title: page.title, body: 'This is some updated text.' }, other)
        expect(page.getCurr().body).to.be.equal('This is some updated text.\n\n||::Wombat:: This is a secret.||')
      })
    })
  })

  describe('statics', () => {
    describe('findByPath', () => {
      it('returns the page with that path', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await Page.findByPath('test-page', user)
        expect(page._id.toString()).to.be.equal(actual._id.toString())
      })

      it('handles the initial slash', async () => {
        const { page, user } = await createTestDocs(model)
        const actual = await Page.findByPath('/test-page', user)
        expect(page._id.toString()).to.be.equal(actual._id.toString())
      })

      it('returns null if the page doesn\'t exist', async () => {
        const { user } = await createTestDocs(model)
        const actual = await Page.findByPath('lol-nope', user)
        expect(actual).to.be.null
      })

      it('returns null if the page is a secret that you don\'t know', async () => {
        const { page, user } = await createTestDocs(model)
        page.secrets.existence = true
        await page.save()
        const actual = await Page.findByPath('lol-nope', user)
        expect(actual).to.be.null
      })
    })

    describe('findMembers', () => {
      it('returns the pages that belong to a category', async () => {
        const { page, user } = await createTestDocs(model, '[[Category:Tests]]')
        const actual = await Page.findMembers('Tests', user)
        expect(actual.pages[0].page._id).to.be.eql(page._id)
      })

      it('returns the subcategories', async () => {
        const { user } = await createTestDocs(model, '[[Category:Tests]]')
        const page = await Page.create({ title: 'Category:Unit Tests', body: '[[Category:Tests]]' }, user)
        const actual = await Page.findMembers('Tests', user)
        expect(actual.subcategories[0].page._id).to.be.eql(page._id)
      })

      it('won\'t return pages that are secrets that you don\'t know', async () => {
        const { page, other } = await createTestDocs(model, '[[Category:Tests]]')
        page.secrets.existence = true
        await page.save()
        const actual = await Page.findMembers('Tests', other)
        expect(actual.pages).to.be.empty
      })

      it('won\'t return pages whose membership is a secret that you don\'t know', async () => {
        const { other } = await createTestDocs(model, '||[[Category:Tests]]||')
        const actual = await Page.findMembers('Tests', other)
        expect(actual.pages).to.be.empty
      })

      it('sorts pages by their sort strings', async () => {
        const { user } = await createTestDocs(model)
        await Page.create({ title: 'Test 1', body: '[[Category:Tests|Badger]]' }, user)
        await Page.create({ title: 'Test 2', body: '[[Category:Tests|Coelacanth]]' }, user)
        await Page.create({ title: 'Test 3', body: '[[Category:Tests|Aardvark]]' }, user)
        const actual = await Page.findMembers('Tests', user)
        expect(actual.pages.map(m => m.page.title)).to.be.eql(['Test 3', 'Test 1', 'Test 2'])
      })

      it('sorts subcategories by their sort strings', async () => {
        const { user } = await createTestDocs(model)
        await Page.create({ title: 'Category:Type 1 Tests', body: '[[Category:Tests|Badger]]' }, user)
        await Page.create({ title: 'Category:Type 2 Tests', body: '[[Category:Tests|Coelacanth]]' }, user)
        await Page.create({ title: 'Category:Type 3 Tests', body: '[[Category:Tests|Aardvark]]' }, user)
        const actual = await Page.findMembers('Tests', user)
        expect(actual.subcategories.map(m => m.page.title.substr(14, 1))).to.be.eql(['3', '1', '2'])
      })
    })

    describe('create', () => {
      it('creates a new page', async () => {
        const { page } = await createTestDocs(model)
        expect(page.constructor.modelName).to.be.equal('Page')
      })

      it('sets the page\'s title', async () => {
        const { page } = await createTestDocs(model)
        expect(page.title).to.be.equal('Test Page')
      })

      it('creates an initial version', async () => {
        const { page } = await createTestDocs(model)
        expect(page.versions).to.have.lengthOf(1)
      })

      it('sets a default msg for the initial version', async () => {
        const { page } = await createTestDocs(model)
        expect(page.versions[0].msg).to.be.equal('Initial text')
      })

      it('allows a different msg if you provide one', async () => {
        const user = await User.create({ name: 'Editor' })
        const page = await Page.create({ title: 'Test Page', body: 'This is the original text.', msg: 'First!' }, user)
        expect(page.versions[0].msg).to.be.equal('First!')
      })
    })
  })
})