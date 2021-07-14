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
      req.viewOpts.charSheet.push({
        id: `${system}-${field}`,
        label: sheet[field].label,
        type: sheet[field].type === Number ? 'number' : 'text'
      })
    }
  }
  res.render('characters/index', req.viewOpts)
})

// POST /
router.post('/', async (req, res, next) => {
  const char = { name: req.body['new-char-name'] }
  for (const system of rules) {
    const sheet = require(`../rules/${system}/sheet`)
    char[system] = {}
    for (const field of Object.keys(sheet)) {
      char[system][field] = parseInt(req.body[`${system}-${field}`])
    }
  }
  req.user.characters.push(char)
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
