import { expect } from 'chai'
import getFileData from './getFileData.js'

describe('getFileData', () => {
  it('does nothing if there is no file', () => {
    const req = {}
    getFileData(req, {}, () => {})
    expect(req).to.be.eql({})
  })

  it('gets the file\'s URL', () => {
    const req = { file: { key: 'test' } }
    getFileData(req, {}, () => {})
    expect(req.fileData.url).to.be.equal('https://lorevault.s3.us-east-2.wasabisys.com/test')
  })

  it('gets the file\'s MIME type', () => {
    const req = { file: { contentType: 'text/plain' } }
    getFileData(req, {}, () => {})
    expect(req.fileData.mimetype).to.be.equal('text/plain')
  })

  it('gets the file\'s size', () => {
    const req = { file: { size: 1234567890 } }
    getFileData(req, {}, () => {})
    expect(req.fileData.size).to.be.equal(1234567890)
  })
})