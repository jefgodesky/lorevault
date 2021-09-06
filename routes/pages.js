import { Router } from 'express'
import Page from '../models/page.js'
const router = Router()

// GET /
router.get('/', async (req, res, next) => {
  res.render('index', req.viewOpts)
})

export default router
