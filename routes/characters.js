const { Router } = require('express')
const router = Router()

// GET /
router.get('/', (req, res, next) => {
  res.render('characters/index', req.viewOpts)
})

module.exports = router
