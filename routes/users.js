const { Router } = require('express')
const router = Router()

// GET /toggle-char-claim-mode
router.get('/toggle-char-claim-mode', async (req, res, next) => {
  if (req.user) await req.user.toggleCharClaimMode()
  res.redirect('/profile')
})

module.exports = router
