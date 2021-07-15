const { Router } = require('express')
const Page = require('../models/page')
const router = Router()

// GET /create
router.get('/create', async (req, res, next) => {
  req.viewOpts.msg = 'Initial text'
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

module.exports = router
