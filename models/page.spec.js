import { expect } from 'chai'
import Page from './page.js'

describe('Page', () => {
  describe('Presave', () => {
    describe('Created', () => {
      it('sets the created timestamp to the time when it is created', async () => {
        const start = new Date()
        const page = await Page.create({ title: 'Test' })
        await page.save()
        expect(page.created).to.be.least(start)
      })
    })

    describe('Modified', () => {
      it('sets the modified timestamp to the time when it is modified', async () => {
        const start = new Date()
        const page = await Page.create({ title: 'Test' })
        await page.save()
        expect(page.modified).to.be.least(start)
      })
    })
  })
})