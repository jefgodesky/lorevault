const { Router } = require('express')
const diff = require('diff')
const config = require('../config')
const Page = require('../models/page')
const Character = require('../models/character')
const { getSystemsDisplay } = require('../utils')
const renderPage = require('../middleware/renderPage')
const addKnownSecrets = require('../middleware/addKnownSecrets')
const upload = require('../middleware/upload')
const parse = require('../parser')
const router = Router()

/**
 * Get file data from file.
 * @param {{ key: string, contentType: string, size: number}} file - An object
 *   containing information about a file, including its S3 key (`key`), its
 *   MIME type (`contentType`) and its size in bytes (`size`).
 * @returns {object} - An object that can represent the file as part
 *   of the Page schema.
 */

const getFileData = file => {
  const data = {}
  if (file.key) data.url = `${config.aws.domain}/${file.key}`
  if (file.contentType) data.mimetype = file.contentType
  if (file.size) data.size = file.size
  return data
}

// GET /
router.get('/', async (req, res, next) => {
  const home = await Page.findByTitle(config.home)
  res.redirect(home.path)
})

// GET /create
router.get('/create', async (req, res, next) => {
  req.viewOpts.title = 'Create a New Page'
  req.viewOpts.get = req.query
  req.viewOpts.numSecrets = req.query.numsecrets || 1
  res.render('create', req.viewOpts)
})

// POST /create
router.post('/create', upload.single('file'), async (req, res, next) => {
  const data = {
    title: req.body.title,
    body: req.body.body
  }
  if (req.file) data.file = getFileData(req.file)
  data.versions = [
    Object.assign({}, data, {
      msg: req.body.msg,
      editor: req.user?._id
    })
  ]
  const secrets = req.body.secret.filter(s => s !== '')
  if (secrets && secrets.length > 0) data.secrets = secrets.map(text => ({ text }))
  const page = await Page.create(data)
  res.redirect(`/${page.path}`)
})

// GET /upload
router.get('/upload', async (req, res, next) => {
  req.viewOpts.title = 'Upload a File'
  req.viewOpts.upload = true
  res.render('create', req.viewOpts)
})

// GET /search
router.get('/search', async (req, res, next) => {
  const query = req.query.q
  req.viewOpts.query = query
  req.viewOpts.title = `Results for &ldquo;${query}&rdquo;`
  req.viewOpts.searchResults = await Page
    .find({ $text: { $search: query } }, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
  res.render('search', req.viewOpts)
})

// GET /*/edit
router.get('/*/edit', addKnownSecrets, async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  req.viewOpts.title = `Editing ${req.viewOpts.page.title}`
  req.viewOpts.upload = Boolean(req.viewOpts.page.file.url)
  req.viewOpts.get = req.query
  req.viewOpts.numSecrets = req.viewOpts.secrets.length + 1
  res.render('edit', req.viewOpts)
})

// POST /*/edit
router.post('/*/edit', upload.single('file'), async (req, res, next) => {
  const page = await Page.findByPath(req.originalUrl)
  if (!page) res.redirect('/')
  const update = req.file
    ? Object.assign({}, req.body, { file: getFileData(req.file) }, { editor: req.user?._id })
    : Object.assign({}, req.body, { editor: req.user?._id })
  if (page.file?.url && update.file?.url && page.file.url !== update.file.url) await page.deleteFile()
  await page.makeUpdate(update)

  // Update secrets
  const secrets = Array.isArray(req.body.secret) ? req.body.secret : [req.body.secret]
  const secretIDs = Array.isArray(req.body['secret-id']) ? req.body['secret-id'] : [req.body['secret-id']]
  const secretOrder = Array.isArray(req.body['secret-order']) ? req.body['secret-order'].map(o => parseInt(o)) : [parseInt(req.body['secret-order'])]
  await page.updateSecrets(secrets, secretIDs, secretOrder)

  res.redirect(`/${page.path}`)
})

// GET /*/history
router.get('/*/history', async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  req.viewOpts.versions = [...req.viewOpts.page.versions].reverse()
  res.render('history', req.viewOpts)
})

// GET /*/claim
router.get('/*/claim', async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  req.viewOpts.title = `Claiming ${req.viewOpts.page.title}`
  req.viewOpts.systems = getSystemsDisplay(config.rules)
  res.render('char-claim', req.viewOpts)
})

// GET /*/reveal/:id
router.get('/*/reveal/:id', async (req, res, next) => {
  const page = await Page.findByPath(req.originalUrl)
  if (!page) return res.redirect('/')
  const secret = page.findSecretByID(req.params.id)
  const userPOV = req.user?.perspective === 'character' ? req.user?.activeChar : req.user?.perspective
  const userKnows = userPOV ? page.getKnownSecrets(userPOV) : []
  const userKnowsIDs = userKnows.map(s => s._id.toString())
  if (secret && userKnowsIDs.includes(req.params.id)) {
    const names = req.query.to.split(/[,;]+/).map(name => name.trim())
    for (const title of names) {
      const character = await Page.findOne({ title })
      if (character) await page.revealSecret(secret, character)
    }
  }
  res.redirect(`/${page.path}`)
})

// POST /*/claim
router.post('/*/claim', async (req, res, next) => {
  if (!req.user) return res.redirect('/')
  const page = await Page.findByPath(req.originalUrl)
  if (!page) return res.redirect('/profile')
  const char = Object.assign(Character.readForm(req.body), { page: page._id, player: req.user._id })
  await Character.create(char)
  res.redirect('/profile')
})

// POST /*/compare
router.post('/*/compare', async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  if (req.body.a === req.body.b) {
    res.redirect(`/${req.viewOpts.page.path}/history`)
  } else {
    req.viewOpts.versions = req.viewOpts.page.orderVersions([req.body.a, req.body.b])
    const d = diff.diffWords(req.viewOpts.versions[0].body, req.viewOpts.versions[1].body)
    req.viewOpts.diff = d.map(part => part.added ? `<ins>${part.value}</ins>` : part.removed ? `<del>${part.value}</del>` : part.value).join('')
    res.render('compare', req.viewOpts)
  }
})

// POST /*/*/rollback
router.post('/*/*/rollback', async (req, res, next) => {
  const parts = req.originalUrl.split('/')
  const page = await Page.findByPath(req.originalUrl)
  if (parts.length >= 2) await page.rollback(parts[2], req.user._id)
  res.redirect(`/${page.path}`)
})

// GET /*/delete
router.get('/*/delete', renderPage, async (req, res, next) => {
  if (!req.viewOpts.page) return next()
  req.viewOpts.promptDelete = true
  res.render('page', req.viewOpts)
})

// POST /*/delete
router.post('/*/delete', async (req, res, next) => {
  const page = await Page.findByPath(req.originalUrl)
  if (page) await page.delete()
  res.redirect('/')
})

// GET /*/*
router.get('/*/*', async (req, res, next) => {
  const parts = req.originalUrl.split('/')
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  if (!req.viewOpts.page) return res.redirect('/')
  if (parts.length <= 2) return res.redirect(`/${req.viewOpts.page.path}`)
  req.viewOpts.version = req.viewOpts.page.findVersion(parts[2])
  req.viewOpts.markup = await parse(req.viewOpts.version.body)
  res.render('version', req.viewOpts)
})

// GET /*
router.get('/*', renderPage, addKnownSecrets, async (req, res, next) => {
  if (!req.viewOpts.page) return next()
  res.render('page', req.viewOpts)
})

module.exports = router
