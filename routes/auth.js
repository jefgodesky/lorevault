const { Router } = require('express')
const passport = require('passport')
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

// GET /logout
router.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/')
})

module.exports = router
