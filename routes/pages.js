import { Router } from 'express'
import { diffWords } from 'diff'
import Page from '../models/page.js'
import getPage from '../middleware/getPage.js'
import getMembers from '../middleware/getMembers.js'
import { makeDiscreetQuery } from '../utils.js'
import config from '../config/index.js'
const router = Router()

// GET /
router.get('/', async (req, res, next) => {
  const homepage = await Page.findOneByTitle(config.home, req.user)
  if (homepage) return res.redirect(`/${homepage.path}`)
  return res.redirect(`/create?title=${encodeURIComponent(config.home)}`)
})

// GET /create
router.get('/create', getMembers, async (req, res, next) => {
  res.render('page-create', req.viewOpts)
})

// POST /create
router.post('/create', async (req, res) => {
  const { title, body, msg } = req.body
  const page = await Page.create({ title, body, msg }, req.user)
  res.redirect(`/${page.path}`)
})

// GET /search
router.get('/search', async (req, res, next) => {
  const query = req.query.q
  req.viewOpts.query = query
  req.viewOpts.title = `Results for &ldquo;${query}&rdquo;`
  req.viewOpts.searchResults = await Page
    .find(makeDiscreetQuery({ $text: { $search: query } }, req.user?.getPOV() || req.user), { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
  res.render('search', req.viewOpts)
})

// GET /*/history
router.get('/*/history', getPage, async (req, res, next) => {
  if (!req.viewOpts.page) return next()
  req.viewOpts.versions = req.viewOpts.page.versions.slice(0).reverse()
  res.render('page-history', req.viewOpts)
})

// GET /*/compare
router.get('/*/compare', getPage, async (req, res, next) => {
  if (!req.viewOpts.page) return next()
  const { page } = req.viewOpts
  const { a, b } = req.query
  const versions = page.getVersions([a, b])
  if (versions.length < 2) return res.redirect(`/${page.path}/history`)
  const d = diffWords(versions[0].body, versions[1].body)
  req.viewOpts.versions = versions
  req.viewOpts.diff = d.map(part => part.added ? `<ins>${part.value}</ins>` : part.removed ? `<del>${part.value}</del>` : part.value).join('')
  res.render('page-compare', req.viewOpts)
})

// GET /*/reveal/:codename
router.get('/*/reveal/:codename', getPage, async (req, res, next) => {
  const { codename } = req.params
  if (!req.viewOpts.page || !req.user) return next()
  const { page } = req.viewOpts
  if (!page.knows(req.user.getPOV(), codename)) return res.redirect(`/${page.path}`)
  const secret = page.findSecret(codename)
  req.viewOpts.secret = await page.render(req.user, null, secret.content)
  req.viewOpts.action = `/${page.path}/reveal/${codename}`
  res.render('page-reveal', req.viewOpts)
})

// POST /*/reveal/:codename
router.post('/*/reveal/:codename', getPage, async (req, res, next) => {
  const { codename } = req.params
  if (!req.viewOpts.page || !req.user) return next()
  const { page } = req.viewOpts
  if (!page.knows(req.user.getPOV(), codename)) return res.redirect(`/${page.path}`)
  await page.revealToName(req.body.revealto, codename)
  res.redirect(`/${page.path}`)
})

// GET /*/v/:version
router.get('/*/v/:version', getPage, async (req, res, next) => {
  if (!req.viewOpts.page) return next()
  const curr = req.viewOpts.page.getCurr()
  const version = req.viewOpts.page.getVersion(req.params.version)
  req.viewOpts.version = version
  req.viewOpts.version.isOld = version._id !== curr._id
  res.render('page-read', req.viewOpts)
})

// GET /*/v/:version/rollback
router.get('/*/v/:version/rollback', getPage, async (req, res, next) => {
  if (!req.viewOpts.page) return next()
  const { user, viewOpts } = req
  const { page } = viewOpts
  const version = page.getVersion(req.params.version)
  if (version) await page.rollback(version, user)
  res.redirect(`/${page.path}`)
})

// GET /*/edit
router.get('/*/edit', getPage, async (req, res, next) => {
  if (!req.viewOpts.page) return next()
  const curr = req.viewOpts.page.getCurr()
  req.viewOpts.body = curr.body
  res.render('page-edit', req.viewOpts)
})

// POST /*/edit
router.post('/*/edit', getPage, async (req, res, next) => {
  if (!req.viewOpts.page) return next()
  await req.viewOpts.page.update(req.body, req.user)
  res.redirect(`/${req.viewOpts.page.path}`)
})

// GET /*
router.get('/*', getPage, getMembers, async (req, res, next) => {
  if (!req.viewOpts.page) return next()
  res.render('page-read', req.viewOpts)
})

export default router
