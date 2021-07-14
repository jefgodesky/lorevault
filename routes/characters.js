const { Router } = require('express')
const router = Router()

// GET /
router.get('/', (req, res, next) => {
  res.render('characters/index', req.viewOpts)
})

// POST /
router.post('/', async (req, res, next) => {
  req.user.characters.push({ name: req.body['new-char-name'] })
  await req.user.save()
  res.redirect('/characters')
})

module.exports = router
