const { Router } = require('express')
const router = Router()

// GET /create
router.get('/create', async (req, res, next) => {
  req.viewOpts.msg = 'Initial text'
  res.render('create', req.viewOpts)
})

module.exports = router
