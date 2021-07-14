const { Router } = require('express')
const router = Router()

// GET /create
router.get('/create', (req, res, next) => {
  res.render('create', req.viewOpts)
})

module.exports = router
