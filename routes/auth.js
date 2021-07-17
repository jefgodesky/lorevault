const { Router } = require('express')
const passport = require('passport')
const { rules } = require('../config')
const router = Router()

// GET /login/google
router.get('/login/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

// GET /login/discord
router.get('/login/discord', passport.authenticate('discord', { scope: ['identify'] }))

// GET /login/google/callback
router.get('/login/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/')
})

// GET /login/discord/callback
router.get('/login/discord/callback', passport.authenticate('discord', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/')
})

// GET /disconnect/:service
router.get('/disconnect/:service', async (req, res, next) => {
  await req.user.disconnect(req.params.service)
  res.redirect('/profile')
})

// GET /profile
router.get('/profile', async (req, res, next) => {
  req.viewOpts.title = 'Your Profile'

  req.viewOpts.connectedGoogle = Boolean(req.user.googleID)
  req.viewOpts.connectedDiscord = Boolean(req.user.discordID)

  req.viewOpts.chars = req.user.characters
  req.viewOpts.systems = []
  for (const system of rules) {
    const meta = require(`../rules/${system}/meta.json`)
    const sheet = require(`../rules/${system}/sheet`)
    const stats = Object.keys(sheet).map(key => ({
      id: `${system}-${key}`,
      label: sheet[key].label,
      type: sheet[key].type === Number ? 'number' : 'text'
    }))
    req.viewOpts.systems.push(Object.assign({}, meta, { stats }))
  }

  res.render('profile', req.viewOpts)
})

// GET /logout
router.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})

module.exports = router
