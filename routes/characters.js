const { Router } = require('express')
const Character = require('../models/character')
const { getSystemsDisplay } = require('../utils')
const { rules } = require('../config')
const router = Router()

// GET /:id/update
router.get('/:id/update', async (req, res, next) => {
  const char = await Character.findById(req.params.id).populate('page')
  if (!char) return res.redirect('/profile')
  req.viewOpts.char = char
  req.viewOpts.title = `Updating ${char.page.title}`
  req.viewOpts.systems = getSystemsDisplay(rules, char)
  res.render('char-update', req.viewOpts)
})

// POST /:id/update
router.post('/:id/update', async (req, res, next) => {
  let char = await Character.findById(req.params.id)
  char = Object.assign(char, Character.readForm(req.body))
  await char.save()
  res.redirect('/profile')
})

// GET /:id/select
router.get('/:id/select', async (req, res, next) => {
  if (!req.user) return res.redirect('/')
  const char = await Character.findById(req.params.id)
  if (char && req.user._id.equals(char.player)) {
    req.user.activeChar = char._id
    await req.user.save()
  }
  res.redirect('/profile')
})

module.exports = router
