const { Router } = require('express')
const diff = require('diff')
const config = require('../config')
const Page = require('../models/page')
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

// GET /create
router.get('/create', async (req, res, next) => {
  req.viewOpts.title = 'Create a New Page'
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
  const page = await Page.create(data)
  res.redirect(`/${page.path}`)
})

// GET /upload
router.get('/upload', async (req, res, next) => {
  req.viewOpts.title = 'Upload a File'
  req.viewOpts.upload = true
  res.render('create', req.viewOpts)
})

// GET /*/edit
router.get('/*/edit', async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  req.viewOpts.title = `Editing ${req.viewOpts.page.title}`
  req.viewOpts.upload = Boolean(req.viewOpts.page.file.url)
  res.render('edit', req.viewOpts)
})

// POST /*/edit
router.post('/*/edit', async (req, res, next) => {
  const update = Object.assign({}, req.body, { editor: req.user?._id })
  const page = await Page.makeUpdate(req.originalUrl, update)
  res.redirect(`/${page.path}`)
})

// GET /*/history
router.get('/*/history', async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  req.viewOpts.versions = [...req.viewOpts.page.versions].reverse()
  res.render('history', req.viewOpts)
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
router.get('/*', async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  req.viewOpts.markup = await parse(req.viewOpts.page.body)

  // Populate categories
  req.viewOpts.categories = []
  for (const id of req.viewOpts.page.categories) {
    const category = await Page.findById(id)
    req.viewOpts.categories.push({
      title: category.title,
      path: category.path
    })
  }

  // Add special category data
  if (req.viewOpts.page.types.includes('Category')) {
    const { subcategories, pages } = await Page.findCategoryMembers(req.viewOpts.page.title)
    req.viewOpts.subcategories = subcategories
    req.viewOpts.pages = pages
  }

  // Render the page
  res.render('page', req.viewOpts)
})

module.exports = router
