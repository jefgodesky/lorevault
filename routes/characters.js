const { Router } = require('express')
const Character = require('../models/character')
const router = Router()

// GET /:id/update
router.get('/:id/update', async (req, res, next) => {
  const char = await Character.findById(req.params.id)
  if (!char) return res.redirect('/profile')
  req.viewOpts.char = char
  req.viewOpts.title = `Updating ${char.page.title}`
  res.render('char-update', req.viewOpts)
})

module.exports = router
