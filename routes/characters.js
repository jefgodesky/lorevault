const { Router } = require('express')
const { rules } = require('../config')
const router = Router()

// GET /
router.get('/', (req, res, next) => {
  req.viewOpts.chars = req.user.characters
  req.viewOpts.charSheet = []
  for (const system of rules) {
    const sheet = require(`../rules/${system}/sheet`)
    for (const field of Object.keys(sheet)) {
      req.viewOpts.charSheet.push({ system, field, label: sheet[field].label })
    }
  }
  res.render('characters/index', req.viewOpts)
})

// POST /
router.post('/', async (req, res, next) => {
  req.user.characters.push({ name: req.body['new-char-name'] })
  await req.user.save()
  res.redirect('/characters')
})

// GET /delete/:id
router.get('/delete/:id', async (req, res, next) => {
  req.user.characters = req.user.characters.filter(char => char._id.toString() !== req.params.id)
  await req.user.save()
  res.redirect('/characters')
})

module.exports = router
