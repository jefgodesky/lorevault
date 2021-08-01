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
  console.log(char)
  req.viewOpts.title = `Updating ${char.page.title}`
  req.viewOpts.systems = getSystemsDisplay(rules, char)
  res.render('char-update', req.viewOpts)
})

module.exports = router
