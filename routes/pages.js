const { Router } = require('express')
const diff = require('diff')
const Page = require('../models/page')
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

// GET /*/*
router.get('/*/*', async (req, res, next) => {
  const parts = req.originalUrl.split('/')
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  if (parts.length <= 2) {
    res.redirect(`/${req.viewOpts.page.path}`)
  } else {
    req.viewOpts.version = req.viewOpts.page.findVersion(parts[2])
    res.render('version', req.viewOpts)
  }
})

// GET /*
router.get('/*', async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  res.render('page', req.viewOpts)
})

module.exports = router
