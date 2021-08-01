const { Router } = require('express')
const Character = require('../models/character')
const router = Router()

// GET /profile
router.get('/profile', async (req, res, next) => {
  req.viewOpts.title = 'Your Profile'
  req.viewOpts.connectedGoogle = Boolean(req.user.googleID)
  req.viewOpts.connectedDiscord = Boolean(req.user.discordID)
  req.viewOpts.characters = await Character.getCharacters(req.user)
  res.render('profile', req.viewOpts)
})

// GET /toggle-char-claim-mode
router.get('/toggle-char-claim-mode', async (req, res, next) => {
  if (req.user) await req.user.toggleCharClaimMode()
  res.redirect('/profile')
})

module.exports = router
