const { Router } = require('express')
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

// GET */edit
router.get('*/edit', async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  req.viewOpts.title = `Editing ${req.viewOpts.page.title}`
  res.render('edit', req.viewOpts)
})

// POST */edit
router.post('*/edit', async (req, res, next) => {
  const update = Object.assign({}, req.body, { editor: req.user?._id })
  const page = await Page.makeUpdate(req.originalUrl, update)
  res.redirect(`/${page.path}`)
})

// GET */history
router.get('*/history', async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  req.viewOpts.versions = JSON.parse(JSON.stringify(req.viewOpts.page.versions)).reverse()
  res.render('history', req.viewOpts)
})

// GET *
router.get('*', async (req, res, next) => {
  req.viewOpts.page = await Page.findByPath(req.originalUrl)
  res.render('page', req.viewOpts)
})

module.exports = router
