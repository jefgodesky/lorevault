const { Router } = require('express')
const diff = require('diff')
const Page = require('../models/page')
const parse = require('../parser')
const router = Router()

// GET /create
router.get('/create', async (req, res, next) => {
  req.viewOpts.title = 'Create a New Page'
  res.render('create', req.viewOpts)
})

// POST /create
router.post('/create', async (req, res, next) => {
  const data = {
    title: req.body.title,
    body: req.body.body
  }
  data.versions = [
    Object.assign({}, data, {
      msg: req.body.msg,
      editor: req.user?._id
    })
  ]
  const page = await Page.create(data)
  res.redirect(`/${page.path}`)
})

// GET /*/edit
router.get('/*/edit', async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  req.viewOpts.title = `Editing ${req.viewOpts.page.title}`
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
