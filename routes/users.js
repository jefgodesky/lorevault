import { Router } from 'express'
import populateCharacterForm from '../middleware/populateCharacterForm.js'
import processCharacterForm from '../middleware/processCharacterForm.js'
import config from '../config/index.js'
import { findOne } from '../utils.js'
const { loremasters } = config
const router = Router()

// GET /profile
router.get('/profile', async (req, res, next) => {
  const { user } = req
  if (!user) return res.redirect('/')

  const { google, discord } = user.login
  req.viewOpts.connections = {
    google: {
      status: google ? 'Connected' : 'Not connected',
      link: google ? '/disconnect/google' : '/login/google',
      label: google ? 'Disconnect' : 'Connect'
    },
    discord: {
      status: discord ? 'Connected' : 'Not connected',
      link: discord ? '/disconnect/discord' : '/login/discord',
      label: discord ? 'Disconnect' : 'Connect'
    }
  }

  const { characters } = user
  req.viewOpts.characters = characters.list.map(char => ({
    id: char._id,
    isActive: char._id.toString() === characters.active._id.toString(),
    path: char.page.path,
    name: char.page.title
  }))
  if (characters.list.length < 1) req.viewOpts.characters = false

  const { pov } = req.viewOpts
  req.viewOpts.isPotentialLoremaster = loremasters.includes(user._id.toString())
  req.viewOpts.isLoremaster = pov === 'Loremaster'
  req.viewOpts.isAnonymous = pov === 'Anonymous'
  req.viewOpts.isCharacter = !req.viewOpts.isLoremaster && !req.viewOpts.isAnonymous

  res.render('profile', req.viewOpts)
})

// GET /profile/character
router.get('/profile/character', populateCharacterForm, (req, res, next) => {
  req.viewOpts.get = req.query
  res.render('character-create', req.viewOpts)
})

// POST /profile/character
router.post('/profile/character', processCharacterForm, populateCharacterForm, (req, res, next) => {
  req.viewOpts.get = req.body
  res.render('character-create', req.viewOpts)
})

// GET /profile/character/:id
router.get('/profile/character/:id', populateCharacterForm, async (req, res, next) => {
  req.viewOpts.get = req.query
  res.render('character-create', req.viewOpts)
})

// POST /profile/character/:id
router.post('/profile/character/:id', processCharacterForm, populateCharacterForm, (req, res, next) => {
  req.viewOpts.get = req.body
  res.render('character-create', req.viewOpts)
})

// GET /profile/character/:id/activate
router.get('/profile/character/:id/activate', async (req, res, next) => {
  const { user } = req
  if (!user) return res.redirect('/')
  const char = findOne(user.characters.list, c => c._id.toString() === req.params.id)
  if (!char) return res.redirect('/profile')
  user.characters.active = char._id
  await user.save()
  res.redirect('/profile')
})

// GET /profile/character/:id/release
router.get('/profile/character/:id/release', async (req, res, next) => {
  const { user } = req
  await user.release(req.params.id)
  res.redirect('/profile')
})

// GET /profile/loremaster
router.get('/profile/loremaster', async (req, res, next) => {
  const { user } = req
  if (!user) res.redirect('/')
  if (loremasters.includes(user._id.toString())) {
    if (user.pov === 'Loremaster' && user.characters.list.length > 0) {
      user.pov = 'Character'
    } else if (user.pov === 'Loremaster') {
      user.pov = 'Anonymous'
    } else {
      user.pov = 'Loremaster'
    }
    await user.save()
  }
  res.redirect('/profile')
})

export default router
